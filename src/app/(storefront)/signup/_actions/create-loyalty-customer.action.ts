"use server";

import { z } from "zod";
import { createServerAction } from "zsa";
import { getDB } from "@/db";
import { loyaltyCustomerTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateMagicLinkToken } from "@/utils/loyalty-auth";
import { sendMagicLinkEmail } from "@/utils/email";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const createLoyaltyCustomerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  notificationPreferences: z.object({
    emailNewFlavors: z.boolean().default(true),
    emailDrops: z.boolean().default(true),
    smsDelivery: z.boolean().default(false),
    smsDrops: z.boolean().default(false),
  }).optional(),
});

export const createLoyaltyCustomerAction = createServerAction()
  .input(createLoyaltyCustomerSchema)
  .handler(async ({ input }) => {
    const { env } = getCloudflareContext();
    const db = getDB();

    // Check if customer already exists
    const [existingCustomer] = await db
      .select()
      .from(loyaltyCustomerTable)
      .where(eq(loyaltyCustomerTable.email, input.email.toLowerCase()))
      .limit(1);

    if (existingCustomer) {
      throw new Error("An account with this email already exists. Please login instead.");
    }

    // Create loyalty customer
    const notificationPrefs = input.notificationPreferences || {
      emailNewFlavors: true,
      emailDrops: true,
      smsDelivery: false,
      smsDrops: false,
    };

    const [customer] = await db
      .insert(loyaltyCustomerTable)
      .values({
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone || null,
        emailVerified: 0,
        phoneVerified: 0,
        notificationPreferences: JSON.stringify(notificationPrefs),
      })
      .returning();

    if (!env.NEXT_INC_CACHE_KV) {
      throw new Error("KV namespace not available");
    }

    // Generate magic link token to log them in
    const token = await generateMagicLinkToken({
      email: customer.email,
      kv: env.NEXT_INC_CACHE_KV,
    });

    // Send welcome email with login link
    await sendMagicLinkEmail({
      email: customer.email,
      magicToken: token,
      customerName: `${customer.firstName} ${customer.lastName}`,
    });

    return {
      success: true,
      email: customer.email,
      firstName: customer.firstName,
    };
  });
