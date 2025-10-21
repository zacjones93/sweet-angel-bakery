# User Table Consolidation Plan

## Problem Statement

We currently have two parallel user/customer systems that create confusion and limit functionality:

### Current State

1. **`userTable`** - Used for admin accounts and traditional authentication

   - Created via `/sign-up` (auth flow)
   - Supports password, passkey, and OAuth authentication
   - Has `role` field for admin access
   - Uses standard session system (`auth.ts`, `kv-session.ts`)
   - Session cookie: `SESSION_COOKIE_NAME`

2. **`loyaltyCustomerTable`** - Used for storefront customers
   - Created via `/signup` (storefront flow) or during checkout
   - Magic link authentication only
   - Has notification preferences, phone numbers
   - Uses separate loyalty session system (`loyalty-auth.ts`)
   - Session cookie: `loyalty_session`

### The Problem

- When customers sign up via storefront, only a loyalty customer is created
- Admin functionality requires `session.user.role` from `userTable`
- Loyalty customers cannot access admin features even if promoted
- Two separate authentication systems to maintain
- Potential for duplicate records (same email in both tables)
- Order table references both `userId` AND `loyaltyCustomerId` causing confusion

## Solution: Unified User Table

Consolidate both tables into a single `userTable` that supports all user types and authentication methods.

### Design Principles

1. **Single source of truth** - One user record per person
2. **Multiple auth methods** - Support password, passkey, OAuth, AND magic link
3. **Role-based access** - Users can be customers, admins, or both
4. **Backward compatible** - Preserve existing functionality
5. **Data integrity** - No orphaned records or broken references

## Database Schema Changes (✅ Commit: b1c635d)

### Updated `userTable` Schema

```typescript
export const userTable = sqliteTable(
  "user",
  {
    ...commonColumns,
    id: text()
      .primaryKey()
      .$defaultFn(() => `usr_${createId()}`)
      .notNull(),

    // Basic info (existing + enhanced)
    firstName: text({ length: 255 }),
    lastName: text({ length: 255 }),
    email: text({ length: 255 }).unique(),

    // Authentication methods (existing)
    passwordHash: text(), // For password auth
    googleAccountId: text({ length: 255 }), // For OAuth
    // passkeys via passKeyCredentialTable   // For passkey auth

    // Role and verification (existing)
    role: text({ enum: roleTuple }).default(ROLES_ENUM.USER).notNull(),
    emailVerified: integer({ mode: "timestamp" }),

    // Sign up tracking (existing)
    signUpIpAddress: text({ length: 100 }),
    avatar: text({ length: 600 }),

    // NEW: Loyalty/storefront fields (from loyaltyCustomerTable)
    phone: text({ length: 50 }), // Customer phone number
    phoneVerified: integer().default(0).notNull(),

    // NEW: Notification preferences (from loyaltyCustomerTable)
    notificationPreferences: text({ length: 1000 })
      .default(
        '{"emailNewFlavors":true,"emailDrops":true,"smsDelivery":false,"smsDrops":false}'
      )
      .notNull(),
  },
  (table) => [
    index("email_idx").on(table.email),
    index("google_account_id_idx").on(table.googleAccountId),
    index("role_idx").on(table.role),
    // NEW indexes for phone lookup
    index("phone_idx").on(table.phone),
  ]
);
```

### Tables to Remove

- ❌ `loyaltyCustomerTable` - Merged into `userTable`

### Tables to Update

#### `orderTable`

```typescript
// BEFORE
{
  userId: text().references(() => userTable.id),           // nullable
  loyaltyCustomerId: text().references(() => loyaltyCustomerTable.id), // nullable
  // ... other fields
}

// AFTER
{
  userId: text().references(() => userTable.id),           // Required - all orders link to user
  // Remove loyaltyCustomerId field entirely
  // ... other fields
}
```

### Migration Strategy

#### Phase 1: Schema Update

1. Add new fields to `userTable`:

   - `phone`
   - `phoneVerified`
   - `notificationPreferences`

