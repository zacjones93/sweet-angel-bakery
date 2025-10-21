# Loyalty Program Implementation Plan

## Overview
Implement a customer loyalty program for Sweet Angel Bakery that provides early access to product drops, order history, and personalized notifications.

## Requirements Summary

### User-Facing Features
- **Storefront Navigation**: Login/Sign-in links
- **Profile Page**: Display past orders for loyalty members
- **Checkout Integration**: Email capture with optional phone number
- **Loyalty Benefits**:
  - Early access to scheduled product drops (before public)
  - Email notifications for new flavors
  - SMS notifications for deliveries (optional)
  - Order history tracking

### Business Logic
- Product drops with scheduled release times
- Loyalty member early access window
- Limited supply inventory management
- Notification system for drops and new products

## Database Schema Changes

### New Tables

#### 1. `loyaltyCustomer` Table
```typescript
{
  id: string              // lcust_* prefix
  userId: string | null   // Link to user table if they create account
  email: string           // Required
  phone: string | null    // Optional for SMS
  firstName: string
  lastName: string
  joinedAt: timestamp
  emailVerified: boolean
  phoneVerified: boolean
  notificationPreferences: {
    emailNewFlavors: boolean
    emailDrops: boolean
    smsDelivery: boolean
    smsDrops: boolean
  }
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 2. `order` Table
```typescript
{
  id: string                    // ord_* prefix
  loyaltyCustomerId: string     // FK to loyaltyCustomer
  stripePaymentIntentId: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled'
  items: JSON                   // Array of {productId, variantId, quantity, price}
  subtotal: number
  tax: number
  total: number
  pickupTime: timestamp | null
  deliveryAddress: string | null
  notes: string | null
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 3. `productDrop` Table
```typescript
{
  id: string                    // drop_* prefix
  name: string
  description: string
  loyaltyEarlyAccessStart: timestamp  // When loyalty members can access
  publicReleaseStart: timestamp       // When public can access
  endTime: timestamp | null           // Optional end time
  status: 'scheduled' | 'loyalty_active' | 'public_active' | 'ended'
  notificationSent: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 4. `productDropItem` Table
```typescript
{
  id: string              // dropi_* prefix
  dropId: string          // FK to productDrop
  productId: string       // FK to product
  variantId: string | null // FK to productVariant
  limitedQuantity: number
  remainingQuantity: number
  maxPerCustomer: number
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Schema Updates to Existing Tables

#### `product` Table - Add fields:
```typescript
{
  isNewFlavor: boolean          // Flag for "new flavor" notifications
  newFlavorUntil: timestamp | null  // Auto-unflag after date
}
```

## User Flows

### 1. Guest Checkout with Loyalty Sign-up
```
1. Customer adds items to cart
2. Proceeds to checkout
3. Checkout form shows:
   - Email (required) - "Join our loyalty program for early access to drops, order history, and notifications!"
   - Phone (optional) - "Get SMS updates on your order and special drops"
   - Delivery/pickup details
   - Payment
4. On successful payment:
   - Create loyaltyCustomer record
   - Create order record
   - Send confirmation email
   - If phone provided: Send SMS confirmation
5. Email includes link to "Create account to view orders anytime"
```

### 2. Loyalty Member Login
```
1. Click "Login" in navigation
2. Options:
   - "Have an account? Sign in"
   - "Loyalty member? Sign in with email" (magic link)
   - "New here? Sign up"
3. Magic link flow:
   - Enter email
   - Send magic link to email
   - Click link → authenticated
   - Redirect to profile/orders
```

### 3. Profile Page (Authenticated Loyalty Member)
```
- Order history (chronological, with status)
- Notification preferences
- Personal information update
- Upcoming product drops (if any scheduled)
```

### 4. Product Drop Access Flow
```
Scheduled Drop Timeline:
  - 48h before public: Send notification to loyalty members
  - Loyalty early access: 24h before public release
  - Public release: Everyone can purchase
  - Track remaining quantity in real-time

During Loyalty Window:
  - Show "Loyalty Member Early Access" badge
  - Non-members see countdown to public release

During Public Release:
  - Show remaining quantity
  - Show "Limited Supply - X remaining"
```

## Technical Implementation

### Phase 1: Database & Auth Foundation
**Files to create/modify:**
- `src/db/schema.ts` - Add new tables
- Generate migration: `pnpm db:generate add-loyalty-program`
- `src/utils/auth.ts` - Add magic link authentication
- `src/utils/loyalty-auth.ts` - Loyalty customer auth helpers

### Phase 2: Checkout Flow Integration
**New/modified files:**
- `src/app/(storefront)/checkout/page.tsx` - Add loyalty signup
- `src/app/(storefront)/checkout/_components/checkout-form.tsx`
- `src/app/(storefront)/checkout/actions.ts` - Create order + loyalty customer
- `src/components/navigation.tsx` - Add login/signup links

### Phase 3: Profile & Orders
**New routes:**
- `src/app/(storefront)/profile/page.tsx` - Profile overview
- `src/app/(storefront)/profile/orders/page.tsx` - Order history
- `src/app/(storefront)/profile/settings/page.tsx` - Notification preferences
- `src/app/(storefront)/login/page.tsx` - Magic link login
- `src/app/(storefront)/signup/page.tsx` - Full account creation

**Components:**
- `src/app/(storefront)/profile/_components/order-card.tsx`
- `src/app/(storefront)/profile/_components/notification-settings.tsx`

### Phase 4: Product Drops
**New routes:**
- `src/app/(admin)/admin/drops/page.tsx` - Admin drop management
- `src/app/(admin)/admin/drops/create/page.tsx` - Create drop
- `src/app/(admin)/admin/drops/[dropId]/page.tsx` - Edit drop
- `src/app/(storefront)/drops/page.tsx` - Public drops listing
- `src/app/(storefront)/drops/[dropId]/page.tsx` - Drop detail page

**Actions:**
- `src/app/(admin)/admin/_actions/drops.action.ts` - CRUD operations
- `src/app/(storefront)/drops/actions.ts` - Public drop access

**Background Jobs:**
- `src/cron/check-drops.ts` - Update drop statuses based on time
- `src/cron/send-drop-notifications.ts` - Send notifications to loyalty members

### Phase 5: Notifications
**New files:**
- `src/lib/notifications/email.ts` - Email notification helpers
- `src/lib/notifications/sms.ts` - SMS notification helpers (Twilio/similar)
- `src/emails/drop-announcement.tsx` - Drop notification email template
- `src/emails/new-flavor.tsx` - New flavor email template
- `src/emails/order-confirmation.tsx` - Order confirmation template
- `src/emails/magic-link.tsx` - Login magic link template

**Environment variables needed:**
```
# SMS Provider (e.g., Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Email already configured (Resend/Brevo)
# Use existing email setup
```

## Security Considerations

### Magic Link Authentication
- Token stored in KV with 15-minute expiration
- One-time use tokens (delete after use)
- Rate limiting on magic link requests (max 3 per hour per email)
- CSRF protection on token redemption

### Data Privacy
- Phone numbers encrypted at rest
- Email verification required before sending marketing emails
- SMS opt-in required (double opt-in recommended)
- Unsubscribe links in all emails
- GDPR/privacy policy compliance

### Drop Access Control
- Server-side timestamp validation (don't trust client)
- Verify loyalty member status on every add-to-cart
- Prevent cart manipulation for early access
- Rate limiting on drop purchases to prevent bots

## Cloudflare Integration

### KV Usage
- Magic link tokens: `magic_link:{token}` → `{email, expiresAt}`
- Drop cache: Cache active drop status to reduce D1 queries

### Queues (Future Enhancement)
- `notification-queue` - Process email/SMS sends asynchronously
- `drop-status-queue` - Update drop statuses on schedule

### Cron Triggers (wrangler.jsonc)
```json
{
  "triggers": {
    "crons": [
      "*/15 * * * *"  // Check drop status every 15 minutes
    ]
  }
}
```

## Notification Strategy

### Drop Announcements
**Loyalty Members (48h before public):**
- Email: "🎉 Early Access: New Drop Alert!"
- SMS (if opted in): "Early access starts in 24h: [Drop Name]"

**Public (at release):**
- General announcement on homepage
- Social media posts (external)

### New Flavor Notifications
**Loyalty Members Only:**
- Email: "New Flavor Alert: [Flavor Name]"
- Batched weekly if multiple new flavors

### Order Updates
**All Customers:**
- Email: Order confirmation, ready for pickup, delivered
- SMS (if opted in): Status updates

## Admin Features

### Drop Management Dashboard
- Create/edit scheduled drops
- Set loyalty vs public release times
- Assign products/variants to drops
- Set inventory limits
- View drop analytics (conversion, remaining inventory)
- Send test notifications

### Loyalty Member Management
- View all loyalty members
- Filter by join date, notification preferences
- Export email lists for campaigns
- View customer order history

## API Routes Needed

### Customer-Facing
- `POST /api/loyalty/signup` - Create loyalty customer
- `POST /api/loyalty/magic-link` - Request magic link
- `GET /api/loyalty/verify-token` - Verify magic link token
- `GET /api/loyalty/orders` - Get customer orders
- `PATCH /api/loyalty/preferences` - Update notification preferences

### Admin
- `GET /api/admin/drops` - List all drops
- `POST /api/admin/drops` - Create drop
- `PATCH /api/admin/drops/[dropId]` - Update drop
- `DELETE /api/admin/drops/[dropId]` - Delete drop
- `POST /api/admin/drops/[dropId]/notify` - Send notifications

## Metrics & Analytics

### Track These Metrics
- Loyalty signup conversion rate (checkout → signup)
- Drop participation (loyalty vs public)
- Email open rates for drop announcements
- SMS delivery and click rates
- Customer lifetime value (loyalty vs non-loyalty)
- Average orders per loyalty member

### Admin Dashboard Stats
- Total loyalty members
- Growth rate (weekly/monthly)
- Active drops
- Upcoming drops
- Most popular products in drops

## Implementation Phases

### MVP (Phase 1-2) - 2-3 weeks
- Basic loyalty signup at checkout
- Order storage and confirmation emails
- Simple profile page with order history

### Enhanced (Phase 3-4) - 2-3 weeks
- Magic link authentication
- Product drops with loyalty early access
- Admin drop management

### Complete (Phase 5) - 1-2 weeks
- Full notification system (email + SMS)
- New flavor notifications
- Advanced preferences
- Analytics dashboard

## Testing Checklist

### Checkout Flow
- [ ] Guest checkout creates loyalty customer
- [ ] Email validation works
- [ ] Phone number is optional
- [ ] Order confirmation sent
- [ ] SMS sent if phone provided

### Authentication
- [ ] Magic link sent to correct email
- [ ] Token expires after 15 minutes
- [ ] Token is one-time use
- [ ] Rate limiting prevents spam
- [ ] Session created on successful auth

### Product Drops
- [ ] Loyalty members see products during early access
- [ ] Non-members see countdown
- [ ] Public release works correctly
- [ ] Inventory decrements correctly
- [ ] Sold out state handled properly

### Notifications
- [ ] Drop notifications sent at correct times
- [ ] New flavor notifications work
- [ ] Unsubscribe works
- [ ] Email preferences respected
- [ ] SMS opt-in/opt-out works

## Open Questions

1. **SMS Provider**: Use Twilio, AWS SNS, or other?
2. **Magic Link vs Password**: Should we support both or magic link only?
3. **Loyalty Tiers**: Future enhancement for VIP/points system?
4. **Referral Program**: Should loyalty members get referral bonuses?
5. **Drop Notifications**: Push notifications via web push in addition to email/SMS?
6. **International**: Phone number format validation for international numbers?

## Next Steps

1. Review this plan and confirm requirements
2. Set up SMS provider account (if approved)
3. Start with Phase 1 implementation
4. Create database migrations
5. Build out checkout flow integration
