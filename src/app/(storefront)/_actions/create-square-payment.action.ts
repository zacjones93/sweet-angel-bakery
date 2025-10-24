"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getMerchantProvider } from "@/lib/merchant-provider/factory";
import { getDB } from "@/db";
import { productTable, orderTable, orderItemTable, merchantFeeTable, ORDER_STATUS, PAYMENT_STATUS } from "@/db/schema";
import { inArray, eq, sql } from "drizzle-orm";
import { orderItemCustomizationsSchema } from "@/schemas/customizations.schema";
import { calculateTax } from "@/utils/tax";
import { calculateMerchantFee } from "@/lib/merchant-provider/fee-calculator";
import type { SizeVariantsConfig } from "@/types/customizations";
import type { SquareFetchProvider } from "@/lib/merchant-provider/providers/square-fetch";

const createSquarePaymentInputSchema = z.object({
  sourceId: z.string(), // Token from Square Web Payments SDK
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      customizations: orderItemCustomizationsSchema.optional(),
      name: z.string(),
      price: z.number().int().positive(),
    })
  ).min(1, "Cart cannot be empty"),
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  joinLoyalty: z.boolean().optional(),
  smsOptIn: z.boolean().optional(),
  userId: z.string().optional(),
  streetAddress1: z.string().optional(),
  streetAddress2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  // Fulfillment data
  fulfillmentMethod: z.enum(["delivery", "pickup"]).optional(),
  deliveryFee: z.number().int().nonnegative().optional(),
  deliveryDate: z.string().optional(),
  pickupLocationId: z.string().optional(),
  pickupDate: z.string().optional(),
});

export const createSquarePaymentAction = createServerAction()
  .input(createSquarePaymentInputSchema)
  .handler(async ({ input }) => {
    const provider = await getMerchantProvider();
    const db = getDB();

    // Only works with Square
    if (provider.name !== "square") {
      throw new Error("This action only works with Square provider");
    }

    // Fetch products to validate availability
    const productIds = input.items.map((item) => item.productId);
    const uniqueProductIds = [...new Set(productIds)];
    const products = await db
      .select()
      .from(productTable)
      .where(inArray(productTable.id, uniqueProductIds));

    if (products.length !== uniqueProductIds.length) {
      throw new Error("Some products not found");
    }

    // Validate inventory
    for (const item of input.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      const productCustomizations = product.customizations
        ? JSON.parse(product.customizations)
        : null;

      let availableQuantity = product.quantityAvailable;

      if (
        productCustomizations?.type === "size_variants" &&
        item.customizations?.type === "size_variant"
      ) {
        const sizeConfig = productCustomizations as SizeVariantsConfig;
        const variantId = item.customizations.selectedVariantId;
        const variant = sizeConfig.variants.find((v) => v.id === variantId);
        if (variant) {
          availableQuantity = variant.quantityAvailable;
        }
      }

      if (availableQuantity < item.quantity) {
        throw new Error(`Insufficient inventory for ${product.name}`);
      }
    }

    // Calculate totals (including delivery fee)
    const subtotal = input.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const deliveryFee = input.deliveryFee || 0;
    const subtotalWithDelivery = subtotal + deliveryFee;
    const tax = calculateTax(subtotalWithDelivery);
    const totalAmount = subtotalWithDelivery + tax;

    // Create payment with Square using tokenized card
    const squareProvider = provider as SquareFetchProvider;

    const paymentResponse = await squareProvider.request<{ payment: { id: string; status: string } }>("/v2/payments", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        source_id: input.sourceId,
        amount_money: {
          amount: totalAmount,
          currency: "USD",
        },
        location_id: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
        buyer_email_address: input.customerEmail,
        note: `Order for ${input.customerName}`,
      }),
    });

    const payment = paymentResponse.payment;

    if (!payment || payment.status !== "COMPLETED") {
      throw new Error("Payment failed or incomplete");
    }

    // Build delivery address
    const deliveryAddress = input.streetAddress1
      ? [
        input.streetAddress1,
        input.streetAddress2,
        [input.city, input.state, input.zipCode].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", ")
      : null;

    // Create order in database
    const [order] = await db
      .insert(orderTable)
      .values({
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        customerPhone: input.customerPhone || null,
        subtotal,
        tax,
        totalAmount,
        paymentStatus: PAYMENT_STATUS.PAID,
        status: ORDER_STATUS.PENDING,
        merchantProvider: "square",
        paymentIntentId: payment.id,
        stripePaymentIntentId: payment.id,
        userId: input.userId || null,
        deliveryAddress,
        fulfillmentType: input.fulfillmentMethod || (deliveryAddress ? "delivery" : null),
        // Delivery fields
        ...(input.fulfillmentMethod === "delivery" ? {
          deliveryDate: input.deliveryDate,
          deliveryFee: deliveryFee,
        } : {}),
        // Pickup fields
        ...(input.fulfillmentMethod === "pickup" ? {
          pickupLocationId: input.pickupLocationId,
          pickupDate: input.pickupDate,
        } : {}),
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
    for (const item of input.items) {
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

      await sendOrderConfirmationEmail({
        email: input.customerEmail,
        customerName: input.customerName,
        orderNumber: order.id.substring(4, 12).toUpperCase(),
        orderItems: input.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        total: totalAmount,
      });
    } catch (error) {
      console.error("[Square Payment] Error sending confirmation email:", error);
    }

    console.log(`[Square Payment] Order ${order.id} created successfully`);

    return {
      orderId: order.id,
      paymentId: payment.id,
      orderNumber: order.id.substring(4, 12).toUpperCase(),
    };
  });