2. Update `orderTable`:
   - Make `userId` required (not null)
   - Keep `loyaltyCustomerId` temporarily for data migration

#### Phase 2: Data Migration

1. Migrate all loyalty customers to user table:

   ```sql
   -- For each loyalty customer that doesn't have a linked user
   INSERT INTO user (email, firstName, lastName, phone, phoneVerified, notificationPreferences, role, emailVerified)
   SELECT
     email,
     firstName,
     lastName,
     phone,
     phoneVerified,
     notificationPreferences,
     'user' as role,
     CASE WHEN emailVerified = 1 THEN datetime('now') ELSE NULL END as emailVerified
   FROM loyalty_customer
   WHERE userId IS NULL OR userId NOT IN (SELECT id FROM user);

   -- For loyalty customers that ARE linked to a user, merge the data
   UPDATE user
   SET
     phone = loyalty_customer.phone,
     phoneVerified = loyalty_customer.phoneVerified,
     notificationPreferences = loyalty_customer.notificationPreferences
   FROM loyalty_customer
   WHERE user.id = loyalty_customer.userId
     AND loyalty_customer.userId IS NOT NULL;
   ```

2. Update order references:

   ```sql
   -- Link orders via loyaltyCustomerId to the new user records
   UPDATE "order"
   SET userId = (
     SELECT u.id
     FROM user u
     WHERE u.email = (
       SELECT lc.email
       FROM loyalty_customer lc
       WHERE lc.id = "order".loyaltyCustomerId
     )
   )
   WHERE userId IS NULL
     AND loyaltyCustomerId IS NOT NULL;
   ```

3. Verify data integrity:

   ```sql
   -- Check for orphaned orders
   SELECT COUNT(*) FROM "order" WHERE userId IS NULL;

   -- Check for duplicate emails
   SELECT email, COUNT(*) FROM user GROUP BY email HAVING COUNT(*) > 1;
   ```

#### Phase 3: Schema Cleanup

1. Remove `loyaltyCustomerId` column from `orderTable`
2. Drop `loyalty_customer` table
3. Generate final migration: `pnpm db:generate consolidate-user-tables`

## Code Changes

### 1. Authentication System Updates

#### Consolidate Auth Functions (`src/utils/auth.ts`)

```typescript
// ADD: Magic link authentication support
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

// ADD: Verify magic link and create session
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

  // Create standard session
  await createAndStoreSession(user.id, "magic-link");

  return { userId: user.id, callback };
}

// ADD: Helper to get/create user from checkout
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
}): Promise<User> {
  const db = getDB();

  // Try to find existing user
  const [existing] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);

  if (existing) {
    // Update phone if provided and not already set
    if (phone && !existing.phone) {
      const [updated] = await db
        .update(userTable)
        .set({ phone })
        .where(eq(userTable.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  // Create new user
  const [newUser] = await db
    .insert(userTable)
    .values({
      email,
      firstName: firstName || email.split("@")[0],
      lastName: lastName || "",
      phone: phone || null,
      role: ROLES_ENUM.USER,
      emailVerified: null, // Will verify via magic link
      phoneVerified: 0,
    })
    .returning();

  return newUser;
}
```

#### Remove `src/utils/loyalty-auth.ts`

All functionality moved to `auth.ts`

### 2. Update Authentication Actions

#### Storefront Login (`src/app/(storefront)/login/_actions/request-magic-link.action.ts`)

```typescript
// BEFORE: Uses loyalty-specific functions
import { generateMagicLinkToken } from "@/utils/loyalty-auth";

// AFTER: Uses unified auth functions
import { createMagicLinkToken } from "@/utils/auth";
```

#### Storefront Signup (`src/app/(storefront)/signup/_actions/create-loyalty-customer.action.ts`)

**Rename to:** `src/app/(storefront)/signup/_actions/create-user.action.ts`

