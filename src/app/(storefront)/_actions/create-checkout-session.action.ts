"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { SITE_URL } from "@/constants";
import { productTable } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getDB } from "@/db";

const createCheckoutSessionInputSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ).min(1, "Cart cannot be empty"),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  smsOptIn: z.boolean().optional(),
});

export const createCheckoutSessionAction = createServerAction()
  .input(createCheckoutSessionInputSchema)
  .handler(async ({ input }) => {
    const stripe = await getStripe();
    const db = getDB();
    // Fetch products to validate availability and get Stripe IDs
    const productIds = input.items.map((item) => item.productId);
    const products = await db
      .select()
      .from(productTable)
      .where(inArray(productTable.id, productIds));

    if (products.length !== productIds.length) {
      throw new Error("Some products not found");
    }

    // Validate inventory
    for (const item of input.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }
      if (product.quantityAvailable < item.quantity) {
        throw new Error(`Insufficient inventory for ${product.name}`);
      }
    }

    // Build line items for Stripe
    const lineItems = input.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            description: product.description || undefined,
            images: product.imageUrl ? [product.imageUrl] : undefined,
          },
          unit_amount: product.price, // already in cents
        },
        quantity: item.quantity,
      };
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${SITE_URL}/purchase/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/cart`,
      customer_email: input.customerEmail,
      metadata: {
        items: JSON.stringify(input.items),
        customerName: input.customerName || "",
        customerPhone: input.customerPhone || "",
        smsOptIn: input.smsOptIn ? "true" : "false",
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
