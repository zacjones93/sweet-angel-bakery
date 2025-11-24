"use server";

import { createServerAction } from "zsa";
import { getDB } from "@/db";
import {
  orderTable,
  orderItemTable,
  productTable,
  pickupLocationTable,
  ORDER_STATUS,
  PAYMENT_STATUS,
  ROLES_ENUM,
} from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { manualOrderSchema } from "@/schemas/manual-order.schema";
import { calculateTax } from "@/utils/tax";
import { getSessionFromCookie } from "@/utils/auth";
import type { SizeVariantsConfig } from "@/types/customizations";

export const createManualOrderAction = createServerAction()
  .input(manualOrderSchema)
  .handler(async ({ input }) => {
    // Verify admin authentication
    const session = await getSessionFromCookie();
    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized: Only admins can create manual orders");
    }

    const db = getDB();
    const adminId = session.user.id;

    // Fetch and validate products
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

      // Check size variant inventory if applicable
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

    // Calculate totals
    const subtotal = input.items.reduce(
      (sum, item) => sum + item.priceInCents * item.quantity,
      0
    );
    const deliveryFee = input.deliveryFee || 0;
    const subtotalWithDelivery = subtotal + deliveryFee;
    const tax = calculateTax(subtotalWithDelivery);
    const totalAmount = subtotalWithDelivery + tax;

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
        paymentStatus: input.paymentStatus === "paid" ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
        status: ORDER_STATUS.PENDING,
        merchantProvider: "manual",
        paymentMethod: input.paymentMethod,
        createdByAdminId: adminId,
        adminNotes: input.adminNotes || null,
        deliveryAddress,
        deliveryAddressJson,
        // Fulfillment method
        fulfillmentMethod: input.fulfillmentMethod,
        // Delivery fields
        deliveryDate: input.deliveryDate || null,
        deliveryFee: deliveryFee || null,
        deliveryZoneId: input.deliveryZoneId || null,
        deliveryTimeWindow: input.deliveryTimeWindow || null,
        deliveryInstructions: input.deliveryInstructions || null,
        // Pickup fields
        pickupLocationId: input.pickupLocationId || null,
        pickupDate: input.pickupDate || null,
        pickupTimeWindow: input.pickupTimeWindow || null,
        pickupInstructions: input.pickupInstructions || null,
      })
      .returning();

    // Create order items and reduce inventory
    for (const item of input.items) {
      await db.insert(orderItemTable).values({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.priceInCents,
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

    // Send confirmation email if requested
    if (input.sendConfirmationEmail) {
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
            price: item.priceInCents,
          })),
          subtotal,
          tax,
          deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
          total: totalAmount,
          fulfillmentMethod: input.fulfillmentMethod,
          deliveryDate: input.deliveryDate || null,
          deliveryTimeWindow: input.deliveryTimeWindow || null,
          deliveryAddress: deliveryAddressFormatted,
          pickupDate: input.pickupDate || null,
          pickupTimeWindow: input.pickupTimeWindow || null,
          pickupLocation: pickupLocationFormatted,
        });
      } catch (error) {
        console.error("[Manual Order] Error sending confirmation email:", error);
      }
    }

    console.log(`[Manual Order] Order ${order.id} created by admin ${adminId}`);

    return {
      orderId: order.id,
      orderNumber: order.id.substring(4, 12).toUpperCase(),
    };
  });

/**
 * Get products for manual order form
 * Returns products with their current inventory levels
 */
export const getProductsForManualOrderAction = createServerAction()
  .handler(async () => {
    const session = await getSessionFromCookie();
    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    const products = await db
      .select({
        id: productTable.id,
        name: productTable.name,
        description: productTable.description,
        price: productTable.price,
        imageUrl: productTable.imageUrl,
        status: productTable.status,
        quantityAvailable: productTable.quantityAvailable,
        customizations: productTable.customizations,
      })
      .from(productTable)
      .where(eq(productTable.status, "active"));

    return products;
  });

/**
 * Get pickup locations for manual order form
 */
export const getPickupLocationsAction = createServerAction()
  .handler(async () => {
    const session = await getSessionFromCookie();
    if (!session?.user || session.user.role !== ROLES_ENUM.ADMIN) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    const locations = await db
      .select()
      .from(pickupLocationTable)
      .where(eq(pickupLocationTable.isActive, 1));

    return locations;
  });
