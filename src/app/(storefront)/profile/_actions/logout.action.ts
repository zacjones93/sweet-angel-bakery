"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { deleteLoyaltySession } from "@/utils/loyalty-auth";

export const logoutAction = createServerAction()
  .input(z.object({}))
  .handler(async () => {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("loyalty_session")?.value;

    if (sessionId) {
      const { env } = await getCloudflareContext();

      // Delete session from KV
      await deleteLoyaltySession({
        sessionId,
        kv: env.NEXT_INC_CACHE_KV,
      });
    }

    // Delete session cookie
    cookieStore.delete("loyalty_session");

    return { success: true };
  });
