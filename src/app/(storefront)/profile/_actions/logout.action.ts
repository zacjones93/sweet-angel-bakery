"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { deleteSessionTokenCookie } from "@/utils/auth";

export const logoutAction = createServerAction()
  .input(z.object({}))
  .handler(async () => {
    // Delete session cookie using unified auth system
    await deleteSessionTokenCookie();

    return { success: true };
  });
