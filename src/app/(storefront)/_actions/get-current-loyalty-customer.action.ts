"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { getCurrentLoyaltyCustomer } from "@/app/(storefront)/profile/_lib/get-loyalty-customer";

export const getCurrentLoyaltyCustomerAction = createServerAction()
  .input(z.object({}))
  .handler(async () => {
    const customer = await getCurrentLoyaltyCustomer();

    if (!customer) {
      return null;
    }

    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      role: customer.role,
      streetAddress1: customer.streetAddress1,
      streetAddress2: customer.streetAddress2,
      city: customer.city,
      state: customer.state,
      zipCode: customer.zipCode,
    };
  });