```typescript
"use server";

import { z } from "zod";
import { createServerAction } from "zsa";
import { getDB } from "@/db";
import { userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMagicLinkToken } from "@/utils/auth";
import { sendMagicLinkEmail } from "@/utils/email";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const createUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  notificationPreferences: z
    .object({
      emailNewFlavors: z.boolean().default(true),
      emailDrops: z.boolean().default(true),
      smsDelivery: z.boolean().default(false),
      smsDrops: z.boolean().default(false),
    })
    .optional(),
});

export const createUserAction = createServerAction()
  .input(createUserSchema)
  .handler(async ({ input }) => {
    const { env } = getCloudflareContext();
    const db = getDB();

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, input.email.toLowerCase()))
      .limit(1);

    if (existingUser) {
      throw new Error(
        "An account with this email already exists. Please login instead."
      );
    }

    // Create user
    const notificationPrefs = input.notificationPreferences || {
      emailNewFlavors: true,
      emailDrops: true,
      smsDelivery: false,
      smsDrops: false,
    };

    const [user] = await db
      .insert(userTable)
      .values({
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone || null,
        emailVerified: null,
        phoneVerified: 0,
        role: ROLES_ENUM.USER,
        notificationPreferences: JSON.stringify(notificationPrefs),
      })
      .returning();

    if (!env.NEXT_INC_CACHE_KV) {
      throw new Error("KV namespace not available");
    }

    // Generate magic link token
    const token = await createMagicLinkToken({
      email: user.email,
      kv: env.NEXT_INC_CACHE_KV,
    });

    // Send welcome email with login link
    await sendMagicLinkEmail({
      email: user.email,
      magicToken: token,
      customerName: `${user.firstName} ${user.lastName}`,
    });

    return {
      success: true,
      email: user.email,
      firstName: user.firstName,
    };
  });
```

#### Verify Magic Link (`src/app/(storefront)/login/_actions/verify-magic-link.action.ts`)

```typescript
"use server";

import { createServerAction } from "zsa";
import { z } from "zod";
import { verifyMagicLinkAndCreateSession } from "@/utils/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const verifyMagicLinkInputSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const verifyMagicLinkAction = createServerAction()
  .input(verifyMagicLinkInputSchema)
  .handler(async ({ input }) => {
    const { env } = await getCloudflareContext();

    // Verify the magic link token and create session
    const result = await verifyMagicLinkAndCreateSession({
      token: input.token,
      kv: env.NEXT_INC_CACHE_KV,
    });

    if (!result) {
      throw new Error("Invalid or expired login link");
    }

    return {
      success: true,
      callback: result.callback,
    };
  });
```

### 3. Update Checkout Flow

#### Checkout Actions (`src/app/(storefront)/checkout/actions.ts`)

```typescript
// BEFORE: References loyaltyCustomerTable
import { findOrCreateLoyaltyCustomer } from "@/utils/loyalty-auth";

// Create order
const [order] = await db.insert(orderTable).values({
  loyaltyCustomerId: customer.id,
  // ...
});

// AFTER: References userTable
import { findOrCreateUser } from "@/utils/auth";

// Create/get user
const user = await findOrCreateUser({
  email: input.email,
  firstName: input.firstName,
  lastName: input.lastName,
  phone: input.phone,
});

// Create order
const [order] = await db.insert(orderTable).values({
  userId: user.id, // Now required, not optional
  // ...
});
```

### 4. Update Profile/Settings Pages

#### Profile Page (`src/app/(storefront)/profile/page.tsx`)

```typescript
// BEFORE: Gets loyalty customer from separate system
import { getLoyaltyCustomerFromSession } from "@/utils/loyalty-auth";

// AFTER: Gets user from standard session
import { getSessionFromCookie } from "@/utils/auth";

export default async function ProfilePage() {
  const session = await getSessionFromCookie();

  if (!session) {
    redirect("/login");
  }

  const { user } = session;
  // user now has all the fields we need
}
```

#### Notification Settings (`src/app/(storefront)/profile/settings/_actions/update-preferences.action.ts`)

