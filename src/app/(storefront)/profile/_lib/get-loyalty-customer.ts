import "server-only";

import { getSessionFromCookie, getUserFromDB } from "@/utils/auth";

type SessionUser = Exclude<Awaited<ReturnType<typeof getUserFromDB>>, undefined>;

/**
 * Get the current user from session (previously called "loyalty customer")
 * Now uses unified auth system
 */
export async function getCurrentLoyaltyCustomer(): Promise<SessionUser | null> {
  const session = await getSessionFromCookie();

  if (!session) {
    return null;
  }

  return session.user;
}

// Alias for clarity in storefront context
export async function getCurrentUser(): Promise<SessionUser | null> {
  return getCurrentLoyaltyCustomer();
}
