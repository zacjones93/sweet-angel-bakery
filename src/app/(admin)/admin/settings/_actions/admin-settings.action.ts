"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/utils/auth";

const adminNotificationPreferencesSchema = z.object({
  emailNewOrders: z.boolean(),
  newOrderEmailAddress: z.string().email().nullable(),
});

export const getAdminNotificationPreferencesAction = createServerAction()
  .handler(async () => {
    const admin = await requireAdmin();

    if (!admin) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    const user = await db.query.userTable.findFirst({
      where: eq(userTable.id, admin.userId),
      columns: {
        adminNotificationPreferences: true,
      },
    });

    if (!user) {
      throw new Error("Admin user not found");
    }

    try {
      const prefs = JSON.parse(user.adminNotificationPreferences);
      return adminNotificationPreferencesSchema.parse(prefs);
    } catch {
      // Return default preferences if parsing fails
      return {
        emailNewOrders: true,
        newOrderEmailAddress: null,
      };
    }
  });

export const updateAdminNotificationPreferencesAction = createServerAction()
  .input(adminNotificationPreferencesSchema)
  .handler(async ({ input }) => {
    const admin = await requireAdmin();

    if (!admin) {
      throw new Error("Unauthorized");
    }

    const db = getDB();

    await db
      .update(userTable)
      .set({
        adminNotificationPreferences: JSON.stringify(input),
      })
      .where(eq(userTable.id, admin.userId));

    return { success: true };
  });
