import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getDB } from "@/db";
import { orderTable, orderItemTable, productTable, ORDER_STATUS, PAYMENT_STATUS } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { calculateTax } from "@/utils/tax";
import { findOrCreateUser } from "@/utils/auth";
import type { OrderItemCustomizations, SizeVariantsConfig } from "@/types/customizations";


export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const stripe = await getStripe();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: `Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        console.log(`[Webhook] Handling checkout.session.completed event`);
        const session = event.data.object as Stripe.Checkout.Session;
        try {
          await handleCheckoutSessionCompleted(session);
          console.log(`[Webhook] Successfully processed checkout session ${session.id}`);
        } catch (error) {
          console.error(`[Webhook] Error in handleCheckoutSessionCompleted:`, error);
          throw error;
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const db = getDB();
        // Update payment status if needed
        if (paymentIntent.metadata?.orderId) {
          await db
            .update(orderTable)
            .set({ paymentStatus: PAYMENT_STATUS.PAID })
            .where(eq(orderTable.id, paymentIntent.metadata.orderId));
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const db = getDB();
        // Mark payment as failed
        if (paymentIntent.metadata?.orderId) {
          await db
            .update(orderTable)
            .set({ paymentStatus: PAYMENT_STATUS.FAILED })
            .where(eq(orderTable.id, paymentIntent.metadata.orderId));
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Webhook] Error processing webhook:", err);
    console.error("[Webhook] Error details:", err instanceof Error ? err.message : String(err));
    console.error("[Webhook] Error stack:", err instanceof Error ? err.stack : 'No stack trace');
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`[Webhook] Processing checkout session: ${session.id}`);

  const customerName = session.metadata?.customerName || "Guest";
  const customerEmail = session.customer_email || session.customer_details?.email || "";
  const customerPhone = session.metadata?.customerPhone || "";
  const joinLoyalty = session.metadata?.joinLoyalty === "true";
  const smsOptIn = session.metadata?.smsOptIn === "true";
  const existingUserId = session.metadata?.userId || "";

  console.log(`[Webhook] Customer: ${customerEmail}, User ID: ${existingUserId || 'none'}`);

  // Retrieve line items from Stripe instead of metadata to avoid character limits
  const stripe = await getStripe();

  console.log(`[Webhook] Fetching line items for session ${session.id}...`);
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product'],
  });

  console.log(`[Webhook] Found ${lineItems.data.length} line items`);

  if (!lineItems.data.length) {
    console.error("[Webhook] No line items in checkout session");
    return;
  }

  // Filter out the tax line item and reconstruct cart items
  const db = getDB();
  const items: Array<{
    productId: string;
    quantity: number;
    customizations?: OrderItemCustomizations;
    name: string;
    price: number;
  }> = [];

  // We need to match Stripe prices back to our products
  // Build a map of Stripe price IDs to products
  const allProducts = await db.select().from(productTable);
  const stripePriceMap = new Map<string, { product: typeof allProducts[0], variantId?: string }>();

  for (const product of allProducts) {
    // Add main product price
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
            stripePriceMap.set(variant.stripePriceId, { product, variantId: variant.id });
          }
        }
      }
    }
  }

  // Process line items from Stripe
  for (const lineItem of lineItems.data) {
    let productInfo = lineItem.price?.id ? stripePriceMap.get(lineItem.price.id) : undefined;

    // If not found by price ID, check for product metadata (ad-hoc prices)
    if (!productInfo && lineItem.price?.product) {
      const stripeProduct = lineItem.price.product;
      // Check if the expanded product has metadata with our product ID
      if (typeof stripeProduct === 'object' && 'metadata' in stripeProduct && stripeProduct.metadata?.productId) {
        const productId = stripeProduct.metadata.productId;
        const product = allProducts.find(p => p.id === productId);
        if (product) {
          productInfo = {
            product,
            variantId: stripeProduct.metadata.variantId,
          };
        }
      }
    }

    if (!productInfo) {
      // This might be a tax line item or other non-product item, skip it
      continue;
    }

    const { product, variantId } = productInfo;
    let customizations: OrderItemCustomizations | undefined;
    let name = product.name;
    let price = product.price; // Use 'price' not 'priceInCents'

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
    console.error("No valid product items found in line items");
    return;
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  // Calculate Idaho sales tax (6% for Boise/Caldwell)
  const tax = calculateTax(subtotal);
  const totalAmount = subtotal + tax;

  // Handle user ID - find or create user if they opted in to loyalty
  let userId: string | undefined;

  // If customer is already logged in, use their ID
  if (existingUserId) {
    userId = existingUserId;
    console.log(`Using existing user ID: ${userId}`);
  }
  // Otherwise, create or find user if they opted in to loyalty
  else if (customerEmail && joinLoyalty) {
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
      console.log(`Created/found user ID: ${userId}`);
    } catch (error) {
      console.error("Error creating/finding user:", error);
      // Continue without user linkage
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
      paymentStatus: PAYMENT_STATUS.PAID, // Payment successful
      status: ORDER_STATUS.PENDING, // Processing - order received, awaiting bakery confirmation
      stripePaymentIntentId: session.payment_intent as string,
      userId: userId || null,
    })
    .returning();

  // Create order items and reduce inventory
  for (const item of items) {
    const product = allProducts.find(p => p.id === item.productId);
    if (!product) {
      console.error(`Product ${item.productId} not found`);
      continue;
    }

    // Insert order item
    await db.insert(orderItemTable).values({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      priceAtPurchase: item.price, // Use actual purchase price from cart
      customizations: item.customizations ? JSON.stringify(item.customizations) : null,
    });

    // Reduce inventory - handle variants
    const productCustomizations = product.customizations
      ? JSON.parse(product.customizations)
      : null;

    if (
      productCustomizations?.type === "size_variants" &&
      item.customizations?.type === "size_variant"
    ) {
      // Reduce quantity for specific variant
      const sizeConfig = productCustomizations as SizeVariantsConfig;
      const variantId = item.customizations.selectedVariantId;
      const variantIndex = sizeConfig.variants.findIndex((v) => v.id === variantId);

      if (variantIndex !== -1) {
        // Update the variant's quantity in the JSON
        sizeConfig.variants[variantIndex].quantityAvailable -= item.quantity;

        // Update product with modified customizations
        await db
          .update(productTable)
          .set({
            customizations: JSON.stringify(sizeConfig),
          })
          .where(eq(productTable.id, item.productId));
      }
    } else {
      // Reduce top-level inventory - CRITICAL: Use SQL to prevent race conditions
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
    // Import email utilities dynamically to avoid issues
    const { sendOrderConfirmationEmail } = await import("@/utils/email");

    await sendOrderConfirmationEmail({
      email: customerEmail,
      customerName,
      orderNumber: order.id.substring(4, 12).toUpperCase(), // Use part of order ID
      orderItems: items.map(item => ({
        name: item.name, // Use cart name which includes variant info
        quantity: item.quantity,
        price: item.price, // Use cart price which reflects variant pricing
      })),
      total: totalAmount,
    });

    // Send SMS if customer opted in and phone is provided
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
    console.error("Error sending confirmation notifications:", error);
    // Don't fail the order if notifications fail
  }

  console.log(`Order ${order.id} created successfully for session ${session.id}`);
}
