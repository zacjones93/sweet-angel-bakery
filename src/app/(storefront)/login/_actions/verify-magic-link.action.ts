"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { verifyMagicLinkAndCreateSession } from "@/utils/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const verifyMagicLinkInputSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const verifyMagicLinkAction = createServerAction()
  .input(verifyMagicLinkInputSchema)
  .handler(async ({ input }) => {
    const { env } = await getCloudflareContext();

    if (!env.NEXT_INC_CACHE_KV) {
      throw new Error("KV namespace not available");
    }

    // Verify the magic link token and create session
    const result = await verifyMagicLinkAndCreateSession({
      token: input.token,
      kv: env.NEXT_INC_CACHE_KV,
    });

    if (!result) {
      throw new Error("Invalid or expired login link");
    }

    return {
      success: true,
      callback: result.callback,
    };
  });
