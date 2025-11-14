import "server-only";
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
  userTable,
  ORDER_STATUS,
  PAYMENT_STATUS,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { calculateTax } from "@/utils/tax";
import { findOrCreateUser } from "@/utils/auth";
import type { SizeVariantsConfig } from "@/types/customizations";
import { calculateMerchantFee } from "../fee-calculator";

/**
 * Square provider implementation using fetch API (Edge runtime compatible)
 * Does NOT use the Square SDK to avoid Edge runtime compatibility issues
 */
export class SquareFetchProvider implements IMerchantProvider {
  readonly name = "square" as const;
  private baseUrl: string;
  private accessToken: string;
  private locationId: string;

  constructor() {
    this.accessToken = process.env.SQUARE_ACCESS_TOKEN || "";
    this.locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || "";
    this.baseUrl =
      process.env.SQUARE_ENVIRONMENT === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";
  }

  async initialize(): Promise<void> {
    if (!this.accessToken) throw new Error("SQUARE_ACCESS_TOKEN not configured");
    if (!this.locationId) throw new Error("NEXT_PUBLIC_SQUARE_LOCATION_ID not configured");
  }

  /**
   * Make a request to Square API
   * @public Exposed for direct API calls (e.g., Web Payments SDK)
   */
  async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    console.log(`[Square] Request: ${options.method || 'GET'} ${endpoint}`);
    if (options.body) {
      console.log(`[Square] Request body:`, JSON.parse(options.body as string));
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-10-17",
        ...options.headers,
      },
    });

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      console.error("[Square] API Error Response:", JSON.stringify(data, null, 2));
      console.error("[Square] Status:", response.status);
      console.error("[Square] Status Text:", response.statusText);

      // Extract detailed error info
      const errors = data.errors as Array<{ category?: string; code?: string; detail?: string; field?: string }> | undefined;
      const errorDetails = errors?.map((err) => {
        return `${err.code || 'UNKNOWN'}: ${err.detail || 'No detail'}${err.field ? ` (field: ${err.field})` : ''}`;
      }).join(', ') || response.statusText;

      throw new Error(`Square API error: ${errorDetails}`);
    }

    console.log(`[Square] Response:`, data);
    return data as T;
  }

  async createCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
    // Calculate totals
    const subtotal = options.lineItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = calculateTax(subtotal);

    // Build line items for Square
    const lineItems = [
      ...options.lineItems.map((item) => ({
        name: item.name,
        note: item.description,
        quantity: String(item.quantity),
        base_price_money: {
          amount: item.price,
          currency: "USD",
        },
      })),
      // Add tax line item
      {
        name: "Idaho Sales Tax (6%)",
        note: "State sales tax for Boise/Caldwell area",
        quantity: "1",
        base_price_money: {
          amount: tax,
          currency: "USD",
        },
      },
    ];

    // Filter out empty/null metadata values (Square rejects empty strings)
    const cleanMetadata: Record<string, string> = {};
    if (options.metadata) {
      for (const [key, value] of Object.entries(options.metadata)) {
        if (value && value.trim()) {
          cleanMetadata[key] = value;
        }
      }
    }

    // Square doesn't have a session concept like Stripe
    // Pass the payment link ID so thanks page can poll for the order
    const successUrl = options.successUrl.replace(
      /\{CHECKOUT_SESSION_ID\}/,
      `square_${crypto.randomUUID()}`
    ) + "&provider=square";

    const result = await this.request<{
      payment_link: {
        id: string;
        url: string;
        version: number;
        order_id: string;
      };
    }>("/v2/online-checkout/payment-links", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: this.locationId,
          line_items: lineItems,
          // Only include metadata if there are non-empty values
          ...(Object.keys(cleanMetadata).length > 0 && { metadata: cleanMetadata }),
        },
        checkout_options: {
          redirect_url: successUrl,
          merchant_support_email: options.customerEmail,
          ask_for_shipping_address: false,
        },
        pre_populated_data: {
          buyer_email: options.customerEmail,
        },
      }),
    });

    return {
      sessionId: result.payment_link.id,
      url: result.payment_link.url,
    };
  }

  async verifyWebhook(body: string, signature: string, webhookUrl?: string): Promise<WebhookEvent> {
    const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    if (!webhookSecret) {
      throw new Error("SQUARE_WEBHOOK_SIGNATURE_KEY not configured");
    }

    // Verify HMAC-SHA256 signature
    // Square calculates: HMAC-SHA256(notification_url + request_body, signature_key)
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Try different URL formats to find a match
    const urlsToTry: string[] = [];

    if (webhookUrl) {
      // Try the provided URL
      urlsToTry.push(webhookUrl);

      // Try without https:// (http:// version)
      urlsToTry.push(webhookUrl.replace('https://', 'http://'));

      // Try with different host variations if localhost
      if (webhookUrl.includes('localhost')) {
        const ngrokPattern = webhookUrl.replace('https://localhost:3000', 'https://YOUR_NGROK_URL');
        console.log("  - Note: If using ngrok, webhook URL should be:", ngrokPattern);
      }
    }

    // Also try without URL (body only)
    urlsToTry.push('');

    console.log("[Square Webhook] Signature verification:");
    console.log("  - Webhook URL:", webhookUrl);
    console.log("  - Body length:", body.length);
    console.log("  - Received signature:", signature);
    console.log("  - Trying URL variations...");

    let matchedUrl: string | null = null;
    let expectedSignature = '';

    for (const urlToTry of urlsToTry) {
      const signaturePayload = urlToTry ? `${urlToTry}${body}` : body;

      const signatureBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(signaturePayload)
      );

      expectedSignature = btoa(
        String.fromCharCode(...new Uint8Array(signatureBuffer))
      );

      console.log(`  - Trying URL: "${urlToTry || '(body only)'}"`);
      console.log(`    Expected sig: ${expectedSignature}`);
      console.log(`    Match: ${signature === expectedSignature}`);

      if (signature === expectedSignature) {
        matchedUrl = urlToTry;
        break;
      }
    }

    if (!matchedUrl && signature !== expectedSignature) {
      console.error("[Square Webhook] No URL variation matched!");
      console.error("  - This likely means the webhook URL configured in Square Dashboard doesn't match");
      console.error("  - Check Square Dashboard > Webhooks and verify the notification URL");
      throw new Error("Invalid webhook signature");
    }

    console.log(`[Square Webhook] ✓ Signature verified with URL: "${matchedUrl || '(body only)'}"`);

    const event = JSON.parse(body);

    return {
      id: event.event_id || crypto.randomUUID(),
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

    const payment = (event.data as { object?: { payment?: unknown } })?.object
      ?.payment as {
        id: string;
        status: string;
        order_id?: string;
        buyer_email_address?: string;
      } | null;

    if (!payment) {
      return { processed: false, error: "No payment data" };
    }

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

    const orderId = payment.order_id;
    if (!orderId) {
      return { processed: false, error: "No order ID in payment" };
    }

    // Get order details from Square
    const orderResult = await this.request<{
      order: {
        id: string;
        metadata?: Record<string, string>;
        line_items?: Array<{
          name?: string;
          quantity?: string;
          base_price_money?: { amount: number };
        }>;
      };
    }>(`/v2/orders/${orderId}`);

    const squareOrder = orderResult.order;
    const metadata = squareOrder.metadata || {};

    console.log("[Square] Order metadata:", metadata);

    // Get database instance
    const db = getDB();

    // Extract customer info from metadata or payment
    const customerEmail = payment.buyer_email_address || "";
    const customerName = metadata.customerName || "Guest";
    const customerPhone = metadata.customerPhone || "";
    let userId = metadata.userId || null;

    // Auto-link order to user if email exists in database
    if (!userId && customerEmail) {
      const [existingUser] = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, customerEmail.toLowerCase()))
        .limit(1);

      if (existingUser) {
        userId = existingUser.id;
        console.log(`[Square] Auto-linked order to user ${userId} (${customerEmail})`);
      }
    }

    // Process line items (excluding tax)
    const items: Array<{
      productId: string;
      quantity: number;
      customizations?: OrderItemCustomizations;
      name: string;
      price: number;
    }> = [];

    const allProducts = await db.select().from(productTable);

    for (const lineItem of squareOrder.line_items || []) {
      // Skip tax items
      if (lineItem.name?.includes("Tax")) {
        continue;
      }

      // Match product by name (simplified)
      const product = allProducts.find((p) => p.name === lineItem.name);
      if (!product) continue;

      items.push({
        productId: product.id,
        quantity: parseInt(lineItem.quantity || "1"),
        name: lineItem.name || product.name,
        price: lineItem.base_price_money?.amount || product.price,
      });
    }

    if (items.length === 0) {
      return { processed: false, error: "No valid products" };
    }

    // Calculate totals
    const deliveryFee = metadata.deliveryFee ? parseInt(metadata.deliveryFee) : 0;
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = calculateTax(subtotal + deliveryFee);
    const totalAmount = subtotal + deliveryFee + tax;

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
        merchantProvider: "square",
        paymentIntentId: payment.id,
        stripePaymentIntentId: payment.id, // For backward compatibility
        userId: userId,
        // Fulfillment fields from metadata
        fulfillmentMethod: metadata.fulfillmentMethod as "delivery" | "pickup" | null || null,
        deliveryDate: metadata.deliveryDate || null,
        deliveryFee: deliveryFee || null,
        deliveryZoneId: metadata.deliveryZoneId || null,
        deliveryTimeWindow: metadata.deliveryTimeWindow || null,
        pickupDate: metadata.pickupDate || null,
        pickupLocationId: metadata.pickupLocationId || null,
        pickupTimeWindow: metadata.pickupTimeWindow || null,
        // Delivery address as JSON from metadata
        deliveryAddressJson: metadata.deliveryAddressJson || null,
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
        // Prepare delivery address
        let deliveryAddressFormatted: string | null = null;
        if (order.deliveryAddressJson && order.deliveryAddressJson !== "null") {
          try {
            const addr = JSON.parse(order.deliveryAddressJson);
            deliveryAddressFormatted = `${addr.street}\n${addr.city}, ${addr.state} ${addr.zip}`;
          } catch {
            deliveryAddressFormatted = null;
          }
        }

        // Fetch pickup location if needed
        let pickupLocationFormatted: { name: string; address: string } | null = null;
        if (order.pickupLocationId) {
          const { pickupLocationTable } = await import("@/db/schema");
          const pickupLoc = await db
            .select()
            .from(pickupLocationTable)
            .where(eq(pickupLocationTable.id, order.pickupLocationId))
            .get();

          if (pickupLoc) {
            let pickupAddress = "";
            if (pickupLoc.address && pickupLoc.address !== "null") {
              try {
                const addr = JSON.parse(pickupLoc.address);
                pickupAddress = `${addr.street}\n${addr.city}, ${addr.state} ${addr.zip}`;
              } catch {
                pickupAddress = pickupLoc.address;
              }
            }
            pickupLocationFormatted = {
              name: pickupLoc.name,
              address: pickupAddress,
            };
          }
        }

        await sendOrderConfirmationEmail({
          email: customerEmail,
          customerName,
          orderNumber: order.id.substring(4, 12).toUpperCase(),
          orderItems: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal,
          tax,
          deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
          total: totalAmount,
          fulfillmentMethod: (order.fulfillmentMethod as "delivery" | "pickup" | null) || null,
          deliveryDate: order.deliveryDate || null,
          deliveryTimeWindow: order.deliveryTimeWindow || null,
          deliveryAddress: deliveryAddressFormatted,
          pickupDate: order.pickupDate || null,
          pickupTimeWindow: order.pickupTimeWindow || null,
          pickupLocation: pickupLocationFormatted,
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
    // Build variations
    const variations = [
      {
        type: "ITEM_VARIATION",
        id: "#default-variation",
        item_variation_data: {
          name: "Regular",
          pricing_type: "FIXED_PRICING",
          price_money: {
            amount: options.price,
            currency: "USD",
          },
        },
      },
    ];

    // Add custom variants
    if (options.variants) {
      for (const variant of options.variants) {
        variations.push({
          type: "ITEM_VARIATION",
          id: `#variant-${variant.id}`,
          item_variation_data: {
            name: variant.name,
            pricing_type: "FIXED_PRICING",
            price_money: {
              amount: variant.price,
              currency: "USD",
            },
          },
        });
      }
    }

    const result = await this.request<{
      objects: Array<{
        id: string;
        type: string;
        item_variation_data?: { name: string };
      }>;
    }>("/v2/catalog/batch-upsert", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        batches: [
          {
            objects: [
              {
                type: "ITEM",
                id: "#product",
                item_data: {
                  name: options.name,
                  description: options.description,
                  variations,
                },
              },
            ],
          },
        ],
      }),
    });

    const createdItem = result.objects[0];
    const defaultVariation = result.objects.find(
      (obj) => obj.item_variation_data?.name === "Regular"
    );

    // Map variant IDs
    const variantIds: Record<string, string> = {};
    if (options.variants) {
      for (const variant of options.variants) {
        const createdVariation = result.objects.find(
          (obj) => obj.item_variation_data?.name === variant.name
        );
        if (createdVariation) {
          variantIds[variant.id] = createdVariation.id;
        }
      }
    }

    return {
      productId: createdItem.id,
      priceId: defaultVariation?.id,
      variantIds,
    };
  }

  async refundPayment(options: RefundOptions): Promise<RefundResult> {
    const result = await this.request<{
      refund: {
        id: string;
        status: string;
        amount_money: { amount: number };
      };
    }>("/v2/refunds", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        amount_money: options.amount
          ? { amount: options.amount, currency: "USD" }
          : undefined,
        payment_id: options.paymentId,
        reason: options.reason,
      }),
    });

    return {
      refundId: result.refund.id,
      status: result.refund.status === "COMPLETED" ? "succeeded" : "pending",
      amount: result.refund.amount_money.amount,
    };
  }

  async getPayment(paymentId: string): Promise<PaymentDetails> {
    const result = await this.request<{
      payment: {
        id: string;
        status: string;
        total_money: { amount: number; currency: string };
        created_at: string;
      };
    }>(`/v2/payments/${paymentId}`);

    const payment = result.payment;

    return {
      id: payment.id,
      status: this.mapPaymentStatus(payment.status),
      amount: payment.total_money.amount,
      currency: payment.total_money.currency,
      createdAt: new Date(payment.created_at),
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
