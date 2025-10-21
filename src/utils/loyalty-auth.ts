import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import type { RequestContext } from "@cloudflare/workers-types";

import { getDB } from "@/db";
import { loyaltyCustomerTable } from "@/db/schema";
import type { LoyaltyCustomer } from "@/db/schema";

const MAGIC_LINK_EXPIRY = 15 * 60 * 1000; // 15 minutes
const SESSION_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface LoyaltySession {
  loyaltyCustomerId: string;
  email: string;
  expiresAt: number;
  createdAt: number;
}

/**
 * Generate a magic link token for a loyalty customer
 */
export async function generateMagicLinkToken({
  email,
  kv,
}: {
  email: string;
  kv: KVNamespace;
}): Promise<string> {
  const token = createId();
  const expiresAt = Date.now() + MAGIC_LINK_EXPIRY;

  // Store token in KV with email and expiry
  await kv.put(
    `magic_link:${token}`,
    JSON.stringify({ email, expiresAt }),
    { expirationTtl: Math.floor(MAGIC_LINK_EXPIRY / 1000) }
  );

  return token;
}

/**
 * Verify a magic link token and return the email if valid
 */
export async function verifyMagicLinkToken({
  token,
  kv,
}: {
  token: string;
  kv: KVNamespace;
}): Promise<string | null> {
  const data = await kv.get(`magic_link:${token}`);
  if (!data) {
    return null;
  }

  const { email, expiresAt } = JSON.parse(data);

  // Check if token is expired
  if (Date.now() > expiresAt) {
    await kv.delete(`magic_link:${token}`);
    return null;
  }

  // Delete token after successful verification (one-time use)
  await kv.delete(`magic_link:${token}`);

  return email;
}

/**
 * Create a loyalty session for a customer
 */
export async function createLoyaltySession({
  loyaltyCustomerId,
  email,
  kv,
}: {
  loyaltyCustomerId: string;
  email: string;
  kv: KVNamespace;
}): Promise<string> {
  const sessionId = createId();
  const expiresAt = Date.now() + SESSION_EXPIRY;

  const session: LoyaltySession = {
    loyaltyCustomerId,
    email,
    expiresAt,
    createdAt: Date.now(),
  };

  // Store session in KV
  await kv.put(
    `loyalty_session:${sessionId}`,
    JSON.stringify(session),
    { expirationTtl: Math.floor(SESSION_EXPIRY / 1000) }
  );

  return sessionId;
}

/**
 * Get loyalty session from session ID
 */
export async function getLoyaltySession({
  sessionId,
  kv,
}: {
  sessionId: string;
  kv: KVNamespace;
}): Promise<LoyaltySession | null> {
  const data = await kv.get(`loyalty_session:${sessionId}`);
  if (!data) {
    return null;
  }

  const session: LoyaltySession = JSON.parse(data);

  // Check if session is expired
  if (Date.now() > session.expiresAt) {
    await kv.delete(`loyalty_session:${sessionId}`);
    return null;
  }

  return session;
}

/**
 * Delete a loyalty session
 */
export async function deleteLoyaltySession({
  sessionId,
  kv,
}: {
  sessionId: string;
  kv: KVNamespace;
}): Promise<void> {
  await kv.delete(`loyalty_session:${sessionId}`);
}

/**
 * Get loyalty customer from session cookie
 */
export async function getLoyaltyCustomerFromSession(
  ctx: RequestContext
): Promise<LoyaltyCustomer | null> {
  const { env, req } = ctx;
  const cookies = req.headers.get("cookie");

  if (!cookies) {
    return null;
  }

  // Parse loyalty_session cookie
  const sessionMatch = cookies.match(/loyalty_session=([^;]+)/);
  if (!sessionMatch) {
    return null;
  }

  const sessionId = sessionMatch[1];

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

/**
 * Find or create loyalty customer by email
 */
export async function findOrCreateLoyaltyCustomer({
  email,
  firstName,
  lastName,
  phone,
  d1,
}: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  d1: D1Database;
}): Promise<LoyaltyCustomer> {
  const db = getDB(d1);

  // Try to find existing customer
  const [existing] = await db
    .select()
    .from(loyaltyCustomerTable)
    .where(eq(loyaltyCustomerTable.email, email))
    .limit(1);

  if (existing) {
    return existing;
  }

  // Create new loyalty customer
  const [newCustomer] = await db
    .insert(loyaltyCustomerTable)
    .values({
      email,
      firstName: firstName || email.split("@")[0],
      lastName: lastName || "",
      emailVerified: 0,
      phoneVerified: 0,
      phone: phone || null,
    })
    .returning();

  return newCustomer;
}

/**
 * Update loyalty customer notification preferences
 */
export async function updateNotificationPreferences({
  loyaltyCustomerId,
  preferences,
  d1,
}: {
  loyaltyCustomerId: string;
  preferences: {
    emailNewFlavors?: boolean;
    emailDrops?: boolean;
    smsDelivery?: boolean;
    smsDrops?: boolean;
  };
  d1: D1Database;
}): Promise<void> {
  const db = getDB(d1);

  // Get current preferences
  const [customer] = await db
    .select()
    .from(loyaltyCustomerTable)
    .where(eq(loyaltyCustomerTable.id, loyaltyCustomerId))
    .limit(1);

  if (!customer) {
    throw new Error("Loyalty customer not found");
  }

  const currentPrefs = JSON.parse(customer.notificationPreferences);
  const newPrefs = { ...currentPrefs, ...preferences };

  await db
    .update(loyaltyCustomerTable)
    .set({
      notificationPreferences: JSON.stringify(newPrefs),
    })
    .where(eq(loyaltyCustomerTable.id, loyaltyCustomerId));
}
