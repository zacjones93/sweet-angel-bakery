"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getCurrentLoyaltyCustomer } from "../_lib/get-loyalty-customer";
import { getDB } from "@/db";
import { userTable } from "@/db/schema";
import { eq } from "drizzle-orm";

const notificationPreferencesSchema = z.object({
  emailNewFlavors: z.boolean(),
  emailDrops: z.boolean(),
  smsDelivery: z.boolean(),
  smsDrops: z.boolean(),
});

export const getNotificationPreferencesAction = createServerAction()
  .input(z.object({}))
  .handler(async () => {
    const user = await getCurrentLoyaltyCustomer();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const preferences = JSON.parse(user.notificationPreferences || '{}');

    return {
      preferences,
    };
  });

export const updateNotificationPreferencesAction = createServerAction()
  .input(z.object({
    preferences: notificationPreferencesSchema,
  }))
  .handler(async ({ input }) => {
    const user = await getCurrentLoyaltyCustomer();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const db = getDB();

    // Update user's notification preferences
    await db
      .update(userTable)
      .set({
        notificationPreferences: JSON.stringify(input.preferences),
      })
      .where(eq(userTable.id, user.id));

    return { success: true };
  });