```typescript
// BEFORE: Updates loyaltyCustomerTable
await db
  .update(loyaltyCustomerTable)
  .set({ notificationPreferences: JSON.stringify(newPrefs) })
  .where(eq(loyaltyCustomerTable.id, loyaltyCustomerId));

// AFTER: Updates userTable
await db
  .update(userTable)
  .set({ notificationPreferences: JSON.stringify(newPrefs) })
  .where(eq(userTable.id, userId));
```

### 5. Update Admin Pages

#### Admin User Management (`src/app/(admin)/admin/users/page.tsx`)

Now shows ALL users (customers + admins) with their notification preferences visible.

### 6. Session Management

#### Single Session Cookie

- Remove `loyalty_session` cookie entirely
- Use only `SESSION_COOKIE_NAME` cookie for all authentication
- Session data already includes all user fields from `userTable`

## File Changes Summary

### Files to Delete

- ❌ `src/utils/loyalty-auth.ts`
- ❌ `src/app/(storefront)/signup/_actions/create-loyalty-customer.action.ts`

### Files to Create

- ✅ `src/app/(storefront)/signup/_actions/create-user.action.ts`

### Files to Update

- 📝 `src/db/schema.ts` - Add fields to userTable, remove loyaltyCustomerTable
- 📝 `src/utils/auth.ts` - Add magic link functions
- 📝 `src/app/(storefront)/login/_actions/request-magic-link.action.ts`
- 📝 `src/app/(storefront)/login/_actions/verify-magic-link.action.ts`
- 📝 `src/app/(storefront)/checkout/actions.ts`
- 📝 `src/app/(storefront)/profile/page.tsx`
- 📝 `src/app/(storefront)/profile/orders/page.tsx`
- 📝 `src/app/(storefront)/profile/settings/page.tsx`
- 📝 `src/app/(storefront)/profile/settings/_actions/update-preferences.action.ts`
- 📝 `src/app/(storefront)/signup/page.tsx` - Update imports
- 📝 `src/app/api/webhooks/stripe/route.ts` - Update order creation
- 📝 `src/react-email/magic-link.tsx` - Update email template (if needed)
- 📝 All admin pages that display user data

### Type Updates

```typescript
// Remove from types
export type LoyaltyCustomer = InferSelectModel<typeof loyaltyCustomerTable>; // DELETE

// User type now includes everything
export type User = InferSelectModel<typeof userTable>; // Already exported
```

## Migration Checklist

### Pre-Migration

- [ ] Backup production database
- [ ] Document current user counts (user table + loyalty customer table)
- [ ] Test migration script on development database
- [ ] Verify no duplicate emails across both tables

### Schema Migration (Phase 1)

- [ ] Add new fields to `userTable` schema
- [ ] Update `orderTable` schema (keep both userId and loyaltyCustomerId temporarily)
- [ ] Run: `pnpm db:generate add-user-fields`
- [ ] Apply migration to development
- [ ] Apply migration to production

### Data Migration (Phase 2)

- [ ] Create migration script for data transfer
- [ ] Test on development database
- [ ] Verify all loyalty customers migrated
- [ ] Verify all orders have valid userId
- [ ] Check for orphaned records
- [ ] Apply to production (during low-traffic period)

### Code Deployment (Phase 3)

- [ ] Update all authentication code
- [ ] Update all profile/settings pages
- [ ] Update checkout flow
- [ ] Update admin pages
- [ ] Test all authentication methods:
  - [ ] Password login
  - [ ] Passkey login
  - [ ] Google OAuth
  - [ ] Magic link login
- [ ] Test storefront signup flow
- [ ] Test checkout as guest
- [ ] Test profile page access
- [ ] Test admin access
- [ ] Deploy to production

### Schema Cleanup (Phase 4)

- [ ] Monitor for 7 days - ensure no issues
- [ ] Remove `loyaltyCustomerId` from `orderTable`
- [ ] Drop `loyalty_customer` table
- [ ] Run: `pnpm db:generate remove-loyalty-customer-table`
- [ ] Apply final migration

### Post-Migration Verification

