"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { SITE_URL } from "@/constants";
import { productTable } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getDB } from "@/db";
import { calculateTax } from "@/utils/tax";
import { orderItemCustomizationsSchema } from "@/schemas/customizations.schema";
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
    const stripe = await getStripe();
    const db = getDB();
    // Fetch products to validate availability and get Stripe IDs
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

    // Validate inventory
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

    // Build line items for Stripe
    const lineItems = input.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;

      // Parse product customizations
      const productCustomizations = product.customizations
        ? JSON.parse(product.customizations)
        : null;

      // Determine which Stripe price ID to use
      let stripePriceId: string | null = null;

      if (
        productCustomizations?.type === "size_variants" &&
        item.customizations?.type === "size_variant"
      ) {
        // Find the selected variant's Stripe price ID
        const sizeConfig = productCustomizations as SizeVariantsConfig;
        const variantId = item.customizations.selectedVariantId;
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
              description: product.description || undefined,
              images: product.imageUrl ? [product.imageUrl] : undefined,
              // Store product ID in metadata for webhook recovery (for products without Stripe price IDs)
              metadata: {
                productId: product.id,
                ...(item.customizations?.type === "size_variant" && {
                  variantId: item.customizations.selectedVariantId,
                }),
              },
            },
            unit_amount: item.price, // Use the calculated price from cart
          },
          quantity: item.quantity,
        };
      }
    });

    // Calculate subtotal and tax (use prices from cart items)
    const subtotal = input.items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const tax = calculateTax(subtotal);

    // Add tax as a separate line item
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Idaho Sales Tax (6%)",
          description: "State sales tax for Boise/Caldwell area",
          images: undefined,
          metadata: {
            productId: "tax",
          },
        },
        unit_amount: tax, // tax amount in cents
      },
      quantity: 1,
    });

    // Create Stripe checkout session
    // Note: We don't store items in metadata anymore to avoid 500 char limit
    // Instead, we retrieve line items from Stripe in the webhook handler
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${SITE_URL}/purchase/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cart`,
      customer_email: input.customerEmail,
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

    if (!session.url) {
      throw new Error("Failed to create checkout session");
    }

    return {
      sessionId: session.id,
      url: session.url,
    };
  });
