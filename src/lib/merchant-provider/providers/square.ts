import "server-only";
import { Client, Environment } from "square";
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
import crypto from "crypto";

export class SquareProvider implements IMerchantProvider {
	readonly name = "square" as const;
	private client: Client | null = null;
	private locationId: string | null = null;

	async initialize(): Promise<void> {
		if (this.client) return;

		const accessToken = process.env.SQUARE_ACCESS_TOKEN;
		const locationId = process.env.SQUARE_LOCATION_ID;

		if (!accessToken) throw new Error("SQUARE_ACCESS_TOKEN not configured");
		if (!locationId) throw new Error("SQUARE_LOCATION_ID not configured");

		const environment =
			process.env.SQUARE_ENVIRONMENT === "production"
				? Environment.Production
				: Environment.Sandbox;

		this.client = new Client({ accessToken, environment });
		this.locationId = locationId;
	}

	private getClient(): Client {
		if (!this.client) throw new Error("Square not initialized");
		return this.client;
	}

	private getLocationId(): string {
		if (!this.locationId) throw new Error("Square location ID not configured");
		return this.locationId;
	}

	async createCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
		const client = this.getClient();
		const locationId = this.getLocationId();

		// Build line items
		const lineItems = options.lineItems.map((item) => ({
			name: item.name,
			note: item.description,
			quantity: String(item.quantity),
			basePriceMoney: {
				amount: BigInt(item.price),
				currency: "USD" as const,
			},
			itemType: "ITEM" as const,
		}));

		// Calculate and add tax
		const subtotal = options.lineItems.reduce(
			(sum, item) => sum + item.price * item.quantity,
			0
		);
		const tax = calculateTax(subtotal);

		// Add tax line item
		lineItems.push({
			name: "Idaho Sales Tax (6%)",
			note: "State sales tax for Boise/Caldwell area",
			quantity: "1",
			basePriceMoney: {
				amount: BigInt(tax),
				currency: "USD" as const,
			},
			itemType: "ITEM" as const,
		});

		const { result } = await client.checkoutApi.createPaymentLink({
			idempotencyKey: crypto.randomUUID(),
			order: {
				locationId,
				lineItems,
			},
			checkoutOptions: {
				redirectUrl: options.successUrl,
				askForShippingAddress: false,
				merchantSupportEmail: options.customerEmail,
			},
			prePopulatedData: {
				buyerEmail: options.customerEmail,
			},
		});

