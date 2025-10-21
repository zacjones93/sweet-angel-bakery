"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMagicLinkToken } from "@/utils/auth";
import { sendMagicLinkEmail } from "@/utils/email";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { checkRateLimit } from "@/utils/rate-limit";

const requestMagicLinkInputSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  callback: z.string().optional(),
});

export const requestMagicLinkAction = createServerAction()
  .input(requestMagicLinkInputSchema)
  .handler(async ({ input }) => {
    const { env } = await getCloudflareContext();

    // Rate limiting: max 3 requests per hour per email
    const rateLimitResult = await checkRateLimit({
      key: input.email,
      options: {
        limit: 3,
        windowInSeconds: 60 * 60, // 1 hour
        identifier: "magic-link",
      },
    });

    if (!rateLimitResult.success) {
      throw new Error("Too many requests. Please try again in an hour.");
    }

    // Check if user exists
    const db = getDB(env.NEXT_TAG_CACHE_D1);
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, input.email.toLowerCase()))
      .limit(1);

    if (!user) {
      // For security, don't reveal that the email doesn't exist
      // Still return success to prevent email enumeration
      return { success: true };
    }

    // Generate magic link token
    const token = await createMagicLinkToken({
      email: input.email.toLowerCase(),
      kv: env.NEXT_INC_CACHE_KV,
      callback: input.callback,
    });

    // Send magic link email
    await sendMagicLinkEmail({
      email: input.email,
      magicToken: token,
      customerName: `${user.firstName} ${user.lastName}`.trim(),
    });

    return { success: true };
  });
