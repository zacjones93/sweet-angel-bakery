"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getMerchantProvider } from "@/lib/merchant-provider/factory";
import { SITE_URL } from "@/constants";
import { productTable } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getDB } from "@/db";
import { orderItemCustomizationsSchema } from "@/schemas/customizations.schema";
import type { CheckoutLineItem } from "@/lib/merchant-provider/types";
import type { SizeVariantsConfig } from "@/types/customizations";

const createCheckoutSessionInputSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      customizations: orderItemCustomizationsSchema.optional(),
      name: z.string(), // Display name with variant info
      price: z.number().int().positive(), // Final price in cents
    })
  ).min(1, "Cart cannot be empty"),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  joinLoyalty: z.boolean().optional(),
  smsOptIn: z.boolean().optional(),
  userId: z.string().optional(), // Pass existing user ID if logged in
  streetAddress1: z.string().optional(),
  streetAddress2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

export const createCheckoutSessionAction = createServerAction()
  .input(createCheckoutSessionInputSchema)
  .handler(async ({ input }) => {
    const provider = await getMerchantProvider();
    const db = getDB();
    // Fetch products to validate availability
    const productIds = input.items.map((item) => item.productId);
    // Deduplicate product IDs (same product might have multiple variants in cart)
    const uniqueProductIds = [...new Set(productIds)];
    const products = await db
      .select()
      .from(productTable)
      .where(inArray(productTable.id, uniqueProductIds));

    if (products.length !== uniqueProductIds.length) {
      throw new Error("Some products not found");
    }

    // Validate inventory (implementation stays the same)
    for (const item of input.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      // Parse product customizations to check variant-specific inventory
      const productCustomizations = product.customizations
        ? JSON.parse(product.customizations)
        : null;

      let availableQuantity = product.quantityAvailable;

      // For size variants, check the specific variant's quantity
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

    // Build line items for merchant provider
    const lineItems: CheckoutLineItem[] = input.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;

      return {
        productId: product.id,
        name: item.name,
        description: product.description || undefined,
        price: item.price,
        quantity: item.quantity,
        imageUrl: product.imageUrl || undefined,
        customizations: item.customizations || undefined,
      };
    });

    // Create checkout session using merchant provider
    const session = await provider.createCheckout({
      lineItems,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      successUrl: `${SITE_URL}/purchase/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${SITE_URL}/cart`,
      metadata: {
        customerName: input.customerName || "",
        customerPhone: input.customerPhone || "",
        joinLoyalty: input.joinLoyalty ? "true" : "false",
        smsOptIn: input.smsOptIn ? "true" : "false",
        userId: input.userId || "", // Pass user ID if logged in
        streetAddress1: input.streetAddress1 || "",
        streetAddress2: input.streetAddress2 || "",
        city: input.city || "",
        state: input.state || "",
        zipCode: input.zipCode || "",
      },
    });

    return {
      sessionId: session.sessionId,
      url: session.url,
    };
  });
