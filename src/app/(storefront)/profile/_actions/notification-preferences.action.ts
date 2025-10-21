"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getCurrentLoyaltyCustomer } from "../_lib/get-loyalty-customer";
import { updateNotificationPreferences } from "@/utils/loyalty-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const notificationPreferencesSchema = z.object({
  emailNewFlavors: z.boolean(),
  emailDrops: z.boolean(),
  smsDelivery: z.boolean(),
  smsDrops: z.boolean(),
});

export const getNotificationPreferencesAction = createServerAction()
  .input(z.object({}))
  .handler(async () => {
    const customer = await getCurrentLoyaltyCustomer();

    if (!customer) {
      throw new Error("Not authenticated");
    }

    const preferences = JSON.parse(customer.notificationPreferences);

    return {
      preferences,
    };
  });

export const updateNotificationPreferencesAction = createServerAction()
  .input(z.object({
    preferences: notificationPreferencesSchema,
  }))
  .handler(async ({ input }) => {
    const customer = await getCurrentLoyaltyCustomer();

    if (!customer) {
      throw new Error("Not authenticated");
    }

    const { env } = await getCloudflareContext();

    await updateNotificationPreferences({
      loyaltyCustomerId: customer.id,
      preferences: input.preferences,
      d1: env.NEXT_TAG_CACHE_D1,
    });

    return { success: true };
  });
