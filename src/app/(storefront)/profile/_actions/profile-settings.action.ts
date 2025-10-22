"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getCurrentLoyaltyCustomer } from "../_lib/get-loyalty-customer";
import { getDB } from "@/db";
import { userTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const getProfileSettingsAction = createServerAction()
  .input(z.object({}))
  .handler(async () => {
    const customer = await getCurrentLoyaltyCustomer();

    if (!customer) {
      throw new Error("Not authenticated");
    }

    return {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
    };
  });

export const updateProfileSettingsAction = createServerAction()
  .input(z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: z.string().nullable(),
  }))
  .handler(async ({ input }) => {
    const customer = await getCurrentLoyaltyCustomer();

    if (!customer) {
      throw new Error("Not authenticated");
    }

    const db = getDB();

    await db
      .update(userTable)
      .set({
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      })
      .where(eq(userTable.id, customer.id));

    return { success: true };
  });
