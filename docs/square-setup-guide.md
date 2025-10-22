# Square Setup Guide

**Purpose**: Step-by-step guide to configure Square for Sweet Angel Bakery
**Date**: 2025-10-22
**Related**: `docs/merchant-provider-implementation-summary.md`

## Overview

This guide walks you through setting up Square as a payment provider, including account creation, API credentials, webhook configuration, and testing.

---

## Step 1: Create Square Account

### Production Account
1. Go to [squareup.com/signup](https://squareup.com/signup)
2. Choose "Get Started" for selling online
3. Fill in business information:
   - Business name: **Sweet Angel Bakery**
   - Business type: Food & Beverage (Bakery)
   - Location: Boise/Caldwell, Idaho
4. Complete business verification
5. Add bank account for payouts

### Sandbox Account (For Testing)
1. Go to [developer.squareup.com/apps](https://developer.squareup.com/apps)
2. Sign in (or create developer account)
3. Sandbox is automatically created with your account
4. Sandbox uses test credit cards (no real money)

**Recommendation**: Start with sandbox for development/testing

---

## Step 2: Create Application

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Click **"+ Create App"** or select existing app
3. Fill in details:
   - **Application Name**: Sweet Angel Bakery (or similar)
   - **Description**: E-commerce checkout for bakery
4. Click **"Save"**

---

## Step 3: Get API Credentials

### Access Token

1. In your app dashboard, click **"Credentials"** in left sidebar
2. You'll see two sections:
   - **Sandbox** - For testing
   - **Production** - For live payments

#### Sandbox Credentials (Development)
1. Under "Sandbox" section:
2. Copy **"Sandbox Access Token"**
   - Format: `EAAAl...` (starts with EAAA)
   - This is your `SQUARE_ACCESS_TOKEN` for testing

#### Production Credentials (When Ready)
1. Under "Production" section:
2. Copy **"Production Access Token"**
   - Format: `EAAAl...`
   - This is your `SQUARE_ACCESS_TOKEN` for production

**⚠️ Security**: Never commit access tokens to git!

### Location ID

1. In Square Developer Dashboard, go to **"Locations"**
2. You'll see your business location(s)
3. Copy the **Location ID**
   - Format: `L...` or `LK...`
   - This is your `SQUARE_LOCATION_ID`

**Note**: If you don't see locations, you may need to set one up in your main Square account first.

---

## Step 4: Configure Webhooks

Webhooks notify your app when payments are completed.

### 1. Create Webhook Endpoint

In your application, you'll need to create a webhook route:

**File**: `src/app/api/webhooks/square/route.ts`

```typescript
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getMerchantProvider } from "@/lib/merchant-provider/factory";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("x-square-hmacsha256-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing webhook signature" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!webhookSecret) {
    console.error("Missing SQUARE_WEBHOOK_SIGNATURE_KEY");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  try {
    const provider = await getMerchantProvider();

    // Verify webhook signature and parse event
    const event = await provider.verifyWebhook(body, signature);

    console.log(`[Square Webhook] Handling ${event.type} event`);

    // Handle webhook event
    const result = await provider.handleWebhook(event);

    if (result.processed) {
      console.log(`[Square Webhook] Successfully processed event ${event.id}`);
      if (result.orderId) {
        console.log(`[Square Webhook] Created/updated order ${result.orderId}`);
      }
    }

    return NextResponse.json({ received: true, processed: result.processed });
  } catch (err) {
    console.error("[Square Webhook] Error processing webhook:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
```

### 2. Register Webhook in Square Dashboard

1. Go to your app in [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Click **"Webhooks"** in left sidebar
3. Click **"Add Subscription"** or **"Add Endpoint"**

#### For Sandbox (Testing)
- **URL**: `https://your-dev-domain.workers.dev/api/webhooks/square`
  - Or use ngrok: `https://abc123.ngrok.io/api/webhooks/square`
- **API Version**: Latest (e.g., `2024-10-17`)

#### For Production
- **URL**: `https://yourdomain.com/api/webhooks/square`
- **API Version**: Latest

4. Select events to subscribe to:
   - ✅ **payment.created**
   - ✅ **payment.updated**
   - ✅ **order.created**
   - ✅ **order.updated**

5. Click **"Save"**

### 3. Get Webhook Signature Key

1. After creating webhook subscription
2. Click on the webhook endpoint
3. Copy **"Signature Key"**
   - This is your `SQUARE_WEBHOOK_SIGNATURE_KEY`

---

## Step 5: Environment Variables

Add these to your `.dev.vars` (local) or Cloudflare secrets (production):

### For Development (.dev.vars)

```bash
# Switch to Square provider
MERCHANT_PROVIDER=square

# Square Sandbox Credentials
SQUARE_ACCESS_TOKEN=EAAAl... # Your sandbox access token
SQUARE_LOCATION_ID=LK... # Your sandbox location ID
SQUARE_ENVIRONMENT=sandbox
SQUARE_WEBHOOK_SIGNATURE_KEY=... # Your webhook signature key
```

### For Production (Cloudflare Secrets)

```bash
# Set via Cloudflare dashboard or wrangler CLI:
npx wrangler secret put SQUARE_ACCESS_TOKEN
npx wrangler secret put SQUARE_LOCATION_ID
npx wrangler secret put SQUARE_WEBHOOK_SIGNATURE_KEY

# Update wrangler.jsonc vars:
"vars": {
  "MERCHANT_PROVIDER": "square",
  "SQUARE_ENVIRONMENT": "production"
}
```

---

## Step 6: Test Webhook Locally (Optional)

### Using ngrok

1. Install ngrok: `brew install ngrok` (Mac) or download from [ngrok.com](https://ngrok.com)
2. Start your local dev server:
   ```bash
   pnpm dev
   ```
3. In another terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Use this URL in Square webhook configuration:
   ```
   https://abc123.ngrok.io/api/webhooks/square
   ```
6. Make test payment in Square sandbox
7. Watch your terminal for webhook logs

---

## Step 7: Test Payment Flow

### Using Square Test Cards (Sandbox)

Square provides test card numbers for sandbox testing:

**Successful Payment:**
- Card: `4111 1111 1111 1111` (Visa)
- CVV: Any 3 digits (e.g., `123`)
- Expiry: Any future date (e.g., `12/25`)
- ZIP: Any 5 digits (e.g., `12345`)

**Other Test Cards:**
- `5105 1051 0510 5100` - Mastercard
- `3782 822463 10005` - American Express
- `6011 1111 1111 1117` - Discover

**Failed Payment (for testing):**
- Card: `4000 0000 0000 0002`

### Test Flow

1. Set `MERCHANT_PROVIDER=square` in `.dev.vars`
2. Restart your dev server
3. Go to your storefront
4. Add items to cart
5. Proceed to checkout
6. You should be redirected to Square payment page
7. Use test card to complete payment
8. Verify:
   - Redirected to success page
   - Order created in database
   - Webhook received and processed
   - Merchant fee record created

### Check Database

```sql
-- View recent orders with Square
SELECT id, customerEmail, totalAmount, paymentStatus, merchantProvider
FROM "order"
WHERE merchantProvider = 'square'
ORDER BY createdAt DESC
LIMIT 10;

-- View merchant fees
SELECT * FROM merchant_fee
WHERE merchantProvider = 'square'
ORDER BY createdAt DESC
LIMIT 10;
```

---

## Step 8: Sync Products to Square (Optional)

**Note**: This script needs to be created. Here's the implementation:

### Create Sync Script

**File**: `scripts/sync-square.mjs`

```javascript
import { Client, Environment } from 'square';
import { getDB } from '../src/db/index.js';
import { productTable } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

const accessToken = process.env.SQUARE_ACCESS_TOKEN;
const locationId = process.env.SQUARE_LOCATION_ID;
const environment = process.env.SQUARE_ENVIRONMENT === 'production'
  ? Environment.Production
  : Environment.Sandbox;

if (!accessToken || !locationId) {
  console.error('Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID');
  process.exit(1);
}

const client = new Client({ accessToken, environment });
const db = getDB();

async function syncProducts() {
  // Get products without Square IDs
  const products = await db.select().from(productTable);
  const productsToSync = products.filter(p => !p.merchantProductId);

  console.log(`Found ${productsToSync.length} products to sync`);

  for (const product of productsToSync) {
    try {
      console.log(`Syncing: ${product.name}`);

      const { result } = await client.catalogApi.batchUpsertCatalogObjects({
        idempotencyKey: crypto.randomUUID(),
        batches: [{
          objects: [{
            type: 'ITEM',
            id: '#product',
            itemData: {
              name: product.name,
              description: product.description || undefined,
              variations: [{
                type: 'ITEM_VARIATION',
                id: '#default-variation',
                itemVariationData: {
                  name: 'Regular',
                  pricingType: 'FIXED_PRICING',
                  priceMoney: {
                    amount: BigInt(product.price),
                    currency: 'USD',
                  },
                },
              }],
            },
          }],
        }],
      });

      const createdItem = result.objects[0];
      const defaultVariation = result.objects.find(obj =>
        obj.itemVariationData?.name === 'Regular'
      );

      // Update product with Square IDs
      await db.update(productTable)
        .set({
          merchantProvider: 'square',
          merchantProductId: createdItem.id,
          merchantPriceId: defaultVariation?.id,
        })
        .where(eq(productTable.id, product.id));

      console.log(`✓ Synced: ${product.name} (${createdItem.id})`);
    } catch (error) {
      console.error(`✗ Failed to sync ${product.name}:`, error.message);
    }
  }

  console.log('Sync complete!');
}

syncProducts().catch(console.error);
```

### Run Sync

```bash
# Make sure Square credentials are set
pnpm tsx scripts/sync-square.mjs
```

---

## Step 9: Switch to Production

When ready to go live:

### 1. Get Production Credentials

1. Complete Square account verification
2. Get production access token from dashboard
3. Get production location ID
4. Create production webhook

### 2. Update Environment Variables

```bash
# Set production secrets
npx wrangler secret put SQUARE_ACCESS_TOKEN
# Enter production access token

npx wrangler secret put SQUARE_LOCATION_ID
# Enter production location ID

npx wrangler secret put SQUARE_WEBHOOK_SIGNATURE_KEY
# Enter production webhook signature

# Update wrangler.jsonc
"vars": {
  "MERCHANT_PROVIDER": "square",
  "SQUARE_ENVIRONMENT": "production"
}
```

### 3. Deploy

```bash
pnpm deploy
```

### 4. Verify Production

- Test checkout with real card (small amount)
- Check Square dashboard for transaction
- Verify order in database
- Check webhook was received
- Verify merchant fee recorded

---

## Troubleshooting

### Webhook Not Received

1. **Check webhook URL**: Must be HTTPS and publicly accessible
2. **Check signature key**: Must match Square dashboard
3. **Check logs**: Look for signature verification errors
4. **Use ngrok**: For local testing
5. **Verify events**: Make sure you subscribed to payment.created/updated

### Payment Fails

1. **Check access token**: Must be valid and not expired
2. **Check location ID**: Must match your Square account
3. **Check environment**: Sandbox vs production mismatch
4. **Check test cards**: Use correct test card for sandbox

### Products Not Syncing

1. **Check credentials**: Access token and location ID
2. **Check permissions**: Token must have catalog write permission
3. **Check item data**: Name is required, price must be positive
4. **Check logs**: Look for specific error messages

### Orders Not Created

1. **Check webhook received**: Look for webhook logs
2. **Check payment status**: Must be "COMPLETED"
3. **Check database**: Look for error logs
4. **Check product mapping**: Products must exist in database

---

## Security Best Practices

1. **Never commit credentials** - Use environment variables
2. **Use HTTPS** - Webhooks require HTTPS
3. **Verify signatures** - Always verify webhook signatures
4. **Rotate tokens** - Periodically rotate access tokens
5. **Monitor logs** - Watch for unusual activity
6. **Sandbox first** - Always test in sandbox before production
7. **Limit permissions** - Only grant necessary scopes

---

## Resources

- [Square Developer Docs](https://developer.squareup.com/docs)
- [Square API Reference](https://developer.squareup.com/reference/square)
- [Square Node.js SDK](https://github.com/square/square-nodejs-sdk)
- [Webhooks Guide](https://developer.squareup.com/docs/webhooks/overview)
- [Testing Guide](https://developer.squareup.com/docs/testing/test-values)

---

## Quick Reference

### Environment Variables

```bash
MERCHANT_PROVIDER=square
SQUARE_ACCESS_TOKEN=EAAAl...
SQUARE_LOCATION_ID=LK...
SQUARE_ENVIRONMENT=sandbox  # or production
SQUARE_WEBHOOK_SIGNATURE_KEY=...
```

### Test Cards

- Success: `4111 1111 1111 1111`
- Decline: `4000 0000 0000 0002`
- CVV: Any 3 digits
- Expiry: Any future date

### Webhook Events

- `payment.created` - Payment initiated
- `payment.updated` - Payment status changed
- `order.created` - Order created
- `order.updated` - Order updated

---

**Last Updated**: October 22, 2025
