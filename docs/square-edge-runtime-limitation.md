# Square SDK Edge Runtime Limitation

**Date**: 2025-10-22
**Status**: Known Issue - Workaround Available

## Problem

The Square Node.js SDK (`square` npm package) is **not compatible** with Cloudflare Workers Edge runtime. When attempting to use it, you'll encounter:

```
square__WEBPACK_IMPORTED_MODULE_6__.Client is not a constructor
```

or

```
Cannot read properties of undefined (reading 'Sandbox')
```

## Root Cause

The Square SDK is built for Node.js environments and uses Node.js-specific APIs that aren't available in the Edge runtime (V8 isolates). Cloudflare Workers use a different JavaScript runtime that's lighter and faster but doesn't support all Node.js features.

## Current Solution: Use Stripe

For now, the application uses **Stripe** as the payment provider because:

- ✅ Stripe SDK is Edge runtime compatible
- ✅ Works perfectly with Cloudflare Workers
- ✅ No code changes needed
- ✅ Full feature support (checkout, webhooks, refunds, etc.)

**Set in `.dev.vars`:**

```bash
MERCHANT_PROVIDER=stripe
```

## Future Solution: Square with Fetch API

To use Square with Cloudflare Workers, we need to rewrite the Square provider to use the **Square REST API directly** with `fetch` instead of the SDK.

### Implementation Plan

1. **Remove Square SDK dependency**

   ```bash
   pnpm remove square
   ```

2. **Rewrite Square provider using fetch**

   - Use Square REST API endpoints directly
   - Handle authentication with Bearer tokens
   - Implement webhook signature verification manually
   - Create payment links via API

3. **Square API endpoints to implement:**
   - `POST /v2/online-checkout/payment-links` - Create checkout
   - `POST /v2/catalog/batch-upsert` - Sync products
   - `POST /v2/refunds` - Process refunds
   - `GET /v2/payments/{id}` - Get payment details

### Example: Fetch-based Square Provider

```typescript
// src/lib/merchant-provider/providers/square-fetch.ts
import "server-only";

export class SquareFetchProvider implements IMerchantProvider {
  readonly name = "square" as const;

  private async request(endpoint: string, options: RequestInit = {}) {
    const baseUrl =
      process.env.SQUARE_ENVIRONMENT === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-10-17",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Square API error: ${error}`);
    }

    return response.json();
  }

  async createCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
    // Build order object
    const order = {
      location_id: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
      line_items: options.lineItems.map((item) => ({
        name: item.name,
        quantity: String(item.quantity),
        base_price_money: {
          amount: item.price,
          currency: "USD",
        },
      })),
    };

    // Create payment link
    const result = await this.request("/v2/online-checkout/payment-links", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order,
        checkout_options: {
          redirect_url: options.successUrl,
          merchant_support_email: options.customerEmail,
        },
        pre_populated_data: {
          buyer_email: options.customerEmail,
        },
      }),
    });

    return {
      sessionId: result.payment_link.id,
      url: result.payment_link.url,
    };
  }

  async verifyWebhook(body: string, signature: string): Promise<WebhookEvent> {
    // Manual HMAC-SHA256 verification
    const hmac = crypto.createHmac(
      "sha256",
      process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!
    );
    hmac.update(body);
    const expectedSignature = hmac.digest("base64");

    if (signature !== expectedSignature) {
      throw new Error("Invalid webhook signature");
    }

    const event = JSON.parse(body);
    return {
      id: event.event_id,
      type: event.type,
      createdAt: new Date(event.created_at),
      data: event.data,
    };
  }

  // ... implement other methods
}
```

### Benefits of Fetch-based Approach

- ✅ Works in Edge runtime
- ✅ Smaller bundle size (no SDK overhead)
- ✅ More control over requests
- ✅ Better error handling
- ✅ Faster cold starts

### Drawbacks

- ❌ More code to maintain
- ❌ Need to handle API changes manually
- ❌ No TypeScript types from SDK
- ❌ Manual request/response mapping

## Recommendation

**For Production**: Use **Stripe** - it's battle-tested with Edge runtime and requires no workarounds.

**For Square Integration**: If Square is a hard requirement, consider:

1. **Option A**: Implement fetch-based Square provider (see example above)
2. **Option B**: Use Cloudflare Workers in Node.js compatibility mode (loses some Edge benefits)
3. **Option C**: Run Square operations in a separate Node.js service

## Resources

- [Square API Reference](https://developer.squareup.com/reference/square)
- [Cloudflare Workers Runtime APIs](https://developers.cloudflare.com/workers/runtime-apis/)
- [Stripe with Cloudflare Workers](https://stripe.com/docs/payments/checkout/how-checkout-works)

---

**Current Status**: Application is configured to use **Stripe** for compatibility with Edge runtime.
