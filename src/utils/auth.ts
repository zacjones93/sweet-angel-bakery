import "server-only";

import { ROLES_ENUM, userTable } from "@/db/schema";
import { init } from "@paralleldrive/cuid2";
import { encodeHexLowerCase } from "@oslojs/encoding"
import ms from "ms"
import { getDB } from "@/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import isProd from "@/utils/is-prod";
import {
  createKVSession,
  deleteKVSession,
  type KVSession,
  type CreateKVSessionParams,
  getKVSession,
  updateKVSession,
  CURRENT_SESSION_VERSION
} from "./kv-session";
import { cache } from "react"
import type { SessionValidationResult } from "@/types";
import { SESSION_COOKIE_NAME } from "@/constants";
import { ZSAError } from "zsa";
import { getInitials } from "./name-initials";

const getSessionLength = () => {
  return ms("30d");
}

/**
 * This file is based on https://lucia-auth.com
 */

export async function getUserFromDB(userId: string) {
  const db = getDB();
  return await db.query.userTable.findFirst({
    where: eq(userTable.id, userId),
    columns: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      emailVerified: true,
      avatar: true,
      phone: true,
      phoneVerified: true,
      notificationPreferences: true,
      streetAddress1: true,
      streetAddress2: true,
      city: true,
      state: true,
      zipCode: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

const createId = init({
  length: 32,
});

export function generateSessionToken(): string {
  return createId();
}

async function generateSessionId(token: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return encodeHexLowerCase(new Uint8Array(hashBuffer));
}

function encodeSessionCookie(userId: string, token: string): string {
  return `${userId}:${token}`;
}

function decodeSessionCookie(cookie: string): { userId: string; token: string } | null {
  const parts = cookie.split(':');
  if (parts.length !== 2) return null;
  return { userId: parts[0], token: parts[1] };
}

interface CreateSessionParams extends Pick<CreateKVSessionParams, "authenticationType" | "passkeyCredentialId" | "userId"> {
  token: string;
}

export async function getUserTeamsWithPermissions() {
  // Bakery doesn't use teams - return empty array
  return [];
}

export async function createSession({
  token,
  userId,
  authenticationType,
  passkeyCredentialId
}: CreateSessionParams): Promise<KVSession> {
  const sessionId = await generateSessionId(token);
  const expiresAt = new Date(Date.now() + getSessionLength());

  const user = await getUserFromDB(userId);

  if (!user) {
    throw new Error("User not found");
  }


  return createKVSession({
    sessionId,
    userId,
    expiresAt,
    user,
    authenticationType,
    passkeyCredentialId
  });
}

export async function createAndStoreSession(
  userId: string,
  authenticationType?: CreateKVSessionParams["authenticationType"],
  passkeyCredentialId?: CreateKVSessionParams["passkeyCredentialId"]
) {
  const sessionToken = generateSessionToken();
  const session = await createSession({
    token: sessionToken,
    userId,
    authenticationType,
    passkeyCredentialId
  });
  await setSessionTokenCookie({
    token: sessionToken,
    userId,
    expiresAt: new Date(session.expiresAt)
  });
}

async function validateSessionToken(token: string, userId: string): Promise<SessionValidationResult | null> {
  const sessionId = await generateSessionId(token);

  const session = await getKVSession(sessionId, userId);

  if (!session) return null;

  // If the session has expired, delete it and return null
  if (Date.now() >= session.expiresAt) {
    await deleteKVSession(sessionId, userId);
    return null;
  }

  // Check if session version needs to be updated
  if (!session.version || session.version !== CURRENT_SESSION_VERSION) {
    const updatedSession = await updateKVSession(sessionId, userId, new Date(session.expiresAt));

    if (!updatedSession) {
      return null;
    }

    // Update the user initials
    updatedSession.user.initials = getInitials(`${updatedSession.user.firstName} ${updatedSession.user.lastName}`);

    return updatedSession;
  }

  // Update the user initials
  session.user.initials = getInitials(`${session.user.firstName} ${session.user.lastName}`);

  // Return the user data directly from the session
  return session;
}

export async function invalidateSession(sessionId: string, userId: string): Promise<void> {
  await deleteKVSession(sessionId, userId);
}

interface SetSessionTokenCookieParams {
  token: string;
  userId: string;
  expiresAt: Date;
}

export async function setSessionTokenCookie({ token, userId, expiresAt }: SetSessionTokenCookieParams): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encodeSessionCookie(userId, token), {
    httpOnly: true,
    sameSite: isProd ? "strict" : "lax",
    secure: isProd,
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteSessionTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * This function can only be called in a Server Components, Server Action or Route Handler
 */
export const getSessionFromCookie = cache(async (): Promise<SessionValidationResult | null> => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  const decoded = decodeSessionCookie(sessionCookie);

  if (!decoded || !decoded.token || !decoded.userId) {
    return null;
  }

  return validateSessionToken(decoded.token, decoded.userId);
})

export const requireVerifiedEmail = cache(async ({
  doNotThrowError = false,
}: {
  doNotThrowError?: boolean;
} = {}) => {
  const session = await getSessionFromCookie();

  if (!session) {
    if (doNotThrowError) {
      return null;
    }

    throw new ZSAError("NOT_AUTHORIZED", "Not authenticated");
  }

  if (!session?.user?.emailVerified) {
    if (doNotThrowError) {
      return null;
    }

    throw new ZSAError("FORBIDDEN", "Please verify your email first");
  }

  return session;
});

export const requireAdmin = cache(async ({
  doNotThrowError = false,
}: {
  doNotThrowError?: boolean;
} = {}) => {
  const session = await getSessionFromCookie();

  if (!session) {
    if (doNotThrowError) {
      return null;
    }

    throw new ZSAError("NOT_AUTHORIZED", "Not authenticated");
  }

  if (session.user.role !== ROLES_ENUM.ADMIN) {
    if (doNotThrowError) {
      return null;
    }

    throw new ZSAError("FORBIDDEN", "Not authorized");
  }

  return session;
});

interface DisposableEmailResponse {
  disposable: string;
}

interface MailcheckResponse {
  status: number;
  email: string;
  domain: string;
  mx: boolean;
  disposable: boolean;
  public_domain: boolean;
  relay_domain: boolean;
  alias: boolean;
  role_account: boolean;
  did_you_mean: string | null;
}

type ValidatorResult = {
  success: boolean;
  isDisposable: boolean;
};

/**
 * Checks if an email is disposable using debounce.io
 */
async function checkWithDebounce(email: string): Promise<ValidatorResult> {
  try {
    const response = await fetch(`https://disposable.debounce.io/?email=${encodeURIComponent(email)}`);

    if (!response.ok) {
      console.error("Debounce.io API error:", response.status);
      return { success: false, isDisposable: false };
    }

    const data = await response.json() as DisposableEmailResponse;

    return { success: true, isDisposable: data.disposable === "true" };
  } catch (error) {
    console.error("Failed to check disposable email with debounce.io:", error);
    return { success: false, isDisposable: false };
  }
}

/**
 * Checks if an email is disposable using mailcheck.ai
 */
async function checkWithMailcheck(email: string): Promise<ValidatorResult> {
  try {
    const response = await fetch(`https://api.mailcheck.ai/email/${encodeURIComponent(email)}`);

    if (!response.ok) {
      console.error("Mailcheck.ai API error:", response.status);
      return { success: false, isDisposable: false };
    }

    const data = await response.json() as MailcheckResponse;
    return { success: true, isDisposable: data.disposable };
  } catch (error) {
    console.error("Failed to check disposable email with mailcheck.ai:", error);
    return { success: false, isDisposable: false };
  }
}


/**
 * Checks if an email is allowed for sign up by verifying it's not a disposable email
 * Uses multiple services in sequence for redundancy.
 *
 * @throws {ZSAError} If email is disposable or if all services fail
 */
export async function canSignUp({ email }: { email: string }): Promise<void> {
  // Skip disposable email check in development
  if (!isProd) {
    return;
  }

  const validators = [
    checkWithDebounce,
    checkWithMailcheck,
  ];

  for (const validator of validators) {
    const result = await validator(email);

    // If the validator failed (network error, rate limit, etc), try the next one
    if (!result.success) {
      continue;
    }

    // If we got a successful response and it's disposable, reject the signup
    if (result.isDisposable) {
      throw new ZSAError(
        "PRECONDITION_FAILED",
        "Disposable email addresses are not allowed"
      );
    }

    // If we got a successful response and it's not disposable, allow the signup
    return;
  }

  // If all validators failed, we can't verify the email
  throw new ZSAError(
    "PRECONDITION_FAILED",
    "Unable to verify email address at this time. Please try again later."
  );
}

/**
 * Create a magic link token for email-based authentication
 * Used for storefront customer authentication
 */
export async function createMagicLinkToken({
  email,
  kv,
  callback,
}: {
  email: string;
  kv: KVNamespace;
  callback?: string;
}): Promise<string> {
  const token = createId();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  await kv.put(
    `magic_link:${token}`,
    JSON.stringify({ email, expiresAt, callback }),
    { expirationTtl: Math.floor(15 * 60) }
  );

  return token;
}

/**
 * Verify magic link and create session for the user
 * Returns userId and optional callback URL
 */
export async function verifyMagicLinkAndCreateSession({
  token,
  kv,
}: {
  token: string;
  kv: KVNamespace;
}): Promise<{ userId: string; callback?: string } | null> {
  const data = await kv.get(`magic_link:${token}`);
  if (!data) return null;

  const { email, expiresAt, callback } = JSON.parse(data);

  if (Date.now() > expiresAt) {
    await kv.delete(`magic_link:${token}`);
    return null;
  }

  // Delete token (one-time use)
  await kv.delete(`magic_link:${token}`);

  // Find user by email
  const db = getDB();
  const user = await db.query.userTable.findFirst({
    where: eq(userTable.email, email),
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Create standard session using the unified auth system
  await createAndStoreSession(user.id, "magic-link");

  return { userId: user.id, callback };
}

/**
 * Find or create user from checkout/signup
 * Used when customers create accounts during checkout or signup
 */
export async function findOrCreateUser({
  email,
  firstName,
  lastName,
  phone,
}: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<{ id: string; email: string; firstName: string | null; lastName: string | null }> {
  const db = getDB();

  // Try to find existing user
  const [existing] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    // Update phone if provided and not already set
    if (phone && !existing.phone) {
      const [updated] = await db
        .update(userTable)
        .set({ phone })
        .where(eq(userTable.id, existing.id))
        .returning({
          id: userTable.id,
          email: userTable.email,
          firstName: userTable.firstName,
          lastName: userTable.lastName,
        });
      return updated as { id: string; email: string; firstName: string | null; lastName: string | null };
    }
    return {
      id: existing.id,
      email: existing.email as string,
      firstName: existing.firstName,
      lastName: existing.lastName,
    };
  }

  // Create new user
  const [newUser] = await db
    .insert(userTable)
    .values({
      email: email.toLowerCase(),
      firstName: firstName || email.split("@")[0],
      lastName: lastName || "",
      phone: phone || null,
      role: "user",
      emailVerified: null, // Will verify via magic link
      phoneVerified: 0,
    })
    .returning({
      id: userTable.id,
      email: userTable.email,
      firstName: userTable.firstName,
      lastName: userTable.lastName,
    });

  return newUser as { id: string; email: string; firstName: string | null; lastName: string | null };
}
