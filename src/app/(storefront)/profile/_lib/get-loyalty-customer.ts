import "server-only";

import { getSessionFromCookie } from "@/utils/auth";
import type { User } from "@/db/schema";

/**
 * Get the current user from session (previously called "loyalty customer")
 * Now uses unified auth system
 */
export async function getCurrentLoyaltyCustomer(): Promise<User | null> {
  const session = await getSessionFromCookie();
  
  if (!session) {
    return null;
  }

  return session.user;
}

// Alias for clarity in storefront context
export async function getCurrentUser(): Promise<User | null> {
  return getCurrentLoyaltyCustomer();
}
