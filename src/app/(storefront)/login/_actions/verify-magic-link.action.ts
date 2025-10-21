"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { cookies } from "next/headers";
import { getDB } from "@/db";
import { loyaltyCustomerTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyMagicLinkToken, createLoyaltySession } from "@/utils/loyalty-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const verifyMagicLinkInputSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const verifyMagicLinkAction = createServerAction()
  .input(verifyMagicLinkInputSchema)
  .handler(async ({ input }) => {
    const { env } = await getCloudflareContext();

    // Verify the magic link token
    const email = await verifyMagicLinkToken({
      token: input.token,
      kv: env.NEXT_INC_CACHE_KV,
    });

    if (!email) {
      throw new Error("Invalid or expired login link");
    }

    // Get the loyalty customer
    const db = getDB(env.NEXT_TAG_CACHE_D1);
    const [customer] = await db
      .select()
      .from(loyaltyCustomerTable)
      .where(eq(loyaltyCustomerTable.email, email))
      .limit(1);

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Create loyalty session
    const sessionId = await createLoyaltySession({
      loyaltyCustomerId: customer.id,
      email: customer.email,
      kv: env.NEXT_INC_CACHE_KV,
    });

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("loyalty_session", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return {
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    };
  });
