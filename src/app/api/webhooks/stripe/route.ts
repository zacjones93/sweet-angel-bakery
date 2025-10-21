import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getDB } from "@/db";
import { orderTable, orderItemTable, productTable, loyaltyCustomerTable, ORDER_STATUS } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "edge";

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
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const db = getDB();
        // Update order status if needed
        if (paymentIntent.metadata?.orderId) {
          await db
            .update(orderTable)
            .set({ status: ORDER_STATUS.PAID })
            .where(eq(orderTable.id, paymentIntent.metadata.orderId));
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const db = getDB();
        // Mark order as payment failed
        if (paymentIntent.metadata?.orderId) {
          await db
            .update(orderTable)
            .set({ status: ORDER_STATUS.PAYMENT_FAILED })
            .where(eq(orderTable.id, paymentIntent.metadata.orderId));
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  // Extract metadata
  const items: Array<{ productId: string; quantity: number }> = JSON.parse(
    session.metadata?.items || "[]"
  );
  const customerName = session.metadata?.customerName || "Guest";
  const customerEmail = session.customer_email || session.customer_details?.email || "";
  const customerPhone = session.metadata?.customerPhone || "";
  const smsOptIn = session.metadata?.smsOptIn === "true";

  if (!items.length) {
    console.error("No items in session metadata");
    return;
  }

  // Get product details
  const productIds = items.map((item) => item.productId);
  const db = getDB();
  const products = await db
    .select()
    .from(productTable)
    .where(inArray(productTable.id, productIds));

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const product = productMap.get(item.productId);
    if (!product) return sum;
    return sum + product.price * item.quantity;
  }, 0);

  // Simple tax calculation (adjust as needed)
  const tax = Math.round(subtotal * 0.08); // 8% tax
  const totalAmount = subtotal + tax;

  // Create or find loyalty customer
  let loyaltyCustomerId: string | undefined;
  if (customerEmail) {
    try {
      // Check if loyalty customer exists
      const [existing] = await db
        .select()
        .from(loyaltyCustomerTable)
        .where(eq(loyaltyCustomerTable.email, customerEmail))
        .limit(1);

      if (existing) {
        loyaltyCustomerId = existing.id;
        // Update phone if provided and not already set
        if (customerPhone && !existing.phone) {
          await db
            .update(loyaltyCustomerTable)
            .set({ phone: customerPhone })
            .where(eq(loyaltyCustomerTable.id, existing.id));
        }
      } else {
        // Create new loyalty customer
        const [firstName, ...lastNameParts] = customerName.split(" ");
        const lastName = lastNameParts.join(" ");

        const [newCustomer] = await db
          .insert(loyaltyCustomerTable)
          .values({
            email: customerEmail,
            firstName: firstName || customerEmail.split("@")[0],
            lastName: lastName || "",
            phone: customerPhone || null,
            emailVerified: 0,
            phoneVerified: 0,
          })
          .returning();

        loyaltyCustomerId = newCustomer.id;
      }
    } catch (error) {
      console.error("Error creating/updating loyalty customer:", error);
      // Continue without loyalty customer linkage
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
      status: ORDER_STATUS.PAID,
      stripePaymentIntentId: session.payment_intent as string,
      loyaltyCustomerId: loyaltyCustomerId || null,
    })
    .returning();

  // Create order items and reduce inventory
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      console.error(`Product ${item.productId} not found`);
      continue;
    }

    // Insert order item
    await db.insert(orderItemTable).values({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      priceAtPurchase: product.price,
    });

    // Reduce inventory - CRITICAL: Use SQL to prevent race conditions
    await db
      .update(productTable)
      .set({
        quantityAvailable: sql`${productTable.quantityAvailable} - ${item.quantity}`,
      })
      .where(eq(productTable.id, item.productId));
  }

  // Send confirmation emails and SMS
  try {
    // Import email utilities dynamically to avoid issues
    const { sendOrderConfirmationEmail } = await import("@/utils/email");

    await sendOrderConfirmationEmail({
      email: customerEmail,
      customerName,
      orderNumber: order.id.substring(4, 12).toUpperCase(), // Use part of order ID
      orderItems: items.map(item => {
        const product = productMap.get(item.productId);
        return {
          name: product?.name || "Unknown",
          quantity: item.quantity,
          price: product?.price || 0,
        };
      }),
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
