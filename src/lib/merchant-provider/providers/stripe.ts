import "server-only";
import Stripe from "stripe";
import type {
	IMerchantProvider,
	CheckoutOptions,
	CheckoutResult,
	WebhookEvent,
	WebhookResult,
	ProductCreateOptions,
	ProductCreateResult,
	RefundOptions,
	RefundResult,
	PaymentDetails,
	OrderItemCustomizations,
} from "../types";
import { getDB } from "@/db";
import {
	orderTable,
	orderItemTable,
	productTable,
	merchantFeeTable,
	ORDER_STATUS,
	PAYMENT_STATUS,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { calculateTax } from "@/utils/tax";
import { findOrCreateUser } from "@/utils/auth";
import type { SizeVariantsConfig } from "@/types/customizations";
import { calculateMerchantFee } from "../fee-calculator";

export class StripeProvider implements IMerchantProvider {
	readonly name = "stripe" as const;
	private client: Stripe | null = null;

	async initialize(): Promise<void> {
		if (this.client) return;

		const apiKey = process.env.STRIPE_SECRET_KEY;
		if (!apiKey) throw new Error("STRIPE_SECRET_KEY not configured");

		this.client = new Stripe(apiKey, {
			apiVersion: "2025-02-24.acacia",
			typescript: true,
			httpClient: Stripe.createFetchHttpClient(),
		});
	}

	private getClient(): Stripe {
		if (!this.client) throw new Error("Stripe not initialized");
		return this.client;
	}

	async createCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
		const stripe = this.getClient();
		const db = getDB();

		// Fetch products to get Stripe IDs
		const productIds = options.lineItems.map((item) => item.productId);
		const products = await db
			.select()
			.from(productTable)
			.where(
				sql`${productTable.id} IN (${sql.join(productIds.map((id) => sql`${id}`), sql`, `)})`
			);

		// Build line items
		const lineItems = options.lineItems.map((item) => {
			const product = products.find((p) => p.id === item.productId);
			if (!product) {
				throw new Error(`Product ${item.productId} not found`);
			}

			// Parse product customizations
			const productCustomizations = product.customizations
				? JSON.parse(product.customizations)
				: null;

			// Determine which Stripe price ID to use
			let stripePriceId: string | null = null;

			if (
				productCustomizations?.type === "size_variants" &&
				item.customizations?.selectedVariant
			) {
				// Find the selected variant's Stripe price ID
				const sizeConfig = productCustomizations as SizeVariantsConfig;
				const variantId = item.customizations.selectedVariant.id;
				const variant = sizeConfig.variants.find((v) => v.id === variantId);
				stripePriceId = variant?.stripePriceId || product.stripePriceId;
			} else {
				// Use product's default Stripe price ID
				stripePriceId = product.stripePriceId;
			}

			// If we have a Stripe price ID, use it; otherwise create price_data
			if (stripePriceId) {
				return {
					price: stripePriceId,
					quantity: item.quantity,
				};
			} else {
				return {
					price_data: {
						currency: "usd",
						product_data: {
							name: item.name,
							description: item.description,
							images: item.imageUrl ? [item.imageUrl] : undefined,
							metadata: {
								productId: item.productId,
								...(item.customizations?.selectedVariant && {
									variantId: item.customizations.selectedVariant.id,
								}),
							},
						},
						unit_amount: item.price,
					},
					quantity: item.quantity,
				};
			}
		});

		// Calculate subtotal and tax
		const subtotal = options.lineItems.reduce(
			(sum, item) => sum + item.price * item.quantity,
			0
		);
		const tax = calculateTax(subtotal);

		// Add tax as a separate line item
		lineItems.push({
			price_data: {
				currency: "usd",
				product_data: {
					name: "Idaho Sales Tax (6%)",
					description: "State sales tax for Boise/Caldwell area",
					metadata: {
						productId: "tax",
					},
				},
				unit_amount: tax,
			},
			quantity: 1,
		});

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			line_items: lineItems,
			mode: "payment",
			success_url: options.successUrl,
			cancel_url: options.cancelUrl,
			customer_email: options.customerEmail,
			metadata: options.metadata,
		});

		if (!session.url) throw new Error("Failed to create checkout session");

		return {
			sessionId: session.id,
			url: session.url,
			expiresAt: session.expires_at
				? new Date(session.expires_at * 1000)
				: undefined,
		};
	}

	async verifyWebhook(body: string, signature: string): Promise<WebhookEvent> {
		const stripe = this.getClient();
		const secret = process.env.STRIPE_WEBHOOK_SECRET;
		if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");

		const event = await stripe.webhooks.constructEventAsync(
			body,
			signature,
			secret
		);

		return {
			id: event.id,
			type: event.type,
			createdAt: new Date(event.created * 1000),
			data: event.data.object,
		};
	}

	async handleWebhook(event: WebhookEvent): Promise<WebhookResult> {
		switch (event.type) {
			case "checkout.session.completed":
				return await this.handleCheckoutCompleted(
					event.data as Stripe.Checkout.Session
				);

			case "payment_intent.succeeded": {
				const paymentIntent = event.data as Stripe.PaymentIntent;
				if (paymentIntent.metadata?.orderId) {
					const db = getDB();
					await db
						.update(orderTable)
						.set({ paymentStatus: PAYMENT_STATUS.PAID })
						.where(eq(orderTable.id, paymentIntent.metadata.orderId));
				}
				return { processed: true, paymentStatus: "paid" };
			}

			case "payment_intent.payment_failed": {
				const paymentIntent = event.data as Stripe.PaymentIntent;
				if (paymentIntent.metadata?.orderId) {
					const db = getDB();
					await db
						.update(orderTable)
						.set({ paymentStatus: PAYMENT_STATUS.FAILED })
						.where(eq(orderTable.id, paymentIntent.metadata.orderId));
				}
				return { processed: true, paymentStatus: "failed" };
			}

			default:
				return { processed: false };
		}
	}

	private async handleCheckoutCompleted(
		session: Stripe.Checkout.Session
	): Promise<WebhookResult> {
		console.log(`[Stripe] Processing checkout session: ${session.id}`);

		const customerName = session.metadata?.customerName || "Guest";
		const customerEmail =
			session.customer_email || session.customer_details?.email || "";
		const customerPhone = session.metadata?.customerPhone || "";
		const joinLoyalty = session.metadata?.joinLoyalty === "true";
		const smsOptIn = session.metadata?.smsOptIn === "true";
		const existingUserId = session.metadata?.userId || "";

		// Retrieve line items from Stripe
		const stripe = this.getClient();
		const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
			expand: ["data.price.product"],
		});

		if (!lineItems.data.length) {
			console.error("[Stripe] No line items in checkout session");
			return { processed: false, error: "No line items found" };
		}

		// Reconstruct cart items
		const db = getDB();
		const items: Array<{
			productId: string;
			quantity: number;
			customizations?: OrderItemCustomizations;
			name: string;
			price: number;
		}> = [];

		// Build map of Stripe prices to products
		const allProducts = await db.select().from(productTable);
		const stripePriceMap = new Map<
			string,
			{ product: (typeof allProducts)[0]; variantId?: string }
		>();

		for (const product of allProducts) {
			if (product.stripePriceId) {
				stripePriceMap.set(product.stripePriceId, { product });
			}

			// Add variant prices
			if (product.customizations) {
				const customizations = JSON.parse(product.customizations);
				if (customizations?.type === "size_variants") {
					const sizeConfig = customizations as SizeVariantsConfig;
					for (const variant of sizeConfig.variants) {
						if (variant.stripePriceId) {
							stripePriceMap.set(variant.stripePriceId, {
								product,
								variantId: variant.id,
							});
						}
					}
				}
			}
		}

		// Process line items
		for (const lineItem of lineItems.data) {
			let productInfo = lineItem.price?.id
				? stripePriceMap.get(lineItem.price.id)
				: undefined;

			// If not found by price ID, check for product metadata (ad-hoc prices)
			if (!productInfo && lineItem.price?.product) {
				const stripeProduct = lineItem.price.product;
				if (
					typeof stripeProduct === "object" &&
					"metadata" in stripeProduct &&
					stripeProduct.metadata?.productId
				) {
					const productId = stripeProduct.metadata.productId;
					const product = allProducts.find((p) => p.id === productId);
					if (product) {
						productInfo = {
							product,
							variantId: stripeProduct.metadata.variantId,
						};
					}
				}
			}

			if (!productInfo) {
				// Skip tax or other non-product items
				continue;
			}

			const { product, variantId } = productInfo;
			let customizations: OrderItemCustomizations | undefined;
			let name = product.name;
			let price = product.price;

			// If this is a variant, reconstruct customizations
			if (variantId) {
				const productCustomizations = product.customizations
					? JSON.parse(product.customizations)
					: null;

				if (productCustomizations?.type === "size_variants") {
					const sizeConfig = productCustomizations as SizeVariantsConfig;
					const variant = sizeConfig.variants.find((v) => v.id === variantId);
					if (variant) {
						customizations = {
							type: "size_variant",
							selectedVariantId: variantId,
							finalPriceInCents: variant.priceInCents,
						};
						name = `${product.name} - ${variant.name}`;
						price = variant.priceInCents;
					}
				}
			}

			items.push({
				productId: product.id,
				quantity: lineItem.quantity || 1,
				customizations,
				name,
				price,
			});
		}

		if (items.length === 0) {
			console.error("[Stripe] No valid product items found");
			return { processed: false, error: "No valid products found" };
		}

		// Calculate totals
		const subtotal = items.reduce(
			(sum, item) => sum + item.price * item.quantity,
			0
		);
		const tax = calculateTax(subtotal);
		const totalAmount = subtotal + tax;

		// Handle user ID
		let userId: string | undefined;

		if (existingUserId) {
			userId = existingUserId;
		} else if (customerEmail && joinLoyalty) {
			try {
				const [firstName, ...lastNameParts] = customerName.split(" ");
				const lastName = lastNameParts.join(" ");

				const user = await findOrCreateUser({
					email: customerEmail,
					firstName: firstName || undefined,
					lastName: lastName || undefined,
					phone: customerPhone || undefined,
				});

				userId = user.id;
			} catch (error) {
				console.error("[Stripe] Error creating/finding user:", error);
			}
		}

		// Create order
		const [order] = await db
			.insert(orderTable)
			.values({
				customerEmail,
				customerName,
				customerPhone: customerPhone || null,
				subtotal,
				tax,
				totalAmount,
				paymentStatus: PAYMENT_STATUS.PAID,
				status: ORDER_STATUS.PENDING,
				stripePaymentIntentId: session.payment_intent as string,
				userId: userId || null,
			})
			.returning();

		// Calculate and record merchant fee
		const feeCalculation = calculateMerchantFee({
			orderAmount: order.totalAmount,
			merchantProvider: "stripe",
		});

		await db.insert(merchantFeeTable).values({
			orderId: order.id,
			merchantProvider: "stripe",
			orderAmount: feeCalculation.orderAmount,
			percentageFee: feeCalculation.percentageFee,
			fixedFee: feeCalculation.fixedFee,
			totalFee: feeCalculation.totalFee,
			netAmount: feeCalculation.netAmount,
			paymentIntentId: session.payment_intent as string,
			calculatedAt: new Date(),
		});

		// Create order items and reduce inventory
		for (const item of items) {
			const product = allProducts.find((p) => p.id === item.productId);
			if (!product) continue;

			await db.insert(orderItemTable).values({
				orderId: order.id,
				productId: item.productId,
				quantity: item.quantity,
				priceAtPurchase: item.price,
				customizations: item.customizations
					? JSON.stringify(item.customizations)
					: null,
			});

			// Reduce inventory
			const productCustomizations = product.customizations
				? JSON.parse(product.customizations)
				: null;

			if (
				productCustomizations?.type === "size_variants" &&
				item.customizations?.type === "size_variant"
			) {
				const sizeConfig = productCustomizations as SizeVariantsConfig;
				const variantId = item.customizations.selectedVariantId;
				const variantIndex = sizeConfig.variants.findIndex(
					(v) => v.id === variantId
				);

				if (variantIndex !== -1) {
					sizeConfig.variants[variantIndex].quantityAvailable -= item.quantity;
					await db
						.update(productTable)
						.set({
							customizations: JSON.stringify(sizeConfig),
						})
						.where(eq(productTable.id, item.productId));
				}
			} else {
				await db
					.update(productTable)
					.set({
						quantityAvailable: sql`${productTable.quantityAvailable} - ${item.quantity}`,
					})
					.where(eq(productTable.id, item.productId));
			}
		}

		// Send confirmation emails and SMS
		try {
			const { sendOrderConfirmationEmail } = await import("@/utils/email");

			await sendOrderConfirmationEmail({
				email: customerEmail,
				customerName,
				orderNumber: order.id.substring(4, 12).toUpperCase(),
				orderItems: items.map((item) => ({
					name: item.name,
					quantity: item.quantity,
					price: item.price,
				})),
				total: totalAmount,
			});

			if (customerPhone && smsOptIn) {
				const { sendOrderConfirmationSMS } = await import("@/utils/sms");
				const firstName = customerName.split(" ")[0];
				await sendOrderConfirmationSMS({
					to: customerPhone,
					orderNumber: order.id.substring(4, 12).toUpperCase(),
					customerName: firstName,
				});
			}
		} catch (error) {
			console.error("[Stripe] Error sending confirmation notifications:", error);
		}

		console.log(`[Stripe] Order ${order.id} created successfully`);

		return {
			processed: true,
			orderId: order.id,
			paymentStatus: "paid",
			feeInfo: feeCalculation,
		};
	}

	async createProduct(
		options: ProductCreateOptions
	): Promise<ProductCreateResult> {
		const stripe = this.getClient();

		// Create Stripe product
		const product = await stripe.products.create({
			name: options.name,
			description: options.description,
			images: options.imageUrl ? [options.imageUrl] : undefined,
			metadata: options.metadata,
		});

		// Create default price
		const price = await stripe.prices.create({
			product: product.id,
			unit_amount: options.price,
			currency: "usd",
		});

		// Create variant prices
		const variantIds: Record<string, string> = {};
		if (options.variants) {
			for (const variant of options.variants) {
				const variantPrice = await stripe.prices.create({
					product: product.id,
					unit_amount: variant.price,
					currency: "usd",
					metadata: { variantId: variant.id },
				});
				variantIds[variant.id] = variantPrice.id;
			}
		}

		return {
			productId: product.id,
			priceId: price.id,
			variantIds,
		};
	}

	async refundPayment(options: RefundOptions): Promise<RefundResult> {
		const stripe = this.getClient();

		const refund = await stripe.refunds.create({
			payment_intent: options.paymentId,
			amount: options.amount,
			reason: options.reason as Stripe.RefundCreateParams.Reason,
		});

		return {
			refundId: refund.id,
			status: refund.status === "succeeded" ? "succeeded" : "pending",
			amount: refund.amount,
		};
	}

	async getPayment(paymentId: string): Promise<PaymentDetails> {
		const stripe = this.getClient();
		const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

		return {
			id: paymentIntent.id,
			status: this.mapPaymentStatus(paymentIntent.status),
			amount: paymentIntent.amount,
			currency: paymentIntent.currency,
			createdAt: new Date(paymentIntent.created * 1000),
		};
	}

	private mapPaymentStatus(
		status: string
	): "pending" | "paid" | "failed" | "refunded" {
		switch (status) {
			case "succeeded":
				return "paid";
			case "processing":
				return "pending";
			case "canceled":
				return "failed";
			default:
				return "pending";
		}
	}
}
