"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { orderTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { render } from "@react-email/render";
import { DeliveryETANotificationEmail } from "@/react-email/delivery-eta-notification";
import isProd from "@/utils/is-prod";

const NOTIFICATION_COOLDOWN_HOURS = 2; // Don't allow notifications more than once every 2 hours

type EmailProvider = "resend" | "brevo" | null;

async function getEmailProvider(): Promise<EmailProvider> {
  if (process.env.RESEND_API_KEY) {
    return "resend";
  }

  if (process.env.BREVO_API_KEY) {
    return "brevo";
  }

  return null;
}

async function sendResendEmail({
  to,
  subject,
  html,
}: {
  to: string[];
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      tags: [{ name: "type", value: "delivery-eta" }],
    }),
  });

  if (!response.ok) {
    const error = (await response.json()) as unknown;
    throw new Error(`Failed to send email via Resend: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function sendBrevoEmail({
  to,
  subject,
  html,
}: {
  to: { email: string; name: string }[];
  subject: string;
  html: string;
}) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not set");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        name: process.env.EMAIL_FROM_NAME,
        email: process.env.EMAIL_FROM,
      },
      to,
      htmlContent: html,
      subject,
      tags: ["delivery-eta"],
    }),
  });

  if (!response.ok) {
    const error = (await response.json()) as unknown;
    throw new Error(`Failed to send email via Brevo: ${JSON.stringify(error)}`);
  }

  return response.json();
}

export const notifyDeliveryETA = createServerAction()
  .input(
    z.object({
      deliveryDate: z.string(), // ISO date "2024-10-26"
      orderIds: z.array(z.string()).optional(), // If provided, only notify these orders
    })
  )
  .handler(async ({ input }) => {
    const db = getDB();

    // Get all delivery orders for the specified date
    const orders = await db
      .select()
      .from(orderTable)
      .where(
        and(
          eq(orderTable.deliveryDate, input.deliveryDate),
          eq(orderTable.fulfillmentMethod, "delivery")
        )
      )
      .all();

    if (orders.length === 0) {
      throw new Error("No delivery orders found for this date");
    }

    // Filter orders if specific IDs provided
    const ordersToNotify = input.orderIds
      ? orders.filter((order) => input.orderIds!.includes(order.id))
      : orders;

    // Check for recent notifications and filter out orders that were notified recently
    const now = new Date();
    const cooldownMs = NOTIFICATION_COOLDOWN_HOURS * 60 * 60 * 1000;

    const eligibleOrders = ordersToNotify.filter((order) => {
      if (!order.deliveryNotificationSentAt) {
        return true; // Never notified, eligible
      }

      const lastNotificationTime = new Date(order.deliveryNotificationSentAt).getTime();
      const timeSinceLastNotification = now.getTime() - lastNotificationTime;

      return timeSinceLastNotification >= cooldownMs;
    });

    if (eligibleOrders.length === 0) {
      const recentlyNotified = ordersToNotify.filter(
        (order) => order.deliveryNotificationSentAt
      );
      throw new Error(
        `All selected orders were notified within the last ${NOTIFICATION_COOLDOWN_HOURS} hours. Please wait before sending another notification.`
      );
    }

    // Check email provider
    const provider = await getEmailProvider();
    if (!provider && isProd) {
      throw new Error(
        "No email provider configured. Set either RESEND_API_KEY or BREVO_API_KEY in your environment."
      );
    }

    // Send notifications
    const results = {
      sent: [] as string[],
      failed: [] as { orderId: string; error: string }[],
      skipped: [] as string[], // Orders skipped due to cooldown
    };

    // Track skipped orders
    ordersToNotify
      .filter((order) => !eligibleOrders.includes(order))
      .forEach((order) => {
        results.skipped.push(order.id);
      });

    for (const order of eligibleOrders) {
      try {
        // Parse delivery address
        const deliveryAddress = order.deliveryAddressJson
          ? JSON.parse(order.deliveryAddressJson)
          : null;

        if (!deliveryAddress) {
          results.failed.push({
            orderId: order.id,
            error: "No delivery address found",
          });
          continue;
        }

        // Render email
        const html = await render(
          DeliveryETANotificationEmail({
            customerName: order.customerName,
            orderNumber: order.id,
            deliveryDate: order.deliveryDate || undefined,
            deliveryTimeWindow: order.deliveryTimeWindow || undefined,
            deliveryAddress,
            deliveryInstructions: order.deliveryInstructions || undefined,
          })
        );

        if (!isProd) {
          console.log("\n=== DELIVERY ETA NOTIFICATION ===");
          console.log("To:", order.customerEmail);
          console.log("Order:", order.id);
          console.log("Delivery Date:", order.deliveryDate);
          console.log("Time Window:", order.deliveryTimeWindow);
          console.log("=================================\n");
        } else {
          // Send email based on provider
          if (provider === "resend") {
            await sendResendEmail({
              to: [order.customerEmail],
              subject: `Your Sweet Angel Bakery order is on the way!`,
              html,
            });
          } else if (provider === "brevo") {
            await sendBrevoEmail({
              to: [{ email: order.customerEmail, name: order.customerName }],
              subject: `Your Sweet Angel Bakery order is on the way!`,
              html,
            });
          }
        }

        // Update database with notification timestamp
        await db
          .update(orderTable)
          .set({
            deliveryNotificationSentAt: now,
            deliveryNotificationCount: (order.deliveryNotificationCount || 0) + 1,
          })
          .where(eq(orderTable.id, order.id));

        results.sent.push(order.id);
      } catch (error) {
        results.failed.push({
          orderId: order.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      success: true,
      sent: results.sent.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      details: results,
      message: `Sent ${results.sent.length} notification${results.sent.length !== 1 ? "s" : ""}${results.failed.length > 0 ? `, ${results.failed.length} failed` : ""}${results.skipped.length > 0 ? `, ${results.skipped.length} skipped (recently notified)` : ""}`,
    };
  });
