"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getCurrentLoyaltyCustomer } from "../_lib/get-loyalty-customer";
import { getDB } from "@/db";
import { userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateAllSessionsOfUser } from "@/utils/kv-session";

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
      streetAddress1: customer.streetAddress1,
      streetAddress2: customer.streetAddress2,
      city: customer.city,
      state: customer.state,
      zipCode: customer.zipCode,
    };
  });

export const updateProfileSettingsAction = createServerAction()
  .input(z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: z.string().nullable(),
    streetAddress1: z.string().nullable(),
    streetAddress2: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    zipCode: z.string().nullable(),
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
        streetAddress1: input.streetAddress1,
        streetAddress2: input.streetAddress2,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
      })
      .where(eq(userTable.id, customer.id));

    // Update all sessions with the new user data
    await updateAllSessionsOfUser(customer.id);

    return { success: true };
  });