- [ ] Verify all users can log in
- [ ] Verify orders display correctly
- [ ] Verify notification preferences preserved
- [ ] Verify admin access works
- [ ] Check for any broken references in logs
- [ ] Monitor error logs for 48 hours

## Benefits of Consolidation

### Technical

1. **Single authentication system** - Easier to maintain and debug
2. **Consistent session management** - One cookie, one system
3. **Simplified data model** - No duplicate user records
4. **Better type safety** - One User type throughout codebase
5. **Clearer code** - No confusion about which table to use

### Business

1. **Unified user view** - See all customer data in one place
2. **Role flexibility** - Customers can become admins seamlessly
3. **Better analytics** - All user behavior in one table
4. **Simplified onboarding** - One signup flow does it all
5. **Account linking** - No need to merge accounts later

### User Experience

1. **Consistent authentication** - Same system across site
2. **Single account** - One email, one account
3. **Seamless upgrade path** - Customers can set passwords/passkeys later
4. **Unified profile** - All data in one place

## Rollback Plan

If issues arise, rollback procedure:

1. **Revert code deployment** - Roll back to previous version
2. **Restore session handling** - Both systems running in parallel
3. **Restore loyaltyCustomer table** - From backup if dropped
4. **Restore order.loyaltyCustomerId column** - From backup if dropped
5. **Verify system stability**
6. **Investigate issues** before re-attempting

## Testing Strategy

### Unit Tests

- [ ] Test `findOrCreateUser` function
- [ ] Test `createMagicLinkToken` function
- [ ] Test `verifyMagicLinkAndCreateSession` function
- [ ] Test session validation with new user fields

### Integration Tests

- [ ] Test complete signup flow (storefront)
- [ ] Test complete login flow (magic link)
- [ ] Test complete checkout flow (guest → user creation)
- [ ] Test order creation with userId
- [ ] Test profile page data display
- [ ] Test notification preferences update

### E2E Tests

- [ ] Guest checkout → receives magic link → logs in → sees order
- [ ] New signup → verify email → access profile
- [ ] Existing user → magic link login → see all orders
- [ ] Admin user → access admin panel → manage users
- [ ] Customer → update preferences → verify saved

## Timeline Estimate

- **Phase 1 (Schema Update)**: 1-2 hours
- **Phase 2 (Data Migration)**: 2-4 hours (depends on data volume)
- **Phase 3 (Code Updates)**: 8-12 hours
- **Phase 4 (Testing)**: 4-6 hours
- **Phase 5 (Deployment)**: 2-3 hours
- **Phase 6 (Schema Cleanup)**: 1 hour (after monitoring)

**Total**: ~3-4 days with testing and monitoring

## Open Questions

1. **Email verification**: Should magic link login mark email as verified?

   - **Recommendation**: Yes, clicking magic link proves email ownership

2. **Password setting**: Should storefront users be able to set passwords later?

   - **Recommendation**: Yes, add "Set Password" option in profile settings

3. **Phone verification**: How do we verify phone numbers?

   - **Recommendation**: SMS verification code (future enhancement)

4. **Admin promotion**: How do we promote regular users to admin?

   - **Recommendation**: Admin panel → User Management → Edit Role

5. **Notification defaults**: Should existing users without preferences get defaults?
   - **Recommendation**: Yes, apply default preferences during migration

## Success Criteria

✅ All users have migrated to unified table
✅ All authentication methods work correctly
✅ All orders correctly reference users
✅ No duplicate user records
✅ Admin access works for promoted users
✅ Notification preferences preserved
✅ No broken sessions after deployment
✅ Zero data loss during migration
✅ Performance maintained or improved
✅ Code complexity reduced

## Next Steps

1. Review and approve this plan
2. Create feature branch: `feat/consolidate-user-tables`
3. Start with Phase 1 (Schema Update)
4. Test thoroughly in development
5. Schedule production deployment window
6. Execute migration plan
7. Monitor closely for 7 days
8. Complete schema cleanup
9. Update documentation
10. Close migration project
