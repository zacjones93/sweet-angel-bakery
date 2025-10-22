# Merchant Provider Migration: Stripe to Square

**Document Version**: 1.0
**Date**: 2025-10-22
**Status**: Design & Planning Phase

## Executive Summary

This document outlines a comprehensive strategy for migrating from Stripe to Square payment processing, including the design of a flexible merchant provider abstraction layer that enables easy switching between payment providers.

### Key Objectives

1. **Maintain Business Continuity**: Zero-downtime migration with fallback capabilities
2. **Provider Flexibility**: Abstract payment operations to support multiple providers
3. **Code Maintainability**: Single interface for all payment operations
4. **Feature Parity**: Ensure all current Stripe features work with Square
5. **Revenue Transparency**: Track merchant processing fees for accurate financial reporting

---

## Table of Contents

1. [Current Stripe Implementation Analysis](#current-stripe-implementation-analysis)
2. [Square API Research Findings](#square-api-research-findings)
3. [Comparison: Stripe vs Square](#comparison-stripe-vs-square)
4. [Merchant Provider Abstraction Layer Design](#merchant-provider-abstraction-layer-design)
5. [Implementation Plan](#implementation-plan)
6. [Migration Strategy](#migration-strategy)
7. [Database Schema Changes](#database-schema-changes)
8. [Testing Strategy](#testing-strategy)
9. [Rollback Plan](#rollback-plan)

---

## Current Stripe Implementation Analysis

### Architecture Overview

The current implementation uses Stripe for:
- Checkout session creation
- Payment processing
- Webhook handling (payment events)
- Product/price synchronization
- Inventory management

### Key Components

#### 1. Stripe Client (`src/lib/stripe.ts`)

```typescript
// Current implementation
export async function getStripe() {
  if (stripeInstance) return stripeInstance;

  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
    httpClient: Stripe.createFetchHttpClient()
  });

  return stripeInstance;
}
```

**Usage**: Singleton pattern for Stripe client initialization.

#### 2. Checkout Session Creation (`src/app/(storefront)/_actions/create-checkout-session.action.ts`)

**Flow**:
1. Validate cart items and inventory
2. Build line items for Stripe (use Stripe Price IDs or create ad-hoc prices)
3. Calculate subtotal and tax
4. Create Stripe Checkout Session with metadata
5. Return session URL for redirect

**Key Features**:
- Product variant support (size_variants)
- Ad-hoc pricing for products without Stripe Price IDs
- Tax calculation (6% Idaho sales tax)
- Customer information capture (email, phone, loyalty opt-in)
- Session metadata for webhook processing

#### 3. Webhook Handler (`src/app/api/webhooks/stripe/route.ts`)

**Handled Events**:
- `checkout.session.completed`: Creates order, reduces inventory, sends confirmations
- `payment_intent.succeeded`: Updates payment status to PAID
- `payment_intent.payment_failed`: Updates payment status to FAILED

**Key Operations**:
1. Verify webhook signature
2. Retrieve line items from session
3. Map Stripe prices back to products (handles variants)
4. Create order and order items
5. Reduce inventory (product-level or variant-level)
6. Send email/SMS confirmations
7. Handle loyalty user creation

#### 4. Product Synchronization (`scripts/sync-stripe.mjs`)

**Flow**:
1. Query products without Stripe IDs
2. Create Stripe Product for each
3. Create default Stripe Price
4. Update database with Stripe IDs

**Features**:
- Batch product creation
- Smart skip logic (avoids duplicates)
- Image URL conversion
- Metadata storage (dbProductId, categoryId)

### Current Database Schema

```sql
-- Products
CREATE TABLE product (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,           -- Default price in cents
  imageUrl TEXT,
  categoryId TEXT NOT NULL,
  stripeProductId TEXT,             -- Stripe Product ID
  stripePriceId TEXT,               -- Stripe Price ID (default)
  customizations TEXT,              -- JSON: size_variants config
  quantityAvailable INTEGER,
  -- ...
);

-- Orders
CREATE TABLE order (
  id TEXT PRIMARY KEY,
  userId TEXT,                      -- Nullable for guest checkout
  customerEmail TEXT NOT NULL,
  customerName TEXT NOT NULL,
  customerPhone TEXT,
  subtotal INTEGER NOT NULL,        -- In cents
  tax INTEGER NOT NULL,             -- In cents
  totalAmount INTEGER NOT NULL,     -- In cents
  paymentStatus TEXT NOT NULL,      -- pending|paid|failed|refunded
  status TEXT NOT NULL,             -- Order fulfillment status
  stripePaymentIntentId TEXT,       -- Stripe Payment Intent ID
  -- ...
);

-- Order Items
CREATE TABLE order_item (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL,
  productId TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  priceAtPurchase INTEGER NOT NULL, -- In cents
  customizations TEXT,              -- JSON: selected variant info
  -- ...
);
```

### Integration Points

1. **Checkout Flow**: `src/app/(storefront)/checkout/page.tsx`
2. **Cart Management**: `src/app/(storefront)/cart/page.tsx`
3. **Order Confirmation**: `src/app/(storefront)/purchase/thanks/page.tsx`
4. **Admin Orders**: `src/app/(admin)/admin/orders/` (view, update status)
5. **Product Management**: `src/app/(admin)/admin/products/` (create, edit)

### Stripe-Specific Features Used

- **Checkout Sessions**: Hosted payment page
- **Payment Intents**: Automatic payment processing
- **Price IDs**: Pre-configured product pricing
- **Ad-hoc Prices**: Dynamic price creation
- **Line Item Expansion**: Retrieve session items in webhook
- **Metadata**: Pass custom data through checkout
- **Webhooks**: Real-time payment notifications

---

## Square API Research Findings

### Core Concepts

#### 1. Square SDK Setup

```typescript
import { Client, Environment } from 'square';

const client = new Client({
  environment: Environment.Production, // or Environment.Sandbox
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});
```

**Key Differences from Stripe**:
- Uses `accessToken` instead of `secretKey`
- Environment enum for sandbox/production
- Version: 43.1.0 (latest as of research)

#### 2. Payment Flow

Square uses **Payment Links** (via Checkout API) instead of Checkout Sessions:

```typescript
const { result } = await client.checkoutApi.createPaymentLink({
  order: {
    locationId: process.env.SQUARE_LOCATION_ID,
    lineItems: [
      {
        name: 'Product Name',
        quantity: '1',
        basePriceMoney: {
          amount: 2500n, // BigInt in cents
          currency: 'USD',
        },
      },
    ],
  },
  checkoutOptions: {
    redirectUrl: 'https://example.com/thanks',
    askForShippingAddress: false,
  },
});

const paymentUrl = result.paymentLink.url; // https://square.link/u/...
```

**Key Differences**:
- `CreatePaymentLink` instead of `createCheckoutSession`
- Orders are created inline with payment link
- Uses BigInt for monetary amounts
- SMS-friendly short URLs (`square.link`)

#### 3. Catalog API (Products)

Square uses **Catalog Items** with **Item Variations**:

```typescript
const { result } = await client.catalogApi.batchUpsertCatalogObjects({
  idempotencyKey: crypto.randomUUID(),
  batches: [
    {
      objects: [
        {
          type: 'ITEM',
          id: '#product-1',
          itemData: {
            name: 'Chocolate Cake',
            description: 'Rich chocolate cake',
            variations: [
              {
                type: 'ITEM_VARIATION',
                id: '#variation-1',
                itemVariationData: {
                  name: 'Regular',
                  pricingType: 'FIXED_PRICING',
                  priceMoney: {
                    amount: 2500n,
                    currency: 'USD',
                  },
                },
              },
            ],
          },
        },
      ],
    },
  ],
});
```

**Key Differences**:
- Items have nested variations (not separate Price objects)
- Requires location ID for visibility
- Uses temporary IDs (#-prefixed) that map to real IDs
- Batch operations for efficiency

#### 4. Orders API

Square has a dedicated Orders API for creating and managing orders:

```typescript
const { result } = await client.ordersApi.createOrder({
  order: {
    locationId: process.env.SQUARE_LOCATION_ID,
    lineItems: [
      {
        catalogObjectId: 'catalog-item-id',
        quantity: '1',
      },
    ],
  },
  idempotencyKey: crypto.randomUUID(),
});
```

**Key Features**:
- Can reference catalog items or use ad-hoc items
- Automatic tax/discount calculation with catalog items
- Fulfillment tracking built-in
- No transaction fee with Square payments

#### 5. Webhooks

Square webhooks use event subscriptions:

```typescript
// Webhook signature verification
import { validateWebhookEventSignature } from 'square';

const isValid = validateWebhookEventSignature({
  body: req.body,
  signatureHeader: req.headers['x-square-hmacsha256-signature'],
  signatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
  url: 'https://example.com/api/webhooks/square',
});
```

**Payment Events**:
- `payment.created`: When payment is created
- `payment.updated`: When payment status changes
- `order.created`: When order is created
- `order.updated`: When order is updated
- `order.fulfillment.updated`: When fulfillment status changes

**Key Differences**:
- Different event names (`payment.created` vs `checkout.session.completed`)
- Uses HMAC-SHA256 signature verification
- Includes `event_id` for idempotency
- Retries for 24 hours with exponential backoff

### Square API Capabilities

#### Supported Payment Methods
- Credit/debit cards
- Apple Pay
- Google Pay
- Cash App Pay
- Afterpay/Clearpay
- ACH bank transfers

#### Advanced Features
- Tipping on checkout pages
- Custom form fields (up to 2)
- Subscription billing
- Loyalty program integration
- Coupon/discount support
- Shipping fee calculation

---

## Comparison: Stripe vs Square

### Feature Parity Matrix

| Feature | Stripe | Square | Notes |
|---------|--------|--------|-------|
| **Checkout Flow** | Checkout Sessions | Payment Links | Similar hosted pages |
| **Webhooks** | ✅ Full support | ✅ Full support | Different event names |
| **Product Catalog** | Products + Prices | Catalog Items + Variations | Square more complex |
| **Ad-hoc Pricing** | ✅ price_data | ✅ Ad-hoc items | Both supported |
| **Metadata** | ✅ Up to 500 chars | ✅ Custom fields | Similar capabilities |
| **Tax Calculation** | Manual or Tax Rate objects | Manual or automatic with catalog | Square has built-in tax |
| **Inventory** | Via metadata/external | Built-in with Catalog | Square more integrated |
| **Order Management** | Via metadata | Dedicated Orders API | Square more robust |
| **Refunds** | ✅ Refunds API | ✅ Refunds API | Both supported |
| **Subscriptions** | ✅ Native | ✅ Native | Both supported |
| **Node.js SDK** | ✅ Official | ✅ Official | Both well-documented |

### Key Architectural Differences

#### 1. Checkout Flow

**Stripe**:
```typescript
// Create session
const session = await stripe.checkout.sessions.create({
  line_items: [{ price: 'price_xxx', quantity: 1 }],
  mode: 'payment',
  success_url: '...',
  cancel_url: '...',
});
// Redirect to session.url
```

**Square**:
```typescript
// Create payment link
const { result } = await client.checkoutApi.createPaymentLink({
  order: { locationId: '...', lineItems: [...] },
  checkoutOptions: { redirectUrl: '...' },
});
// Redirect to result.paymentLink.url
```

#### 2. Product Management

**Stripe**:
```typescript
// Separate Product and Price
const product = await stripe.products.create({ name: '...' });
const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 2500,
  currency: 'usd',
});
```

**Square**:
```typescript
// Nested Item and Variation
await client.catalogApi.batchUpsertCatalogObjects({
  batches: [{
    objects: [{
      type: 'ITEM',
      itemData: {
        name: '...',
        variations: [{
          type: 'ITEM_VARIATION',
          itemVariationData: {
            priceMoney: { amount: 2500n, currency: 'USD' },
          },
        }],
      },
    }],
  }],
});
```

#### 3. Webhook Events

**Stripe**:
- `checkout.session.completed` → Order creation trigger
- `payment_intent.succeeded` → Payment confirmed
- `payment_intent.payment_failed` → Payment failed

**Square**:
- `payment.created` → Payment initiated
- `payment.updated` → Payment status changed
- `order.created` → Order created
- `order.updated` → Order updated

#### 4. Amount Representation

**Stripe**: `number` (cents)
**Square**: `bigint` (cents)

```typescript
// Stripe
amount: 2500 // $25.00

// Square
amount: 2500n // $25.00 (BigInt)
```

---

## Merchant Provider Abstraction Layer Design

### Design Principles

1. **Single Responsibility**: Each provider implements same interface
2. **Type Safety**: Full TypeScript support with generics
3. **Extensibility**: Easy to add new providers (PayPal, etc.)
4. **Testability**: Mockable interfaces for testing
5. **Configuration**: Environment-based provider selection

### Architecture Diagram

```
┌─────────────────────────────────────────┐
│   Application Layer (Server Actions)    │
│  - createCheckoutSessionAction          │
│  - Webhook Handlers                     │
│  - Product Sync Scripts                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│    Merchant Provider Interface (API)    │
│  - createCheckout()                     │
│  - handleWebhook()                      │
│  - createProduct()                      │
│  - refundPayment()                      │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌─────────────┐ ┌─────────────┐
│   Stripe    │ │   Square    │
│  Provider   │ │  Provider   │
└─────────────┘ └─────────────┘
```

### Core Interface

```typescript
// src/lib/merchant-provider/types.ts

export type MerchantProviderType = 'stripe' | 'square';

export interface CheckoutLineItem {
  productId: string;
  name: string;
  description?: string;
  price: number; // cents
  quantity: number;
  imageUrl?: string;
  customizations?: OrderItemCustomizations;
}

export interface CheckoutOptions {
  lineItems: CheckoutLineItem[];
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutResult {
  sessionId: string;
  url: string;
  expiresAt?: Date;
}

export interface WebhookEvent {
  id: string;
  type: string;
  createdAt: Date;
  data: unknown;
}

export interface WebhookResult {
  processed: boolean;
  orderId?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  error?: string;
}

export interface ProductCreateOptions {
  name: string;
  description?: string;
  price: number; // cents (default price)
  imageUrl?: string;
  variants?: Array<{
    id: string;
    name: string;
    price: number; // cents
  }>;
  metadata?: Record<string, string>;
}

export interface ProductCreateResult {
  productId: string;
  priceId?: string; // Default price ID (Stripe) or variation ID (Square)
  variantIds?: Record<string, string>; // Map of variant IDs
}

export interface RefundOptions {
  paymentId: string;
  amount?: number; // cents, full refund if omitted
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  status: 'succeeded' | 'pending' | 'failed';
  amount: number; // cents
}

export interface IMerchantProvider {
  readonly name: MerchantProviderType;

  /**
   * Initialize the provider with credentials
   */
  initialize(): Promise<void>;

  /**
   * Create a checkout session/link
   */
  createCheckout(options: CheckoutOptions): Promise<CheckoutResult>;

  /**
   * Verify and process webhook events
   */
  verifyWebhook(body: string, signature: string): Promise<WebhookEvent>;

  /**
   * Handle webhook event and create order
   */
  handleWebhook(event: WebhookEvent): Promise<WebhookResult>;

  /**
   * Create product in provider's catalog
   */
  createProduct(options: ProductCreateOptions): Promise<ProductCreateResult>;

  /**
   * Refund a payment
   */
  refundPayment(options: RefundOptions): Promise<RefundResult>;

  /**
   * Get payment details
   */
  getPayment(paymentId: string): Promise<{
    id: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    amount: number;
    currency: string;
    createdAt: Date;
  }>;
}
```

### Provider Factory

```typescript
// src/lib/merchant-provider/factory.ts

import { IMerchantProvider, MerchantProviderType } from './types';
import { StripeProvider } from './providers/stripe';
import { SquareProvider } from './providers/square';

let providerInstance: IMerchantProvider | null = null;

export async function getMerchantProvider(): Promise<IMerchantProvider> {
  if (providerInstance) return providerInstance;

  const providerType = (process.env.MERCHANT_PROVIDER || 'stripe') as MerchantProviderType;

  switch (providerType) {
    case 'stripe':
      providerInstance = new StripeProvider();
      break;
    case 'square':
      providerInstance = new SquareProvider();
      break;
    default:
      throw new Error(`Unknown merchant provider: ${providerType}`);
  }

  await providerInstance.initialize();
  return providerInstance;
}

// Helper to get current provider type without initializing
export function getCurrentProviderType(): MerchantProviderType {
  return (process.env.MERCHANT_PROVIDER || 'stripe') as MerchantProviderType;
}
```

### Stripe Provider Implementation

```typescript
// src/lib/merchant-provider/providers/stripe.ts

import Stripe from 'stripe';
import type {
  IMerchantProvider,
  CheckoutOptions,
  CheckoutResult,
  WebhookEvent,
  WebhookResult,
  ProductCreateOptions,
  ProductCreateResult,
  RefundOptions,
  RefundResult,
} from '../types';

export class StripeProvider implements IMerchantProvider {
  readonly name = 'stripe' as const;
  private client: Stripe | null = null;

  async initialize(): Promise<void> {
    if (this.client) return;

    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new Error('STRIPE_SECRET_KEY not configured');

    this.client = new Stripe(apiKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
      httpClient: Stripe.createFetchHttpClient(),
    });
  }

  private getClient(): Stripe {
    if (!this.client) throw new Error('Stripe not initialized');
    return this.client;
  }

  async createCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
    const stripe = this.getClient();

    // Build line items
    const lineItems = options.lineItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description,
          images: item.imageUrl ? [item.imageUrl] : undefined,
          metadata: {
            productId: item.productId,
          },
        },
        unit_amount: item.price,
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      customer_email: options.customerEmail,
      metadata: options.metadata,
    });

    if (!session.url) throw new Error('Failed to create checkout session');

    return {
      sessionId: session.id,
      url: session.url,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
    };
  }

  async verifyWebhook(body: string, signature: string): Promise<WebhookEvent> {
    const stripe = this.getClient();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');

    const event = await stripe.webhooks.constructEventAsync(body, signature, secret);

    return {
      id: event.id,
      type: event.type,
      createdAt: new Date(event.created * 1000),
      data: event.data.object,
    };
  }

  async handleWebhook(event: WebhookEvent): Promise<WebhookResult> {
    switch (event.type) {
      case 'checkout.session.completed':
        // Implementation moved from webhook route
        // Returns { processed: true, orderId: 'ord_xxx', paymentStatus: 'paid' }
        return await this.handleCheckoutCompleted(event.data as Stripe.Checkout.Session);

      case 'payment_intent.succeeded':
        // Update payment status
        return { processed: true, paymentStatus: 'paid' };

      case 'payment_intent.payment_failed':
        // Update payment status
        return { processed: true, paymentStatus: 'failed' };

      default:
        return { processed: false };
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<WebhookResult> {
    // Move logic from src/app/api/webhooks/stripe/route.ts
    // Return order ID and status
    // Implementation details omitted for brevity
    return {
      processed: true,
      orderId: 'ord_xxx',
      paymentStatus: 'paid',
    };
  }

  async createProduct(options: ProductCreateOptions): Promise<ProductCreateResult> {
    const stripe = this.getClient();

    // Create Stripe product
    const product = await stripe.products.create({
      name: options.name,
      description: options.description,
      images: options.imageUrl ? [options.imageUrl] : undefined,
      metadata: options.metadata,
    });

    // Create default price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: options.price,
      currency: 'usd',
    });

    // Create variant prices
    const variantIds: Record<string, string> = {};
    if (options.variants) {
      for (const variant of options.variants) {
        const variantPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: variant.price,
          currency: 'usd',
          metadata: { variantId: variant.id },
        });
        variantIds[variant.id] = variantPrice.id;
      }
    }

    return {
      productId: product.id,
      priceId: price.id,
      variantIds,
    };
  }

  async refundPayment(options: RefundOptions): Promise<RefundResult> {
    const stripe = this.getClient();

    const refund = await stripe.refunds.create({
      payment_intent: options.paymentId,
      amount: options.amount,
      reason: options.reason as Stripe.RefundCreateParams.Reason,
    });

    return {
      refundId: refund.id,
      status: refund.status === 'succeeded' ? 'succeeded' : 'pending',
      amount: refund.amount,
    };
  }

  async getPayment(paymentId: string) {
    const stripe = this.getClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

    return {
      id: paymentIntent.id,
      status: this.mapPaymentStatus(paymentIntent.status),
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      createdAt: new Date(paymentIntent.created * 1000),
    };
  }

  private mapPaymentStatus(status: string): 'pending' | 'paid' | 'failed' | 'refunded' {
    switch (status) {
      case 'succeeded': return 'paid';
      case 'processing': return 'pending';
      case 'canceled': return 'failed';
      default: return 'pending';
    }
  }
}
```

### Square Provider Implementation

```typescript
// src/lib/merchant-provider/providers/square.ts

import { Client, Environment } from 'square';
import type {
  IMerchantProvider,
  CheckoutOptions,
  CheckoutResult,
  WebhookEvent,
  WebhookResult,
  ProductCreateOptions,
  ProductCreateResult,
  RefundOptions,
  RefundResult,
} from '../types';

export class SquareProvider implements IMerchantProvider {
  readonly name = 'square' as const;
  private client: Client | null = null;
  private locationId: string | null = null;

  async initialize(): Promise<void> {
    if (this.client) return;

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;

    if (!accessToken) throw new Error('SQUARE_ACCESS_TOKEN not configured');
    if (!locationId) throw new Error('SQUARE_LOCATION_ID not configured');

    const environment = process.env.SQUARE_ENVIRONMENT === 'production'
      ? Environment.Production
      : Environment.Sandbox;

    this.client = new Client({ accessToken, environment });
    this.locationId = locationId;
  }

  private getClient(): Client {
    if (!this.client) throw new Error('Square not initialized');
    return this.client;
  }

  private getLocationId(): string {
    if (!this.locationId) throw new Error('Square location ID not configured');
    return this.locationId;
  }

  async createCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
    const client = this.getClient();
    const locationId = this.getLocationId();

    // Build line items
    const lineItems = options.lineItems.map(item => ({
      name: item.name,
      note: item.description,
      quantity: String(item.quantity),
      basePriceMoney: {
        amount: BigInt(item.price),
        currency: 'USD',
      },
      itemType: 'ITEM' as const,
      metadata: {
        productId: item.productId,
      },
    }));

    const { result } = await client.checkoutApi.createPaymentLink({
      idempotencyKey: crypto.randomUUID(),
      order: {
        locationId,
        lineItems,
      },
      checkoutOptions: {
        redirectUrl: options.successUrl,
        askForShippingAddress: false,
        merchantSupportEmail: options.customerEmail,
      },
      prePopulatedData: {
        buyerEmail: options.customerEmail,
      },
    });

    return {
      sessionId: result.paymentLink!.id!,
      url: result.paymentLink!.url!,
      // Square payment links don't have expiration by default
    };
  }

  async verifyWebhook(body: string, signature: string): Promise<WebhookEvent> {
    // Square uses HMAC-SHA256 signature
    const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    if (!signatureKey) throw new Error('SQUARE_WEBHOOK_SIGNATURE_KEY not configured');

    // Verify signature
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', signatureKey);
    hmac.update(body);
    const expectedSignature = hmac.digest('base64');

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    const event = JSON.parse(body);

    return {
      id: event.event_id,
      type: event.type,
      createdAt: new Date(event.created_at),
      data: event.data,
    };
  }

  async handleWebhook(event: WebhookEvent): Promise<WebhookResult> {
    switch (event.type) {
      case 'payment.created':
      case 'payment.updated':
        return await this.handlePaymentEvent(event);

      case 'order.created':
      case 'order.updated':
        return await this.handleOrderEvent(event);

      default:
        return { processed: false };
    }
  }

  private async handlePaymentEvent(event: WebhookEvent): Promise<WebhookResult> {
    const payment = (event.data as any).object.payment;

    // Map Square payment status to our statuses
    let paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    switch (payment.status) {
      case 'COMPLETED':
        paymentStatus = 'paid';
        break;
      case 'APPROVED':
        paymentStatus = 'pending';
        break;
      case 'FAILED':
      case 'CANCELED':
        paymentStatus = 'failed';
        break;
      default:
        paymentStatus = 'pending';
    }

    // Create order from payment (similar to Stripe checkout.session.completed)
    // Implementation would extract order info from payment
    return {
      processed: true,
      paymentStatus,
      orderId: payment.order_id,
    };
  }

  private async handleOrderEvent(event: WebhookEvent): Promise<WebhookResult> {
    // Handle order created/updated events
    return { processed: true };
  }

  async createProduct(options: ProductCreateOptions): Promise<ProductCreateResult> {
    const client = this.getClient();

    // Build variations
    const variations = [
      {
        type: 'ITEM_VARIATION' as const,
        id: '#default-variation',
        itemVariationData: {
          name: 'Regular',
          pricingType: 'FIXED_PRICING' as const,
          priceMoney: {
            amount: BigInt(options.price),
            currency: 'USD',
          },
        },
      },
    ];

    // Add custom variants
    if (options.variants) {
      for (const variant of options.variants) {
        variations.push({
          type: 'ITEM_VARIATION' as const,
          id: `#variant-${variant.id}`,
          itemVariationData: {
            name: variant.name,
            pricingType: 'FIXED_PRICING' as const,
            priceMoney: {
              amount: BigInt(variant.price),
              currency: 'USD',
            },
          },
        });
      }
    }

    const { result } = await client.catalogApi.batchUpsertCatalogObjects({
      idempotencyKey: crypto.randomUUID(),
      batches: [
        {
          objects: [
            {
              type: 'ITEM',
              id: '#product',
              itemData: {
                name: options.name,
                description: options.description,
                variations,
              },
            },
          ],
        },
      ],
    });

    const createdItem = result.objects![0];
    const defaultVariation = result.objects!.find(obj =>
      obj.id === result.idMappings![0].objectId
    );

    // Map variant IDs
    const variantIds: Record<string, string> = {};
    if (options.variants) {
      for (const variant of options.variants) {
        const createdVariation = result.objects!.find(obj =>
          obj.itemVariationData?.name === variant.name
        );
        if (createdVariation) {
          variantIds[variant.id] = createdVariation.id!;
        }
      }
    }

    return {
      productId: createdItem.id!,
      priceId: defaultVariation?.id,
      variantIds,
    };
  }

  async refundPayment(options: RefundOptions): Promise<RefundResult> {
    const client = this.getClient();

    const { result } = await client.refundsApi.refundPayment({
      idempotencyKey: crypto.randomUUID(),
      amountMoney: options.amount
        ? { amount: BigInt(options.amount), currency: 'USD' }
        : undefined, // Full refund if amount not specified
      paymentId: options.paymentId,
      reason: options.reason,
    });

    return {
      refundId: result.refund!.id!,
      status: result.refund!.status === 'COMPLETED' ? 'succeeded' : 'pending',
      amount: Number(result.refund!.amountMoney!.amount!),
    };
  }

  async getPayment(paymentId: string) {
    const client = this.getClient();
    const { result } = await client.paymentsApi.getPayment(paymentId);
    const payment = result.payment!;

    return {
      id: payment.id!,
      status: this.mapPaymentStatus(payment.status!),
      amount: Number(payment.totalMoney!.amount!),
      currency: payment.totalMoney!.currency!,
      createdAt: new Date(payment.createdAt!),
    };
  }

  private mapPaymentStatus(status: string): 'pending' | 'paid' | 'failed' | 'refunded' {
    switch (status) {
      case 'COMPLETED': return 'paid';
      case 'APPROVED': return 'pending';
      case 'FAILED':
      case 'CANCELED': return 'failed';
      default: return 'pending';
    }
  }
}
```

### Environment Configuration

```bash
# .env.local or .dev.vars

# Merchant Provider Selection
MERCHANT_PROVIDER=stripe  # or 'square'

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Square Configuration
SQUARE_ACCESS_TOKEN=sq0atp-...
SQUARE_LOCATION_ID=L...
SQUARE_ENVIRONMENT=sandbox  # or 'production'
SQUARE_WEBHOOK_SIGNATURE_KEY=...
```

---

## Implementation Plan

### Phase 1: Setup & Abstraction Layer (Week 1)

**Tasks**:
1. ✅ Research Square API
2. ✅ Design abstraction layer
3. Create base types and interfaces
4. Implement provider factory
5. Create fee calculator utility
6. Add environment configuration
7. Set up Square sandbox account

**Deliverables**:
- `src/lib/merchant-provider/types.ts`
- `src/lib/merchant-provider/factory.ts`
- `src/lib/merchant-provider/fee-calculator.ts`
- Environment variables documented

### Phase 2: Stripe Provider Implementation (Week 2)

**Tasks**:
1. Create `StripeProvider` class
2. Refactor existing Stripe code into provider
3. Move webhook logic to provider (include fee calculation)
4. Move product sync to provider
5. Add comprehensive error handling
6. Write unit tests for Stripe provider (including fee calculations)

**Deliverables**:
- `src/lib/merchant-provider/providers/stripe.ts`
- Updated webhook route to use provider and create fee records
- Updated checkout action to use provider
- Test suite for Stripe provider

### Phase 3: Square Provider Implementation (Week 3)

**Tasks**:
1. Create `SquareProvider` class
2. Implement checkout creation
3. Implement webhook handling
4. Implement product catalog sync
5. Handle BigInt conversion properly
6. Write unit tests for Square provider
7. Test in Square sandbox

**Deliverables**:
- `src/lib/merchant-provider/providers/square.ts`
- Test suite for Square provider
- Square sandbox testing results

### Phase 4: Database Schema Updates (Week 3-4)

**Tasks**:
1. Add `merchantProvider` column to orders table
2. Rename `stripePaymentIntentId` to `paymentIntentId`
3. Rename `stripeProductId` to `merchantProductId`
4. Rename `stripePriceId` to `merchantPriceId`
5. Create `merchant_fee` table with proper indexes
6. Add migration script with fee backfill
7. Update schema types and relations
8. Update all queries

**Deliverables**:
- Database migration file (includes merchant_fee table)
- Updated schema types (merchantFeeTable, MerchantFee type)
- Data migration script (for existing orders and fees)
- Fee backfill script for historical orders

### Phase 5: Integration & Testing (Week 4)

**Tasks**:
1. Update all server actions to use abstraction
2. Create admin revenue stats page with fee tracking
3. Create revenue stats server action with fee queries
4. Update admin panel to handle both providers
5. Add provider indicator in UI
6. Create parallel testing environment (Stripe + Square)
7. End-to-end testing (including fee calculation verification)
8. Performance testing

**Deliverables**:
- Updated server actions
- `src/app/(admin)/admin/stats/page.tsx`
- `src/app/(admin)/admin/stats/_actions/revenue.action.ts`
- Updated UI components
- Test results document with fee accuracy validation

### Phase 6: Migration Execution (Week 5)

**Tasks**:
1. Create production Square account
2. Sync products to Square
3. Configure webhooks
4. Gradual rollout (10% → 50% → 100%)
5. Monitor error rates
6. User acceptance testing

**Deliverables**:
- Migration checklist
- Rollout plan
- Monitoring dashboard

### Phase 7: Cleanup & Documentation (Week 6)

**Tasks**:
1. Remove Stripe-specific code (if fully migrated)
2. Update documentation
3. Create runbooks
4. Train team
5. Archive old code

**Deliverables**:
- Final documentation
- Runbooks
- Training materials

---

## Migration Strategy

### Pre-Migration Checklist

- [ ] Square production account created
- [ ] Square location configured
- [ ] Access tokens generated
- [ ] Webhook endpoints configured
- [ ] Products synced to Square
- [ ] Test transactions completed in sandbox
- [ ] Monitoring dashboards ready
- [ ] Rollback plan documented

### Migration Approaches

#### Option 1: Big Bang (Not Recommended)
Switch all traffic to Square at once. **High risk.**

#### Option 2: Gradual Rollout (Recommended)
Progressively move traffic from Stripe to Square.

**Stages**:
1. **10% Traffic**: Monitor for 2-3 days
2. **25% Traffic**: Monitor for 2-3 days
3. **50% Traffic**: Monitor for 1 week
4. **100% Traffic**: Full migration

**Implementation**:
```typescript
// src/lib/merchant-provider/factory.ts
export async function getMerchantProvider(): Promise<IMerchantProvider> {
  // Gradual rollout logic
  const rolloutPercentage = parseInt(process.env.SQUARE_ROLLOUT_PERCENTAGE || '0');

  // Use hash of user session or random for consistent experience
  const shouldUseSquare = Math.random() * 100 < rolloutPercentage;

  const providerType = shouldUseSquare ? 'square' : 'stripe';

  // ... rest of factory logic
}
```

#### Option 3: Feature Flag (Most Flexible)
Use feature flags for controlled rollout.

**Tools**: LaunchDarkly, Split.io, or custom flags

### Post-Migration Monitoring

**Key Metrics**:
- Payment success rate
- Checkout completion rate
- Average transaction time
- Error rates by provider
- Customer complaints
- Revenue reconciliation

**Dashboards**:
- Real-time payment monitoring
- Provider comparison metrics
- Error tracking (Sentry, Datadog, etc.)

### Data Migration

**Existing Orders**:
- Keep Stripe Payment Intent IDs for historical orders
- Add `merchantProvider` column to identify source
- Maintain backward compatibility for refunds

**Migration Script**:
```sql
-- Add merchantProvider column
ALTER TABLE "order" ADD COLUMN merchantProvider TEXT DEFAULT 'stripe';

-- Rename Stripe-specific columns
ALTER TABLE "order" RENAME COLUMN stripePaymentIntentId TO paymentIntentId;

-- Update existing orders
UPDATE "order" SET merchantProvider = 'stripe' WHERE paymentIntentId IS NOT NULL;

-- Update products table
ALTER TABLE product RENAME COLUMN stripeProductId TO merchantProductId;
ALTER TABLE product RENAME COLUMN stripePriceId TO merchantPriceId;
ALTER TABLE product ADD COLUMN merchantProvider TEXT DEFAULT 'stripe';
```

---

## Database Schema Changes

### Order Table Updates

**Before**:
```sql
CREATE TABLE "order" (
  id TEXT PRIMARY KEY,
  stripePaymentIntentId TEXT,
  paymentStatus TEXT NOT NULL,
  -- ...
);
```

**After**:
```sql
CREATE TABLE "order" (
  id TEXT PRIMARY KEY,
  merchantProvider TEXT NOT NULL DEFAULT 'stripe',  -- NEW
  paymentIntentId TEXT,                            -- RENAMED
  paymentStatus TEXT NOT NULL,
  -- ...
);
```

### Product Table Updates

**Before**:
```sql
CREATE TABLE product (
  id TEXT PRIMARY KEY,
  stripeProductId TEXT,
  stripePriceId TEXT,
  -- ...
);
```

**After**:
```sql
CREATE TABLE product (
  id TEXT PRIMARY KEY,
  merchantProvider TEXT DEFAULT 'stripe',  -- NEW
  merchantProductId TEXT,                 -- RENAMED
  merchantPriceId TEXT,                   -- RENAMED
  -- For variants: store provider-specific IDs in customizations JSON
  -- ...
);
```

### Merchant Fee Table (NEW)

**Purpose**: Track processing fees charged by payment providers for revenue analytics.

**Schema**:
```sql
CREATE TABLE merchant_fee (
  id TEXT PRIMARY KEY DEFAULT ('mfee_' || generate_cuid()),
  orderId TEXT NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  merchantProvider TEXT NOT NULL,           -- 'stripe' or 'square'

  -- Fee breakdown
  orderAmount INTEGER NOT NULL,             -- Order total in cents
  percentageFee INTEGER NOT NULL,           -- Percentage fee in basis points (e.g., 290 = 2.9%)
  fixedFee INTEGER NOT NULL,                -- Fixed fee in cents (e.g., 30 = $0.30)
  totalFee INTEGER NOT NULL,                -- Total fee in cents (calculated)

  -- Net revenue
  netAmount INTEGER NOT NULL,               -- Order amount minus fees

  -- Metadata
  paymentIntentId TEXT,                     -- Provider's payment ID
  calculatedAt INTEGER NOT NULL,            -- Timestamp when fee was calculated

  -- Audit fields
  createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  CHECK (totalFee >= 0),
  CHECK (netAmount >= 0),
  CHECK (orderAmount = netAmount + totalFee)
);

-- Indexes
CREATE INDEX merchant_fee_order_id_idx ON merchant_fee(orderId);
CREATE INDEX merchant_fee_merchant_provider_idx ON merchant_fee(merchantProvider);
CREATE INDEX merchant_fee_calculated_at_idx ON merchant_fee(calculatedAt);
CREATE INDEX merchant_fee_created_at_idx ON merchant_fee(createdAt);
```

**TypeScript Type**:
```typescript
// src/db/schema.ts
export const merchantFeeTable = sqliteTable("merchant_fee", {
  ...commonColumns,
  id: text().primaryKey().$defaultFn(() => `mfee_${createId()}`).notNull(),
  orderId: text().notNull().references(() => orderTable.id, { onDelete: 'cascade' }),
  merchantProvider: text({ length: 50 }).notNull(),

  // Fee breakdown
  orderAmount: integer().notNull(), // cents
  percentageFee: integer().notNull(), // basis points
  fixedFee: integer().notNull(), // cents
  totalFee: integer().notNull(), // cents

  // Net revenue
  netAmount: integer().notNull(), // cents

  // Metadata
  paymentIntentId: text({ length: 255 }),
  calculatedAt: integer({ mode: "timestamp" }).notNull(),
}, (table) => ([
  index('merchant_fee_order_id_idx').on(table.orderId),
  index('merchant_fee_merchant_provider_idx').on(table.merchantProvider),
  index('merchant_fee_calculated_at_idx').on(table.calculatedAt),
  index('merchant_fee_created_at_idx').on(table.createdAt),
]));

export const merchantFeeRelations = relations(merchantFeeTable, ({ one }) => ({
  order: one(orderTable, {
    fields: [merchantFeeTable.orderId],
    references: [orderTable.id],
  }),
}));

export type MerchantFee = InferSelectModel<typeof merchantFeeTable>;
```

**Fee Calculation Logic**:

```typescript
// src/lib/merchant-provider/fee-calculator.ts

export interface FeeConfig {
  percentageFee: number; // Basis points (e.g., 290 = 2.9%)
  fixedFee: number;      // Cents (e.g., 30 = $0.30)
}

export const PROVIDER_FEE_CONFIG: Record<MerchantProviderType, FeeConfig> = {
  stripe: {
    percentageFee: 290, // 2.9%
    fixedFee: 30,       // $0.30
  },
  square: {
    percentageFee: 290, // 2.9%
    fixedFee: 30,       // $0.30
  },
};

export interface FeeCalculationResult {
  orderAmount: number;      // cents
  percentageFee: number;    // basis points
  fixedFee: number;         // cents
  totalFee: number;         // cents
  netAmount: number;        // cents
}

/**
 * Calculate merchant processing fees
 * Formula: fee = (orderAmount * percentageFee / 10000) + fixedFee
 */
export function calculateMerchantFee({
  orderAmount,
  merchantProvider,
}: {
  orderAmount: number;
  merchantProvider: MerchantProviderType;
}): FeeCalculationResult {
  const config = PROVIDER_FEE_CONFIG[merchantProvider];

  // Calculate percentage fee (basis points to decimal)
  const percentageFeeAmount = Math.round((orderAmount * config.percentageFee) / 10000);

  // Total fee
  const totalFee = percentageFeeAmount + config.fixedFee;

  // Net amount
  const netAmount = orderAmount - totalFee;

  return {
    orderAmount,
    percentageFee: config.percentageFee,
    fixedFee: config.fixedFee,
    totalFee,
    netAmount,
  };
}

/**
 * Example usage:
 *
 * Order total: $25.00 = 2500 cents
 * Percentage fee: 2.9% = 290 basis points
 * Fixed fee: $0.30 = 30 cents
 *
 * Calculation:
 * - Percentage amount: 2500 * 290 / 10000 = 72.5 → 73 cents
 * - Total fee: 73 + 30 = 103 cents ($1.03)
 * - Net amount: 2500 - 103 = 2397 cents ($23.97)
 */
```

**Provider Interface Updates**:

Update the `WebhookResult` type to include fee information:

```typescript
// src/lib/merchant-provider/types.ts

export interface WebhookResult {
  processed: boolean;
  orderId?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';

  // NEW: Fee information
  feeInfo?: {
    orderAmount: number;
    totalFee: number;
    netAmount: number;
    percentageFee: number;
    fixedFee: number;
  };

  error?: string;
}
```

**Webhook Handler Updates**:

When an order is created via webhook, also create a merchant fee record:

```typescript
// In StripeProvider.handleCheckoutCompleted or SquareProvider.handlePaymentEvent

import { calculateMerchantFee } from '../fee-calculator';

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<WebhookResult> {
  const db = getDB();

  // ... existing order creation logic ...

  const [order] = await db
    .insert(orderTable)
    .values({
      // ... order fields ...
      totalAmount,
    })
    .returning();

  // Calculate and record merchant fee
  const feeCalculation = calculateMerchantFee({
    orderAmount: order.totalAmount,
    merchantProvider: 'stripe',
  });

  await db.insert(merchantFeeTable).values({
    orderId: order.id,
    merchantProvider: 'stripe',
    orderAmount: feeCalculation.orderAmount,
    percentageFee: feeCalculation.percentageFee,
    fixedFee: feeCalculation.fixedFee,
    totalFee: feeCalculation.totalFee,
    netAmount: feeCalculation.netAmount,
    paymentIntentId: session.payment_intent as string,
    calculatedAt: new Date(),
  });

  return {
    processed: true,
    orderId: order.id,
    paymentStatus: 'paid',
    feeInfo: feeCalculation,
  };
}
```

**Admin Stats Queries**:

```typescript
// src/app/(admin)/admin/stats/_actions/revenue.action.ts

import { createServerAction } from "zsa";
import { z } from "zod";
import { getDB } from "@/db";
import { orderTable, merchantFeeTable, ORDER_STATUS, PAYMENT_STATUS } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const getRevenueStatsInputSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
});

export const getRevenueStatsAction = createServerAction()
  .input(getRevenueStatsInputSchema)
  .handler(async ({ input }) => {
    const db = getDB();

    // Get revenue stats with fees
    const stats = await db
      .select({
        // Order totals
        totalOrders: sql<number>`COUNT(DISTINCT ${orderTable.id})`,
        grossRevenue: sql<number>`SUM(${orderTable.totalAmount})`,

        // Fee totals
        totalFees: sql<number>`SUM(${merchantFeeTable.totalFee})`,
        stripeFees: sql<number>`SUM(CASE WHEN ${merchantFeeTable.merchantProvider} = 'stripe' THEN ${merchantFeeTable.totalFee} ELSE 0 END)`,
        squareFees: sql<number>`SUM(CASE WHEN ${merchantFeeTable.merchantProvider} = 'square' THEN ${merchantFeeTable.totalFee} ELSE 0 END)`,

        // Net revenue
        netRevenue: sql<number>`SUM(${merchantFeeTable.netAmount})`,

        // Average order value
        avgOrderValue: sql<number>`AVG(${orderTable.totalAmount})`,
        avgFee: sql<number>`AVG(${merchantFeeTable.totalFee})`,
      })
      .from(orderTable)
      .leftJoin(merchantFeeTable, eq(merchantFeeTable.orderId, orderTable.id))
      .where(
        and(
          eq(orderTable.paymentStatus, PAYMENT_STATUS.PAID),
          gte(orderTable.createdAt, input.startDate),
          lte(orderTable.createdAt, input.endDate)
        )
      )
      .then(rows => rows[0]);

    // Get provider breakdown
    const providerBreakdown = await db
      .select({
        provider: merchantFeeTable.merchantProvider,
        orderCount: sql<number>`COUNT(DISTINCT ${orderTable.id})`,
        grossRevenue: sql<number>`SUM(${orderTable.totalAmount})`,
        totalFees: sql<number>`SUM(${merchantFeeTable.totalFee})`,
        netRevenue: sql<number>`SUM(${merchantFeeTable.netAmount})`,
        avgFee: sql<number>`AVG(${merchantFeeTable.totalFee})`,
      })
      .from(orderTable)
      .leftJoin(merchantFeeTable, eq(merchantFeeTable.orderId, orderTable.id))
      .where(
        and(
          eq(orderTable.paymentStatus, PAYMENT_STATUS.PAID),
          gte(orderTable.createdAt, input.startDate),
          lte(orderTable.createdAt, input.endDate)
        )
      )
      .groupBy(merchantFeeTable.merchantProvider);

    return {
      overview: {
        totalOrders: stats.totalOrders || 0,
        grossRevenue: stats.grossRevenue || 0,      // Total charged to customers
        totalFees: stats.totalFees || 0,            // Total fees paid to providers
        netRevenue: stats.netRevenue || 0,          // Actual revenue after fees
        avgOrderValue: stats.avgOrderValue || 0,
        avgFee: stats.avgFee || 0,

        // Fee breakdown by provider
        stripeFees: stats.stripeFees || 0,
        squareFees: stats.squareFees || 0,
      },
      byProvider: providerBreakdown.map(row => ({
        provider: row.provider,
        orderCount: row.orderCount || 0,
        grossRevenue: row.grossRevenue || 0,
        totalFees: row.totalFees || 0,
        netRevenue: row.netRevenue || 0,
        avgFee: row.avgFee || 0,
        feePercentage: row.grossRevenue ? ((row.totalFees / row.grossRevenue) * 100) : 0,
      })),
    };
  });
```

**Admin Stats Page Example**:

```typescript
// src/app/(admin)/admin/stats/page.tsx

import { getRevenueStatsAction } from "./_actions/revenue.action";
import { formatCurrency } from "@/utils/format";

export default async function StatsPage() {
  const startDate = new Date();
  startDate.setDate(1); // First of month
  const endDate = new Date();

  const [stats] = await getRevenueStatsAction({ startDate, endDate });

  if (!stats) return <div>No data</div>;

  return (
    <div className="space-y-6">
      <h1>Revenue Statistics</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader>Gross Revenue</CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatCurrency(stats.overview.grossRevenue)}
            </p>
            <p className="text-sm text-muted-foreground">
              Total charged to customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Processing Fees</CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              -{formatCurrency(stats.overview.totalFees)}
            </p>
            <p className="text-sm text-muted-foreground">
              Stripe: {formatCurrency(stats.overview.stripeFees)}<br />
              Square: {formatCurrency(stats.overview.squareFees)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Net Revenue</CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(stats.overview.netRevenue)}
            </p>
            <p className="text-sm text-muted-foreground">
              After processing fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Total Orders</CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {stats.overview.totalOrders}
            </p>
            <p className="text-sm text-muted-foreground">
              Avg: {formatCurrency(stats.overview.avgOrderValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Breakdown */}
      <Card>
        <CardHeader>Provider Breakdown</CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Gross Revenue</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead>Fee %</TableHead>
                <TableHead>Net Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.byProvider.map(provider => (
                <TableRow key={provider.provider}>
                  <TableCell className="font-medium capitalize">
                    {provider.provider}
                  </TableCell>
                  <TableCell>{provider.orderCount}</TableCell>
                  <TableCell>{formatCurrency(provider.grossRevenue)}</TableCell>
                  <TableCell className="text-red-600">
                    {formatCurrency(provider.totalFees)}
                  </TableCell>
                  <TableCell>{provider.feePercentage.toFixed(2)}%</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(provider.netRevenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Benefits of Separate Fee Tracking**:

1. **Accurate Revenue Reporting**: Know exactly how much you're paying in fees
2. **Provider Comparison**: Compare actual costs between Stripe and Square
3. **Tax Compliance**: Track net revenue vs gross revenue
4. **Refund Handling**: When refunding, can also track fee refunds
5. **Historical Analysis**: See how fees change over time
6. **Business Intelligence**: Make data-driven decisions about payment providers

### Migration File

```typescript
// src/db/migrations/XXXX_add_merchant_provider_abstraction.sql

-- Add merchantProvider to orders
ALTER TABLE "order" ADD COLUMN merchantProvider TEXT;
UPDATE "order" SET merchantProvider = 'stripe' WHERE stripePaymentIntentId IS NOT NULL;
ALTER TABLE "order" ALTER COLUMN merchantProvider SET NOT NULL;
ALTER TABLE "order" ALTER COLUMN merchantProvider SET DEFAULT 'stripe';

-- Rename payment intent column
ALTER TABLE "order" RENAME COLUMN stripePaymentIntentId TO paymentIntentId;

-- Add merchantProvider to products
ALTER TABLE product ADD COLUMN merchantProvider TEXT DEFAULT 'stripe';

-- Rename product ID columns
ALTER TABLE product RENAME COLUMN stripeProductId TO merchantProductId;
ALTER TABLE product RENAME COLUMN stripePriceId TO merchantPriceId;

-- Update indexes
DROP INDEX IF EXISTS order_stripe_payment_intent_id_idx;
CREATE INDEX order_payment_intent_id_idx ON "order"(paymentIntentId);
CREATE INDEX order_merchant_provider_idx ON "order"(merchantProvider);
CREATE INDEX product_merchant_provider_idx ON product(merchantProvider);

-- Create merchant_fee table for tracking processing fees
CREATE TABLE merchant_fee (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  merchantProvider TEXT NOT NULL,

  -- Fee breakdown
  orderAmount INTEGER NOT NULL,
  percentageFee INTEGER NOT NULL,
  fixedFee INTEGER NOT NULL,
  totalFee INTEGER NOT NULL,

  -- Net revenue
  netAmount INTEGER NOT NULL,

  -- Metadata
  paymentIntentId TEXT,
  calculatedAt INTEGER NOT NULL,

  -- Audit fields
  createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),

  -- Constraints
  CHECK (totalFee >= 0),
  CHECK (netAmount >= 0),
  CHECK (orderAmount = netAmount + totalFee)
);

-- Indexes for merchant_fee
CREATE INDEX merchant_fee_order_id_idx ON merchant_fee(orderId);
CREATE INDEX merchant_fee_merchant_provider_idx ON merchant_fee(merchantProvider);
CREATE INDEX merchant_fee_calculated_at_idx ON merchant_fee(calculatedAt);
CREATE INDEX merchant_fee_created_at_idx ON merchant_fee(createdAt);

-- Backfill merchant fees for existing orders (optional)
-- This is an approximation since we don't have historical fee data
INSERT INTO merchant_fee (id, orderId, merchantProvider, orderAmount, percentageFee, fixedFee, totalFee, netAmount, paymentIntentId, calculatedAt, createdAt, updatedAt)
SELECT
  'mfee_' || substr(id, 5) as id,  -- Generate ID from order ID
  id as orderId,
  'stripe' as merchantProvider,
  totalAmount as orderAmount,
  290 as percentageFee,  -- 2.9%
  30 as fixedFee,        -- $0.30
  CAST(ROUND((totalAmount * 290.0 / 10000.0) + 30) AS INTEGER) as totalFee,
  totalAmount - CAST(ROUND((totalAmount * 290.0 / 10000.0) + 30) AS INTEGER) as netAmount,
  paymentIntentId,
  unixepoch() as calculatedAt,
  createdAt,
  updatedAt
FROM "order"
WHERE paymentStatus = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM merchant_fee WHERE merchant_fee.orderId = "order".id
  );
```

**Note on Backfill**: The migration includes an optional backfill script that creates merchant fee records for existing paid orders. This uses the standard Stripe fee structure (2.9% + $0.30) as an approximation. If you have actual fee data from Stripe's API, you may want to use that instead.

---

## Testing Strategy

### Unit Tests

**Stripe Provider**:
```typescript
// src/lib/merchant-provider/providers/__tests__/stripe.test.ts

describe('StripeProvider', () => {
  let provider: StripeProvider;

  beforeEach(async () => {
    provider = new StripeProvider();
    await provider.initialize();
  });

  describe('createCheckout', () => {
    it('should create checkout session with correct line items', async () => {
      const result = await provider.createCheckout({
        lineItems: [
          { productId: 'prod_123', name: 'Test', price: 2500, quantity: 1 },
        ],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(result.sessionId).toBeDefined();
      expect(result.url).toContain('checkout.stripe.com');
    });
  });

  describe('verifyWebhook', () => {
    it('should verify valid webhook signature', async () => {
      const event = await provider.verifyWebhook(mockBody, mockSignature);
      expect(event.id).toBeDefined();
    });

    it('should throw on invalid signature', async () => {
      await expect(
        provider.verifyWebhook(mockBody, 'invalid')
      ).rejects.toThrow();
    });
  });
});
```

**Square Provider**:
```typescript
// src/lib/merchant-provider/providers/__tests__/square.test.ts

describe('SquareProvider', () => {
  let provider: SquareProvider;

  beforeEach(async () => {
    provider = new SquareProvider();
    await provider.initialize();
  });

  describe('createCheckout', () => {
    it('should create payment link with correct items', async () => {
      const result = await provider.createCheckout({
        lineItems: [
          { productId: 'prod_123', name: 'Test', price: 2500, quantity: 1 },
        ],
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(result.sessionId).toBeDefined();
      expect(result.url).toContain('square.link');
    });
  });

  describe('createProduct', () => {
    it('should handle BigInt amounts correctly', async () => {
      const result = await provider.createProduct({
        name: 'Test Product',
        price: 2500,
      });

      expect(result.productId).toBeDefined();
    });
  });
});
```

### Integration Tests

**End-to-End Checkout Flow**:
```typescript
// tests/integration/checkout.test.ts

describe('Checkout Flow', () => {
  it('should complete purchase with Stripe', async () => {
    process.env.MERCHANT_PROVIDER = 'stripe';
    // Test full checkout flow
  });

  it('should complete purchase with Square', async () => {
    process.env.MERCHANT_PROVIDER = 'square';
    // Test full checkout flow
  });
});
```

### Manual Testing Checklist

#### Stripe
- [ ] Create checkout session
- [ ] Complete payment
- [ ] Receive webhook
- [ ] Order created in database
- [ ] Inventory reduced
- [ ] Email sent
- [ ] SMS sent (if opted in)
- [ ] Refund payment

#### Square
- [ ] Create payment link
- [ ] Complete payment
- [ ] Receive webhook
- [ ] Order created in database
- [ ] Inventory reduced
- [ ] Email sent
- [ ] SMS sent (if opted in)
- [ ] Refund payment

---

## Rollback Plan

### Immediate Rollback (< 5 minutes)

**Trigger**: Critical failure, payment processing broken

**Steps**:
1. Set `MERCHANT_PROVIDER=stripe` in environment
2. Restart application (or use feature flag)
3. Verify Stripe payments working
4. Investigate Square issue

**Command**:
```bash
# Update environment variable
echo "MERCHANT_PROVIDER=stripe" >> .dev.vars

# Restart
pnpm deploy
```

### Partial Rollback

**Trigger**: High error rate with Square

**Steps**:
1. Reduce `SQUARE_ROLLOUT_PERCENTAGE` to 0
2. Monitor for 24 hours
3. Fix issues
4. Resume rollout

### Data Rollback

**Trigger**: Data inconsistency

**Steps**:
1. Stop all payment processing
2. Run data reconciliation script
3. Fix inconsistencies
4. Resume processing with Stripe
5. Audit Square integration

### Communication Plan

**Internal**:
- Slack alert: "#engineering-alerts"
- Email: engineering@company.com
- Incident ticket created

**External** (if customer-facing):
- Status page update
- Support team notified
- Email to affected customers (if necessary)

---

## Monitoring & Alerting

### Key Metrics

**Payment Processing**:
- Payment success rate (target: >98%)
- Average transaction time (target: <3s)
- Webhook processing time (target: <1s)
- Checkout completion rate (target: >80%)

**Errors**:
- Payment failures by provider
- Webhook verification failures
- Timeout errors
- Invalid signature errors

**Business Metrics**:
- Revenue by provider
- Average order value by provider
- Refund rate by provider

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Payment Success Rate | <95% | <90% |
| Webhook Failures | >5/hour | >20/hour |
| Transaction Time | >5s | >10s |
| Error Rate | >1% | >5% |

### Monitoring Tools

**Recommended**:
- **Application**: Sentry, Datadog, New Relic
- **Infrastructure**: Cloudflare Analytics
- **Payments**: Stripe Dashboard, Square Dashboard
- **Logs**: Cloudflare Logs, Wrangler Tail

---

## Cost Analysis

### Stripe Pricing
- **Card Payments**: 2.9% + $0.30 per transaction
- **No monthly fees** (standard plan)

### Square Pricing
- **Card Payments**: 2.9% + $0.30 per transaction (online)
- **No monthly fees** (standard plan)

### Cost Comparison

For **$10,000/month** revenue:
- **Stripe**: ~$320 in fees
- **Square**: ~$320 in fees

**Verdict**: Nearly identical pricing for online payments.

### Hidden Costs

**Migration Costs**:
- Development time: ~6 weeks
- Testing: 1-2 weeks
- Risk mitigation: Ongoing

**Ongoing Costs**:
- Maintenance of abstraction layer
- Support for two providers (temporarily)

---

## Frequently Asked Questions

### Q: Why abstract both providers instead of direct migration?

**A**: Abstraction provides flexibility. If Square doesn't work out, reverting to Stripe is trivial. Also enables multi-provider strategies (A/B testing, regional preferences).

### Q: Can we keep some customers on Stripe?

**A**: Yes! The abstraction layer supports this. Store `merchantProvider` per order/customer.

### Q: What about existing Stripe subscriptions?

**A**: Subscriptions require separate migration. If you have Stripe subscriptions, they should remain on Stripe or be manually migrated to Square Subscriptions API.

### Q: Performance impact of abstraction layer?

**A**: Minimal. The abstraction is thin and only adds one level of indirection. In production, provider selection happens once at initialization.

### Q: How to test both providers locally?

**A**: Use environment variables:
```bash
# Test Stripe
MERCHANT_PROVIDER=stripe pnpm dev

# Test Square
MERCHANT_PROVIDER=square pnpm dev
```

### Q: What about PCI compliance?

**A**: Both Stripe and Square are PCI Level 1 certified. Using their hosted checkout pages (Checkout Sessions / Payment Links) keeps your application out of PCI scope.

---

## Next Steps

### Immediate Actions

1. **Review this document** with engineering team
2. **Create Square sandbox account** for testing
3. **Set up development environment** with both providers
4. **Create implementation tickets** in project management tool
5. **Schedule kickoff meeting** to discuss timeline

### Week 1 Priorities

1. Implement base abstraction types
2. Set up provider factory
3. Begin Stripe provider refactor
4. Configure Square sandbox

### Success Criteria

- [ ] All tests passing for both providers
- [ ] Zero downtime during migration
- [ ] Payment success rate maintained
- [ ] No customer complaints
- [ ] Clean rollback capability

---

## Appendix

### A. Environment Variables Reference

```bash
# Merchant Provider
MERCHANT_PROVIDER=stripe|square

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Square
SQUARE_ACCESS_TOKEN=sq0atp-...
SQUARE_LOCATION_ID=L...
SQUARE_ENVIRONMENT=sandbox|production
SQUARE_WEBHOOK_SIGNATURE_KEY=...

# Rollout
SQUARE_ROLLOUT_PERCENTAGE=0-100
```

### B. Useful Commands

```bash
# Test Stripe
MERCHANT_PROVIDER=stripe pnpm dev

# Test Square
MERCHANT_PROVIDER=square pnpm dev

# Sync products to Stripe
pnpm tsx scripts/sync-stripe.mjs

# Sync products to Square
pnpm tsx scripts/sync-square.mjs

# Tail webhook logs
pnpm wrangler tail --format json | grep webhook

# Check current provider
echo $MERCHANT_PROVIDER
```

### C. Square API Resources

- [Square API Reference](https://developer.squareup.com/reference/square)
- [Square Node.js SDK](https://github.com/square/square-nodejs-sdk)
- [Checkout API Guide](https://developer.squareup.com/docs/checkout-api/what-it-does)
- [Webhooks Guide](https://developer.squareup.com/docs/webhooks/overview)
- [Catalog API Guide](https://developer.squareup.com/docs/catalog-api/what-it-does)

### D. Stripe API Resources

- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Node.js SDK](https://github.com/stripe/stripe-node)
- [Checkout Sessions](https://stripe.com/docs/payments/checkout)
- [Webhooks](https://stripe.com/docs/webhooks)

---

**Document End**

*Last Updated: 2025-10-22*
*Authors: Engineering Team*
*Status: Ready for Implementation*
