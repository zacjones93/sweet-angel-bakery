"use server";

import { z } from "zod";
import { createServerAction } from "zsa";
import { getDB } from "@/db";
import { userTable, orderTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMagicLinkToken } from "@/utils/auth";
import { sendMagicLinkEmail } from "@/utils/email";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const createUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  orderId: z.string().optional(), // Order ID to link after signup
  notificationPreferences: z.object({
    emailNewFlavors: z.boolean().default(true),
    emailDrops: z.boolean().default(true),
    smsDelivery: z.boolean().default(false),
    smsDrops: z.boolean().default(false),
  }).optional(),
});

export const createUserAction = createServerAction()
  .input(createUserSchema)
  .handler(async ({ input }) => {
    const { env } = getCloudflareContext();
    const db = getDB();

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, input.email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      throw new Error("An account with this email already exists. Please login instead.");
    }

    // Create user
    const notificationPrefs = input.notificationPreferences || {
      emailNewFlavors: true,
      emailDrops: true,
      smsDelivery: false,
      smsDrops: false,
    };

    const [user] = await db
      .insert(userTable)
      .values({
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone || null,
        emailVerified: null,
        phoneVerified: 0,
        role: "user",
        notificationPreferences: JSON.stringify(notificationPrefs),
      })
      .returning();

    if (!env.NEXT_INC_CACHE_KV) {
      throw new Error("KV namespace not available");
    }

    // If orderId is provided, link the order to the new user
    if (input.orderId) {
      // Verify the order exists and matches the email
      const [order] = await db
        .select()
        .from(orderTable)
        .where(eq(orderTable.id, input.orderId))
        .limit(1);

      if (order && order.customerEmail.toLowerCase() === user.email!.toLowerCase()) {
        // Link the order to the user
        await db
          .update(orderTable)
          .set({ userId: user.id })
          .where(eq(orderTable.id, input.orderId));
      }
    }

    // Generate magic link token to log them in
    // If orderId is provided, include it in the callback to redirect to order page
    const callback = input.orderId ? `/profile/orders/${input.orderId}` : undefined;

    const token = await createMagicLinkToken({
      email: user.email!,
      kv: env.NEXT_INC_CACHE_KV,
      callback,
    });

    // Send welcome email with login link
    await sendMagicLinkEmail({
      email: user.email!,
      magicToken: token,
      customerName: `${user.firstName} ${user.lastName}`,
    });

    return {
      success: true,
      email: user.email,
      firstName: user.firstName,
    };
  });

// Keep the old export for backward compatibility during migration
export const createLoyaltyCustomerAction = createUserAction;
