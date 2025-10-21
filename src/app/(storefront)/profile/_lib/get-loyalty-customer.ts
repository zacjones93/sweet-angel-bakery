import "server-only";

import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getLoyaltySession } from "@/utils/loyalty-auth";
import { getDB } from "@/db";
import { loyaltyCustomerTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { LoyaltyCustomer } from "@/db/schema";

export async function getCurrentLoyaltyCustomer(): Promise<LoyaltyCustomer | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("loyalty_session")?.value;

  if (!sessionId) {
    return null;
  }

  const { env } = await getCloudflareContext();

  // Get session from KV
  const session = await getLoyaltySession({
    sessionId,
    kv: env.NEXT_INC_CACHE_KV,
  });

  if (!session) {
    return null;
  }

  // Get loyalty customer from database
  const db = getDB(env.NEXT_TAG_CACHE_D1);
  const [customer] = await db
    .select()
    .from(loyaltyCustomerTable)
    .where(eq(loyaltyCustomerTable.id, session.loyaltyCustomerId))
    .limit(1);

  return customer || null;
}
