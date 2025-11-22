"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getMerchantProvider } from "@/lib/merchant-provider/factory";
import { getDB } from "@/db";
import { productTable, orderTable, orderItemTable, merchantFeeTable, pickupLocationTable, ORDER_STATUS, PAYMENT_STATUS } from "@/db/schema";
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
  deliveryZoneId: z.string().optional(),
  deliveryTimeWindow: z.string().optional(),
  pickupLocationId: z.string().optional(),
  pickupDate: z.string().optional(),
  pickupTimeWindow: z.string().optional(),
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

    // Create payment with Square using tokenized card
    const squareProvider = provider as SquareFetchProvider;

    // Step 1: Create an order with line items and taxes
    const lineItems = input.items.map((item) => ({
      name: item.name,
      quantity: String(item.quantity),
      base_price_money: {
        amount: item.price,
        currency: "USD",
      },
    }));

    // Add delivery fee as a line item if present
    if (deliveryFee > 0) {
      lineItems.push({
        name: "Delivery Fee",
        quantity: "1",
        base_price_money: {
          amount: deliveryFee,
          currency: "USD",
        },
      });
    }

    const orderResponse = await squareProvider.request<{
      order: {
        id: string;
        total_money: { amount: number; currency: string };
        total_tax_money: { amount: number; currency: string };
      };
    }>("/v2/orders", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
          line_items: lineItems,
          // Apply Idaho sales tax (6%) at order level
          taxes: [
            {
              uid: "idaho-sales-tax",
              name: "Idaho Sales Tax",
              percentage: "6.0",
              scope: "ORDER",
            },
          ],
        },
      }),
    });

    const squareOrder = orderResponse.order;
    const tax = squareOrder.total_tax_money?.amount || 0;
    const totalAmount = squareOrder.total_money?.amount || (subtotalWithDelivery + tax);

    // Step 2: Create payment and link it to the order
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
        order_id: squareOrder.id, // Link payment to order
      }),
    });

    const payment = paymentResponse.payment;

    if (!payment || payment.status !== "COMPLETED") {
      throw new Error("Payment failed or incomplete");
    }

    // Build delivery address (both legacy string and new JSON formats)
    const deliveryAddress = input.streetAddress1
      ? [
        input.streetAddress1,
        input.streetAddress2,
        [input.city, input.state, input.zipCode].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", ")
      : null;

    const deliveryAddressJson = input.streetAddress1
      ? JSON.stringify({
        street: input.streetAddress1,
        street2: input.streetAddress2 || null,
        city: input.city || null,
        state: input.state || null,
        zip: input.zipCode || null,
      })
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
        deliveryAddressJson,
        // Fulfillment method
        fulfillmentMethod: input.fulfillmentMethod || null,
        // Delivery fields
        deliveryDate: input.deliveryDate || null,
        deliveryFee: deliveryFee || null,
        deliveryZoneId: input.deliveryZoneId || null,
        deliveryTimeWindow: input.deliveryTimeWindow || null,
        // Pickup fields
        pickupLocationId: input.pickupLocationId || null,
        pickupDate: input.pickupDate || null,
        pickupTimeWindow: input.pickupTimeWindow || null,
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

      // Prepare delivery address
      let deliveryAddressFormatted: string | null = null;
      if (deliveryAddressJson && deliveryAddressJson !== "null") {
        try {
          const addr = JSON.parse(deliveryAddressJson);
          deliveryAddressFormatted = `${addr.street}\n${addr.city}, ${addr.state} ${addr.zip}`;
        } catch {
          deliveryAddressFormatted = deliveryAddress;
        }
      } else {
        deliveryAddressFormatted = deliveryAddress;
      }

      // Fetch pickup location if needed
      let pickupLocationFormatted: { name: string; address: string } | null = null;
      if (input.pickupLocationId) {
        const pickupLoc = await db
          .select()
          .from(pickupLocationTable)
          .where(eq(pickupLocationTable.id, input.pickupLocationId))
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
        email: input.customerEmail,
        customerName: input.customerName,
        orderNumber: order.id.substring(4, 12).toUpperCase(),
        orderItems: input.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal,
        tax,
        deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
        total: totalAmount,
        fulfillmentMethod: input.fulfillmentMethod || null,
        deliveryDate: input.deliveryDate || null,
        deliveryTimeWindow: input.deliveryTimeWindow || null,
        deliveryAddress: deliveryAddressFormatted,
        pickupDate: input.pickupDate || null,
        pickupTimeWindow: input.pickupTimeWindow || null,
        pickupLocation: pickupLocationFormatted,
      });
    } catch (error) {
      console.error("[Square Payment] Error sending confirmation email:", error);
    }

    // Send admin notification email
    try {
      const { sendAdminNewOrderEmail } = await import("@/utils/email");

      // Prepare delivery address
      let deliveryAddressFormatted: string | null = null;
      if (deliveryAddressJson && deliveryAddressJson !== "null") {
        try {
          const addr = JSON.parse(deliveryAddressJson);
          deliveryAddressFormatted = `${addr.street}\n${addr.city}, ${addr.state} ${addr.zip}`;
        } catch {
          deliveryAddressFormatted = deliveryAddress;
        }
      } else {
        deliveryAddressFormatted = deliveryAddress;
      }

      // Fetch pickup location if needed
      let pickupLocationFormatted: { name: string; address: string } | null = null;
      if (input.pickupLocationId) {
        const pickupLoc = await db
          .select()
          .from(pickupLocationTable)
          .where(eq(pickupLocationTable.id, input.pickupLocationId))
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

      // Collect order items with customizations for admin view
      const itemsWithCustomizations = input.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        customizations: item.customizations ? JSON.stringify(item.customizations) : null,
      }));

      await sendAdminNewOrderEmail({
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone || null,
        orderNumber: order.id.substring(4, 12).toUpperCase(),
        orderId: order.id,
        orderItems: itemsWithCustomizations,
        subtotal,
        tax,
        deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
        total: totalAmount,
        fulfillmentMethod: input.fulfillmentMethod || null,
        deliveryDate: input.deliveryDate || null,
        deliveryTimeWindow: input.deliveryTimeWindow || null,
        deliveryAddress: deliveryAddressFormatted,
        pickupDate: input.pickupDate || null,
        pickupTimeWindow: input.pickupTimeWindow || null,
        pickupLocation: pickupLocationFormatted,
      });
    } catch (error) {
      console.error("[Square Payment] Error sending admin notification email:", error);
    }

    console.log(`[Square Payment] Order ${order.id} created successfully`);

    return {
      orderId: order.id,
      paymentId: payment.id,
      orderNumber: order.id.substring(4, 12).toUpperCase(),
    };
  });