		return {
			sessionId: result.paymentLink!.id!,
			url: result.paymentLink!.url!,
		};
	}

	async verifyWebhook(body: string, signature: string): Promise<WebhookEvent> {
		const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
		if (!signatureKey) throw new Error("SQUARE_WEBHOOK_SIGNATURE_KEY not configured");

		// Verify signature using HMAC-SHA256
		const hmac = crypto.createHmac("sha256", signatureKey);
		hmac.update(body);
		const expectedSignature = hmac.digest("base64");

		if (signature !== expectedSignature) {
			throw new Error("Invalid webhook signature");
		}

		const event = JSON.parse(body);

		return {
			id: event.event_id,
			type: event.type,
			createdAt: new Date(event.created_at),
			data: event.data,
		};
	}

	async handleWebhook(event: WebhookEvent): Promise<WebhookResult> {
		switch (event.type) {
			case "payment.created":
			case "payment.updated":
				return await this.handlePaymentEvent(event);

			case "order.created":
			case "order.updated":
				return { processed: true };

			default:
				return { processed: false };
		}
	}

	private async handlePaymentEvent(
		event: WebhookEvent
	): Promise<WebhookResult> {
		console.log(`[Square] Processing payment event: ${event.type}`);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const payment = (event.data as any).object.payment;

		// Map Square payment status
		let paymentStatus: "pending" | "paid" | "failed" | "refunded";
		switch (payment.status) {
			case "COMPLETED":
				paymentStatus = "paid";
				break;
			case "APPROVED":
				paymentStatus = "pending";
				break;
			case "FAILED":
			case "CANCELED":
				paymentStatus = "failed";
				break;
			default:
				paymentStatus = "pending";
		}

		// Only process completed payments
		if (payment.status !== "COMPLETED") {
			return { processed: true, paymentStatus };
		}

		// Get order details from Square
		const client = this.getClient();
		const orderId = payment.order_id;

		if (!orderId) {
			console.error("[Square] No order ID in payment");
			return { processed: false, error: "No order ID" };
		}

		const { result: orderResult } = await client.ordersApi.retrieveOrder(
			orderId
		);
		const squareOrder = orderResult.order;

		if (!squareOrder) {
			console.error("[Square] Order not found");
			return { processed: false, error: "Order not found" };
		}

		// Extract customer information
		// Note: Square payment links don't always capture customer info
		// We'll need to get it from pre-populated data or metadata
		const customerEmail = payment.buyer_email_address || "";
		const customerName = "Guest"; // Square doesn't provide this in payment
		const customerPhone = "";

		// Process line items (excluding tax)
		const db = getDB();
		const items: Array<{
			productId: string;
			quantity: number;
			customizations?: OrderItemCustomizations;
			name: string;
			price: number;
		}> = [];

		// For Square, we'll need to map products by name or use custom metadata
		// This is a simplified version - in production, you'd want better product mapping
		const allProducts = await db.select().from(productTable);

		for (const lineItem of squareOrder.lineItems || []) {
			// Skip tax items
			if (lineItem.itemType === "TAX" || lineItem.name?.includes("Tax")) {
				continue;
			}

			// Try to match product by name (this is simplified)
			const product = allProducts.find((p) => p.name === lineItem.name);
			if (!product) continue;

			items.push({
				productId: product.id,
				quantity: parseInt(lineItem.quantity || "1"),
				name: lineItem.name || product.name,
				price: Number(lineItem.basePriceMoney?.amount || product.price),
			});
		}

		if (items.length === 0) {
			console.error("[Square] No valid product items found");
			return { processed: false, error: "No valid products" };
		}

		// Calculate totals
		const subtotal = items.reduce(
			(sum, item) => sum + item.price * item.quantity,
			0
		);
		const tax = calculateTax(subtotal);
		const totalAmount = subtotal + tax;

		// Create order in database
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
				stripePaymentIntentId: payment.id, // Store Square payment ID
				userId: null,
			})
			.returning();

		// Calculate and record merchant fee
		const feeCalculation = calculateMerchantFee({
			orderAmount: order.totalAmount,
			merchantProvider: "square",
		});

		await db.insert(merchantFeeTable).values({
			orderId: order.id,
			merchantProvider: "square",
			orderAmount: feeCalculation.orderAmount,
			percentageFee: feeCalculation.percentageFee,
			fixedFee: feeCalculation.fixedFee,
			totalFee: feeCalculation.totalFee,
			netAmount: feeCalculation.netAmount,
			paymentIntentId: payment.id,
			calculatedAt: new Date(),
		});

		// Create order items and reduce inventory
		for (const item of items) {
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
			await db
				.update(productTable)
				.set({
					quantityAvailable: sql`${productTable.quantityAvailable} - ${item.quantity}`,
				})
				.where(eq(productTable.id, item.productId));
		}

		// Send confirmation email
		try {
			const { sendOrderConfirmationEmail } = await import("@/utils/email");

			if (customerEmail) {
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
			}
		} catch (error) {
			console.error("[Square] Error sending confirmation email:", error);
		}

		console.log(`[Square] Order ${order.id} created successfully`);

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
		const client = this.getClient();

		// Build variations
		const variations = [
			{
				type: "ITEM_VARIATION" as const,
				id: "#default-variation",
				itemVariationData: {
					name: "Regular",
					pricingType: "FIXED_PRICING" as const,
					priceMoney: {
						amount: BigInt(options.price),
						currency: "USD" as const,
					},
				},
			},
		];

		// Add custom variants
		if (options.variants) {
			for (const variant of options.variants) {
				variations.push({
					type: "ITEM_VARIATION" as const,
					id: `#variant-${variant.id}`,
					itemVariationData: {
						name: variant.name,
						pricingType: "FIXED_PRICING" as const,
						priceMoney: {
							amount: BigInt(variant.price),
							currency: "USD" as const,
						},
					},
				});
			}
		}

		const { result } = await client.catalogApi.batchUpsertCatalogObjects({
			idempotencyKey: crypto.randomUUID(),
			batches: [
				{
					objects: [
						{
							type: "ITEM",
							id: "#product",
							itemData: {
								name: options.name,
								description: options.description,
								variations,
							},
						},
					],
				},
			],
		});

		const createdItem = result.objects![0];
		const defaultVariation = result.objects!.find((obj) =>
			obj.itemVariationData?.name?.includes("Regular")
		);

		// Map variant IDs
		const variantIds: Record<string, string> = {};
		if (options.variants) {
			for (const variant of options.variants) {
				const createdVariation = result.objects!.find(
					(obj) => obj.itemVariationData?.name === variant.name
				);
				if (createdVariation) {
					variantIds[variant.id] = createdVariation.id!;
				}
			}
		}

		return {
			productId: createdItem.id!,
			priceId: defaultVariation?.id,
			variantIds,
		};
	}

	async refundPayment(options: RefundOptions): Promise<RefundResult> {
		const client = this.getClient();

		const { result } = await client.refundsApi.refundPayment({
			idempotencyKey: crypto.randomUUID(),
			amountMoney: options.amount
				? { amount: BigInt(options.amount), currency: "USD" }
				: undefined,
			paymentId: options.paymentId,
			reason: options.reason,
		});

		return {
			refundId: result.refund!.id!,
			status: result.refund!.status === "COMPLETED" ? "succeeded" : "pending",
			amount: Number(result.refund!.amountMoney!.amount!),
		};
	}

	async getPayment(paymentId: string): Promise<PaymentDetails> {
		const client = this.getClient();
		const { result } = await client.paymentsApi.getPayment(paymentId);
		const payment = result.payment!;

		return {
			id: payment.id!,
			status: this.mapPaymentStatus(payment.status!),
			amount: Number(payment.totalMoney!.amount!),
			currency: payment.totalMoney!.currency!,
			createdAt: new Date(payment.createdAt!),
		};
	}

	private mapPaymentStatus(
		status: string
	): "pending" | "paid" | "failed" | "refunded" {
		switch (status) {
			case "COMPLETED":
				return "paid";
			case "APPROVED":
				return "pending";
			case "FAILED":
			case "CANCELED":
				return "failed";
			default:
				return "pending";
		}
	}
}
