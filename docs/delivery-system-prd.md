# Delivery System PRD

## Overview

A configurable delivery scheduling system for Sweet Angel Bakery that groups orders into preset delivery windows, allowing the owner to efficiently manage deliveries on fixed days while clearly communicating delivery expectations to customers.

## Problem Statement

As a small bakery with owner-operated deliveries, we cannot fulfill on-demand orders. We need a system that:
- Groups orders into manageable delivery batches
- Clearly communicates delivery dates to customers at checkout
- Allows flexible configuration of delivery schedules
- Supports per-product delivery restrictions
- Offers pickup as an alternative to paid delivery
- Enables configurable delivery fees that can be adjusted without code changes
- Integrates delivery fees with Stripe checkout
- Adapts to changing business needs without code changes

## Goals

### Primary Goals
1. Enable customers to know exactly when their order will be delivered/ready for pickup before checkout
2. Group orders into delivery windows that align with owner availability
3. Allow admin to configure delivery schedules and fees without developer intervention
4. Support different delivery rules and fees for different products
5. Provide pickup as a free alternative to paid delivery
6. Display accurate total costs including delivery fees at checkout and in Stripe

### Secondary Goals
1. Minimize customer confusion about delivery timing and costs
2. Reduce support inquiries about delivery dates and fees
3. Provide clear admin view of orders grouped by delivery date and pickup location
4. Enable seasonal/temporary schedule and fee changes
5. Allow experimentation with delivery pricing models

## User Stories

### Customer Stories
- As a customer, I want to see the delivery date and fee before placing my order so I can plan accordingly
- As a customer, I want to choose pickup to avoid delivery fees
- As a customer, I want to know which pickup locations are available and when
- As a customer, I want to understand why certain products have different delivery windows
- As a customer, I want to see the total cost including delivery fee before Stripe checkout
- As a customer, I want to receive my order on the promised delivery/pickup date

### Admin/Owner Stories
- As the owner, I want to set my delivery days (e.g., Wed/Sat) so orders group accordingly
- As the owner, I want to configure delivery fees that I can easily change as I experiment
- As the owner, I want to set up pickup locations as free alternatives to delivery
- As the owner, I want to see all orders grouped by delivery date and pickup location
- As the owner, I want to change delivery schedules and fees for holidays or special events
- As the owner, I want to restrict certain products to specific delivery days (e.g., wedding cakes only on Saturdays)
- As the owner, I want to set order cutoff times for each delivery window
- As the owner, I want different delivery fees for different zones or product types

## Functional Requirements

### 1. Delivery Schedule Configuration

**Admin Interface:**
- Define weekly delivery days (e.g., Wednesday, Saturday)
- Set cutoff rules for each delivery day
- Enable/disable delivery schedule temporarily
- Configure lead time requirements (minimum days before delivery)

**Data Structure:**
```typescript
DeliverySchedule {
  id: string
  dayOfWeek: 0-6 // 0=Sunday, 6=Saturday
  cutoffDay: 0-6 // Day when orders stop being accepted for this delivery
  cutoffTime: string // "23:59" format
  isActive: boolean
  leadTimeDays: number // Minimum days before delivery
  deliveryTimeWindow: string // "9:00 AM - 5:00 PM"
}
```

**Example Configuration:**
```
Wednesday Deliveries:
- Cutoff: Tuesday 11:59 PM
- Lead time: 1 day minimum
- Delivery window: 10:00 AM - 4:00 PM

Saturday Deliveries:
- Cutoff: Friday 11:59 PM
- Lead time: 1 day minimum
- Delivery window: 9:00 AM - 2:00 PM
```

### 2. Pickup Locations Configuration

**Admin Interface:**
- Create/edit pickup locations
- Set available pickup days/times
- Enable/disable locations temporarily
- Display location details to customers

**Data Structure:**
```typescript
PickupLocation {
  id: string
  name: string // "Main Bakery", "Farmers Market Stand"
  address: string // JSON: { street, city, state, zip }
  pickupDays: number[] // [3, 6] = Wed/Sat
  pickupTimeWindows: string // "10:00 AM - 6:00 PM"
  instructions: string // "Enter through back door"
  isActive: boolean
  requiresPreorder: boolean // Must order by cutoff
  cutoffDay: number // Day when orders stop
  cutoffTime: string // "23:59"
  leadTimeDays: number // Minimum days before pickup
}
```

**Example Configurations:**
```
Main Bakery Location:
- Name: Sweet Angel Bakery - Main Store
- Address: 123 Main St, Seattle, WA
- Pickup Days: Monday, Wednesday, Friday, Saturday
- Pickup Hours: 9:00 AM - 6:00 PM
- Cutoff: Day before at 11:59 PM
- Instructions: "Ring bell at entrance"

Farmers Market Stand:
- Name: Saturday Farmers Market
- Address: Pike Place Market, Seattle, WA
- Pickup Days: Saturday only
- Pickup Hours: 8:00 AM - 2:00 PM
- Cutoff: Thursday 11:59 PM
- Instructions: "Look for Sweet Angel tent"
- Requires Preorder: Yes (2-day lead time)
```

### 3. Delivery Fee Configuration

**Admin Interface:**
- Configure base delivery fee
- Set fee rules by distance/zone
- Set fee rules by order amount (free over $X)
- Set fee rules by product category
- Override fees for special days/seasons

**Data Structure:**
```typescript
DeliveryFeeRule {
  id: string
  name: string // "Standard Delivery", "Wedding Cake Premium"
  ruleType: 'base' | 'distance' | 'order_amount' | 'product_category' | 'custom'
  feeAmount: number // In cents (e.g., 1000 = $10.00)
  isActive: boolean
  priority: number // Higher priority rules override lower

  // Conditional fields based on ruleType
  minimumOrderAmount?: number // For order_amount type
  freeDeliveryThreshold?: number // Free if order > this amount
  distanceRangeMin?: number // For distance type (miles)
  distanceRangeMax?: number
  productCategoryIds?: string[] // For product_category type
  zipCodes?: string[] // For zone-based delivery

  createdAt: string
  updatedAt: string
}
```

**Fee Calculation Algorithm:**
```
1. Start with base delivery fee (if exists)
2. Check if order meets free delivery threshold → Fee = $0
3. Apply product category fee overrides (highest priority)
4. Apply distance-based fees (if configured)
5. Apply any special promotional fees
6. Return final calculated fee

Example:
- Base fee: $8.00
- Order amount: $45.00
- Free delivery threshold: $50.00
- Final fee: $8.00 (threshold not met)

Example 2:
- Base fee: $8.00
- Order includes wedding cake (premium fee: $15.00)
- Final fee: $15.00 (category override)
```

**Example Fee Configurations:**

```
Configuration A: Simple Flat Fee
- Base delivery fee: $10.00
- Free delivery over $75.00

Configuration B: Tiered by Amount
- Orders under $50: $12.00
- Orders $50-$100: $8.00
- Orders over $100: Free

Configuration C: Product-Specific
- Standard items: $8.00
- Wedding cakes: $20.00 (premium handling)
- Cookies only: $5.00

Configuration D: Zone-Based
- Zone 1 (Downtown): $8.00
- Zone 2 (Suburbs): $12.00
- Zone 3 (Extended area): $18.00
- Pickup: $0.00
```

### 4. Delivery Date Calculation Logic

**Algorithm:**
```
1. Current date/time = Order placement time
2. Get all active delivery schedules, sorted by day of week
3. For each delivery schedule:
   - Calculate next occurrence of delivery day
   - Check if current time is before cutoff
   - Verify lead time requirement met
   - Apply product-specific restrictions
4. Return earliest valid delivery date
```

**Edge Cases:**
- Order placed on delivery day (after cutoff) → Goes to next delivery
- Order placed on delivery day (before cutoff) → Check lead time
- No delivery days configured → Show error, prevent checkout
- Product requires 3-day lead time but next delivery is in 2 days → Skip to following delivery
- Order placed on Saturday for Wednesday delivery with 1-day lead time → Valid (4 days)

### 5. Fulfillment Method Selection

**Customer Choice:**
At checkout, customer selects:
- **Delivery**: Paid service with scheduled delivery date + delivery fee
- **Pickup**: Free, choose pickup location and date

**Logic:**
```
If customer selects "Delivery":
  → Calculate delivery date
  → Calculate delivery fee
  → Require delivery address
  → Add delivery fee to Stripe line items

If customer selects "Pickup":
  → Show available pickup locations
  → Calculate pickup date based on location's schedule
  → Delivery fee = $0.00
  → Require phone number for pickup notification
```

### 6. Product-Specific Delivery Rules

**Per-Product Configuration:**
```typescript
ProductDeliveryRules {
  productId: string
  allowedDeliveryDays: number[] // [3, 6] = Wed/Sat only
  minimumLeadTimeDays: number // Override global lead time
  requiresSpecialHandling: boolean
  deliveryNotes: string // Display to customer
}
```

**Use Cases:**
- Wedding cakes: Saturday delivery only, 7-day lead time
- Cookies: Any delivery day, 1-day lead time
- Custom decorated cakes: Wed/Sat, 3-day lead time
- Bread: Any delivery day, same-day if before cutoff

### 7. Customer-Facing Display

**Product Page:**
```
[Product Details]

Fulfillment Options:
🚚 Delivery: Next available Wednesday, October 23 (Delivery fee: $8.00)
📦 Pickup: Available at 2 locations (Free)

⏰ Order by Tuesday 11:59 PM

[Add to Cart]
```

**Cart Page:**
```
Your Order
-----------
Item 1: Chocolate Chip Cookies (x2) - $24.00
Item 2: Custom Birthday Cake (x1) - $45.00
                           Subtotal: $69.00

Fulfillment Method:
┌──────────────────────────────────────────┐
│ ○ Delivery ($8.00)                       │
│   Next available: Saturday, Oct 26       │
│   Window: 9:00 AM - 2:00 PM              │
│                                           │
│ ● Pickup (Free)                          │
│   ↓ Select location:                     │
│   ● Sweet Angel Bakery - Main Store      │
│     123 Main St, Seattle                 │
│     Next available: Saturday, Oct 26     │
│     Hours: 9:00 AM - 6:00 PM             │
│                                           │
│   ○ Saturday Farmers Market              │
│     Pike Place Market                    │
│     Next available: Saturday, Oct 26     │
│     Hours: 8:00 AM - 2:00 PM             │
└──────────────────────────────────────────┘

⚠️ Birthday Cake requires 3-day lead time
Earliest available: Saturday, October 26
Order by: Thursday, October 24 at 11:59 PM

                    Delivery Fee: $0.00
                           Total: $69.00

[Continue to Checkout]
```

**Checkout Page:**
```
Order Summary
-------------
Chocolate Chip Cookies (x2)         $24.00
Custom Birthday Cake (x1)           $45.00
                         Subtotal:  $69.00
                     Delivery Fee:   $0.00
                            Total:  $69.00

Pickup Details
--------------
📍 Sweet Angel Bakery - Main Store
    123 Main St, Seattle, WA 98101

📅 Pickup Date: Saturday, October 26
⏰ Pickup Hours: 9:00 AM - 6:00 PM
✅ Order cutoff: Thursday, October 24 at 11:59 PM

📱 Phone: (555) 123-4567
💬 Pickup Instructions:
   Ring bell at entrance

[Place Order - $69.00]
```

**Stripe Checkout Integration:**
```
Line Items sent to Stripe:
- Chocolate Chip Cookies (x2): $24.00
- Custom Birthday Cake (x1): $45.00
- Delivery Fee: $8.00 (if delivery selected, otherwise $0.00)

Total charged: $77.00

Metadata (stored with Stripe session):
- fulfillmentMethod: "delivery" | "pickup"
- deliveryDate: "2024-10-26" (if delivery)
- pickupDate: "2024-10-26" (if pickup)
- pickupLocationId: "ploc_abc123" (if pickup)
- pickupLocationName: "Main Store" (if pickup)
- deliveryAddress: {...} (if delivery)
- deliveryFeeRuleId: "dfeer_abc" (if delivery)
- deliveryFeeAmount: 800 (cents, if delivery)
```

### 8. Admin Order Management

**Orders Overview (Grouped by Fulfillment):**
```
Saturday, October 26
====================

Deliveries (5 orders) - Total revenue: $385.00
├─ Order #001 - John Smith - $77.00 ($69 + $8 delivery)
├─ Order #002 - Jane Doe - $95.00 ($85 + $10 delivery)
└─ [View all deliveries]
   [Print Delivery Routes] [Export to CSV]

Pickups at Main Store (8 orders) - Total revenue: $624.00
├─ Order #003 - Bob Johnson - $78.00
├─ Order #004 - Alice Williams - $124.00
└─ [View all pickups]
   [Print Pickup List]

Pickups at Farmers Market (3 orders) - Total revenue: $187.00
├─ Order #005 - Sarah Chen - $65.00
└─ [View all]
   [Print Pickup List]
```

**Individual Order (Delivery):**
```
Order #001
----------
Customer: John Smith
Contact: (555) 123-4567

Fulfillment: DELIVERY
Delivery Date: Saturday, October 26
Delivery Window: 9:00 AM - 2:00 PM
Address: 123 Main St, Seattle, WA 98101
Special Instructions: "Leave at front door if not home"

Items:
- Chocolate Cake - $28.00
- Cookies (2 dozen) - $41.00
                Subtotal: $69.00
            Delivery Fee: $8.00
                   Total: $77.00

Payment: Paid via Stripe (ch_abc123)
Status: Confirmed
[Mark as Prepared] [Mark as Out for Delivery] [Mark as Delivered]
```

**Individual Order (Pickup):**
```
Order #003
----------
Customer: Bob Johnson
Contact: (555) 987-6543

Fulfillment: PICKUP
Pickup Location: Sweet Angel Bakery - Main Store
                 123 Main St, Seattle, WA 98101
Pickup Date: Saturday, October 26
Pickup Hours: 9:00 AM - 6:00 PM
Special Instructions: "Customer has allergies - keep separate"

Items:
- Chocolate Cake - $28.00
- Cookies (2 dozen) - $50.00
                Subtotal: $78.00
            Delivery Fee: $0.00
                   Total: $78.00

Payment: Paid via Stripe (ch_def456)
Status: Confirmed
[Mark as Prepared] [Mark as Ready for Pickup] [Mark as Picked Up]
```

## Technical Design

### Database Schema

```typescript
// New tables to add to schema.ts

deliveryScheduleTable = sqliteTable("delivery_schedule", {
  id: text("id").primaryKey(), // delsch_*
  dayOfWeek: integer("day_of_week").notNull(), // 0-6
  cutoffDay: integer("cutoff_day").notNull(),
  cutoffTime: text("cutoff_time").notNull(), // "23:59"
  leadTimeDays: integer("lead_time_days").default(1),
  deliveryTimeWindow: text("delivery_time_window"),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

pickupLocationTable = sqliteTable("pickup_location", {
  id: text("id").primaryKey(), // ploc_*
  teamId: text("team_id").notNull().references(() => teamsTable.id),
  name: text("name").notNull(),
  address: text("address").notNull(), // JSON: { street, city, state, zip }
  pickupDays: text("pickup_days").notNull(), // JSON array [0,3,5,6]
  pickupTimeWindows: text("pickup_time_windows").notNull(), // "10:00 AM - 6:00 PM"
  instructions: text("instructions"),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  requiresPreorder: integer("requires_preorder", { mode: 'boolean' }).default(false),
  cutoffDay: integer("cutoff_day"),
  cutoffTime: text("cutoff_time"),
  leadTimeDays: integer("lead_time_days").default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

deliveryFeeRuleTable = sqliteTable("delivery_fee_rule", {
  id: text("id").primaryKey(), // dfeer_*
  teamId: text("team_id").notNull().references(() => teamsTable.id),
  name: text("name").notNull(),
  ruleType: text("rule_type").notNull(), // 'base' | 'distance' | 'order_amount' | 'product_category' | 'custom'
  feeAmount: integer("fee_amount").notNull(), // In cents
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  priority: integer("priority").default(0),

  // Conditional fields
  minimumOrderAmount: integer("minimum_order_amount"), // cents
  freeDeliveryThreshold: integer("free_delivery_threshold"), // cents
  distanceRangeMin: real("distance_range_min"), // miles
  distanceRangeMax: real("distance_range_max"), // miles
  productCategoryIds: text("product_category_ids"), // JSON array
  zipCodes: text("zip_codes"), // JSON array

  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

productDeliveryRulesTable = sqliteTable("product_delivery_rules", {
  id: text("id").primaryKey(), // pdelr_*
  productId: text("product_id").notNull().references(() => productsTable.id),
  allowedDeliveryDays: text("allowed_delivery_days"), // JSON array [3,6]
  minimumLeadTimeDays: integer("minimum_lead_time_days"),
  requiresSpecialHandling: integer("requires_special_handling", { mode: 'boolean' }),
  deliveryNotes: text("delivery_notes"),
  allowPickup: integer("allow_pickup", { mode: 'boolean' }).default(true),
  allowDelivery: integer("allow_delivery", { mode: 'boolean' }).default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

// Add to existing ordersTable
ordersTable = sqliteTable("orders", {
  // ... existing fields ...

  // Fulfillment method
  fulfillmentMethod: text("fulfillment_method").notNull(), // 'delivery' | 'pickup'

  // Delivery fields (if fulfillmentMethod === 'delivery')
  deliveryDate: text("delivery_date"), // ISO date string
  deliveryTimeWindow: text("delivery_time_window"),
  deliveryAddress: text("delivery_address"), // JSON
  deliveryInstructions: text("delivery_instructions"),
  deliveryFee: integer("delivery_fee"), // In cents
  deliveryStatus: text("delivery_status"), // pending, confirmed, preparing, out_for_delivery, delivered

  // Pickup fields (if fulfillmentMethod === 'pickup')
  pickupLocationId: text("pickup_location_id").references(() => pickupLocationTable.id),
  pickupDate: text("pickup_date"), // ISO date string
  pickupTimeWindow: text("pickup_time_window"),
  pickupStatus: text("pickup_status"), // pending, confirmed, preparing, ready_for_pickup, picked_up
  pickupInstructions: text("pickup_instructions"),
})
```

### Core Functions

```typescript
// src/utils/delivery.ts

/**
 * Calculate next available delivery date for a product
 */
export async function getNextDeliveryDate({
  productId,
  orderDate = new Date(),
}: {
  productId: string
  orderDate?: Date
}): Promise<{
  deliveryDate: Date
  cutoffDate: Date
  timeWindow: string
  schedule: DeliverySchedule
} | null>

/**
 * Get available pickup locations for a product
 */
export async function getAvailablePickupLocations({
  productId,
  orderDate = new Date(),
  teamId: string
}): Promise<{
  locationId: string
  name: string
  address: Address
  nextPickupDate: Date
  pickupTimeWindow: string
  instructions: string
}[]>

/**
 * Calculate pickup date for a specific location
 */
export async function getNextPickupDate({
  pickupLocationId,
  productId?,
  orderDate = new Date(),
}): Promise<{
  pickupDate: Date
  cutoffDate: Date
  timeWindow: string
} | null>

/**
 * Calculate delivery date for entire cart
 * Returns latest delivery date if products have different requirements
 */
export async function getCartDeliveryDate({
  items: { productId: string; quantity: number }[]
  orderDate?: Date
}): Promise<{
  deliveryDate: Date
  cutoffDate: Date
  timeWindow: string
  itemsGroupedByDate: Map<string, string[]> // ISO date -> productIds
}>

/**
 * Calculate delivery fee for an order
 */
export async function calculateDeliveryFee({
  cartItems: { productId: string; quantity: number; price: number }[]
  deliveryAddress: Address
  teamId: string
}): Promise<{
  feeAmount: number // In cents
  appliedRule: DeliveryFeeRule
  breakdown: {
    baseFee: number
    adjustments: { reason: string; amount: number }[]
  }
}>

/**
 * Validate if order can still make delivery cutoff
 */
export async function validateDeliveryCutoff({
  deliveryDate: Date
  orderDate?: Date
}): Promise<{
  isValid: boolean
  reason?: string
}>

/**
 * Get all orders grouped by delivery date and pickup location
 */
export async function getOrdersByFulfillment({
  startDate?: Date
  endDate?: Date
  teamId: string
}): Promise<{
  deliveries: Map<string, Order[]> // ISO date -> orders
  pickups: Map<string, Map<string, Order[]>> // ISO date -> locationId -> orders
}>
```

### UI Components

```typescript
// src/components/fulfillment-method-selector.tsx
export function FulfillmentMethodSelector({
  cartItems: CartItem[]
  onMethodChange: (method: 'delivery' | 'pickup') => void
  onPickupLocationChange: (locationId: string) => void
})

// src/components/pickup-location-card.tsx
export function PickupLocationCard({
  location: PickupLocation
  nextAvailableDate: Date
  isSelected: boolean
  onSelect: () => void
})

// src/components/delivery-fee-display.tsx
export function DeliveryFeeDisplay({
  feeAmount: number
  breakdown?: FeeBreakdown
  showBreakdown?: boolean
})

// src/components/delivery-info-badge.tsx
export function DeliveryInfoBadge({
  deliveryDate: Date
  cutoffDate: Date
  compact?: boolean
})

// Admin Components

// src/app/(admin)/admin/delivery-schedule/page.tsx
// Admin page for configuring delivery schedules

// src/app/(admin)/admin/pickup-locations/page.tsx
// Admin page for managing pickup locations

// src/app/(admin)/admin/delivery-fees/page.tsx
// Admin page for configuring delivery fee rules

// src/app/(admin)/admin/orders/by-fulfillment/page.tsx
// View orders grouped by delivery date and pickup location

// src/app/(admin)/admin/orders/[orderId]/page.tsx
// Individual order view with fulfillment details
```

### Stripe Integration

**Creating Checkout Session:**
```typescript
// src/app/(storefront)/_actions/create-checkout-session.action.ts

export async function createCheckoutSession({
  cartItems: CartItem[]
  fulfillmentMethod: 'delivery' | 'pickup'
  deliveryAddress?: Address
  pickupLocationId?: string
  teamId: string
}) {
  // 1. Calculate delivery fee (if delivery)
  let deliveryFee = 0
  if (fulfillmentMethod === 'delivery' && deliveryAddress) {
    const feeResult = await calculateDeliveryFee({
      cartItems,
      deliveryAddress,
      teamId
    })
    deliveryFee = feeResult.feeAmount
  }

  // 2. Calculate fulfillment date
  const fulfillmentDate = fulfillmentMethod === 'delivery'
    ? await getCartDeliveryDate({ items: cartItems })
    : await getNextPickupDate({ pickupLocationId, cartItems })

  // 3. Build Stripe line items
  const lineItems = [
    ...cartItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.productName,
          images: [item.productImage]
        },
        unit_amount: item.price // in cents
      },
      quantity: item.quantity
    })),
    // Add delivery fee as separate line item
    ...(deliveryFee > 0 ? [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Delivery Fee',
          description: `Delivery on ${format(fulfillmentDate, 'MMM dd, yyyy')}`
        },
        unit_amount: deliveryFee // in cents
      },
      quantity: 1
    }] : [])
  ]

  // 4. Create Stripe session with metadata
  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: 'payment',
    success_url: `${baseUrl}/orders/{CHECKOUT_SESSION_ID}/success`,
    cancel_url: `${baseUrl}/cart`,
    metadata: {
      teamId,
      fulfillmentMethod,
      ...(fulfillmentMethod === 'delivery' ? {
        deliveryDate: fulfillmentDate.toISOString(),
        deliveryAddress: JSON.stringify(deliveryAddress),
        deliveryFeeAmount: deliveryFee.toString(),
        deliveryFeeRuleId: feeResult.appliedRule.id
      } : {
        pickupDate: fulfillmentDate.toISOString(),
        pickupLocationId,
        pickupLocationName: location.name
      })
    }
  })

  return { sessionId: session.id }
}
```

**Webhook Handler (Order Creation):**
```typescript
// src/app/api/webhooks/stripe/route.ts

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata

  // Create order with fulfillment details
  await db.insert(ordersTable).values({
    id: generateId('order'),
    teamId: metadata.teamId,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    totalAmount: session.amount_total, // includes delivery fee

    fulfillmentMethod: metadata.fulfillmentMethod,

    // Delivery fields
    ...(metadata.fulfillmentMethod === 'delivery' ? {
      deliveryDate: metadata.deliveryDate,
      deliveryAddress: metadata.deliveryAddress,
      deliveryFee: parseInt(metadata.deliveryFeeAmount),
      deliveryStatus: 'pending'
    } : {}),

    // Pickup fields
    ...(metadata.fulfillmentMethod === 'pickup' ? {
      pickupLocationId: metadata.pickupLocationId,
      pickupDate: metadata.pickupDate,
      pickupStatus: 'pending'
    } : {})
  })
}
```

## User Flows

### Flow 1: Customer Orders Single Product with Delivery

1. Customer browses products
2. Views product page → Sees "Delivery: Wed, Oct 23 ($8.00) | Pickup: Available (Free)"
3. Adds to cart
4. Views cart → Selects "Delivery" → Sees delivery fee $8.00
5. Proceeds to checkout
6. Enters delivery address
7. Reviews order summary: Subtotal $45.00 + Delivery $8.00 = Total $53.00
8. Proceeds to Stripe checkout
9. Stripe shows line items: Product ($45.00) + Delivery Fee ($8.00)
10. Completes payment
11. Receives confirmation email with delivery date and total

### Flow 2: Customer Chooses Pickup to Avoid Fee

1. Customer adds cookies to cart ($24.00)
2. Views cart → Sees "Delivery: $8.00 | Pickup: Free"
3. Selects "Pickup"
4. Views 2 available pickup locations
5. Selects "Main Store - Saturday, Oct 26, 9AM-6PM"
6. Enters phone number
7. Proceeds to checkout
8. Reviews order summary: Subtotal $24.00 + Delivery $0.00 = Total $24.00
9. Proceeds to Stripe checkout
10. Stripe shows: Cookies ($24.00) only
11. Completes payment
12. Receives confirmation email with pickup location and date

### Flow 3: Customer Orders Mixed Products

1. Customer adds cookies (1-day lead) to cart
2. Adds custom cake (3-day lead) to cart
3. Views cart → Warning shown: "Delivery date based on longest lead time"
4. Cart shows: "Delivery: Saturday, Oct 26 ($10 fee) | Pickup: Saturday, Oct 26 (Free)"
5. Customer selects Pickup to save $10
6. Selects pickup location
7. Proceeds with unified pickup
8. Completes checkout

### Flow 4: Admin Configures Delivery Schedule

1. Admin navigates to Settings → Delivery Schedule
2. Views current schedule (Wed/Sat)
3. Clicks "Add Delivery Day"
4. Selects Friday
5. Sets cutoff: Thursday 11:59 PM
6. Sets delivery window: 2:00 PM - 6:00 PM
7. Sets lead time: 1 day
8. Saves
9. System validates (no conflicts)
10. New schedule active immediately

### Flow 5: Admin Configures Pickup Location

1. Admin navigates to Settings → Pickup Locations
2. Views existing locations (Main Store)
3. Clicks "Add Pickup Location"
4. Enters name: "Saturday Farmers Market"
5. Enters address
6. Selects pickup days: Saturday only
7. Sets pickup hours: 8:00 AM - 2:00 PM
8. Sets cutoff: Thursday 11:59 PM
9. Enters pickup instructions
10. Saves
11. New location available to customers immediately

### Flow 6: Admin Configures Delivery Fees

1. Admin navigates to Settings → Delivery Fees
2. Views existing rules (Base: $8.00)
3. Clicks "Add Fee Rule"
4. Selects rule type: "Order Amount"
5. Sets threshold: Free delivery over $75.00
6. Sets priority: High
7. Saves
8. System recalculates fees for pending orders
9. New rule applies to all future orders

### Flow 7: Admin Changes Delivery Fee (Experimentation)

1. Admin notices low delivery orders
2. Navigates to Settings → Delivery Fees
3. Edits "Base Delivery Fee"
4. Changes from $10.00 to $6.00
5. Saves
6. System immediately applies to new orders
7. Monitors conversion rate over next week
8. Adjusts again if needed

### Flow 8: Admin Reviews Orders by Fulfillment

1. Admin navigates to Orders → By Fulfillment
2. Selects "Saturday, Oct 26"
3. Views grouped view:
   - 5 deliveries ($385 total)
   - 8 pickups at Main Store ($624 total)
   - 3 pickups at Farmers Market ($187 total)
4. Exports deliveries to CSV for route planning
5. Prints pickup lists for each location
6. Marks orders as "Preparing"
7. Saturday morning: Marks deliveries as "Out for Delivery"
8. Saturday: Marks pickups as "Ready for Pickup"
9. As customers pick up: Marks as "Picked Up"
10. Customers receive status notifications

## Edge Cases & Validation

### Time Zone Handling
- All times stored in UTC
- Display in business local time (configurable)
- Cutoff calculated in local time zone

### Holiday/Closure Management
- Admin can mark specific dates as "No Delivery"
- System skips to next available delivery day
- Display message: "Delivery delayed due to [reason]"

### Order After Cutoff
- Show next available delivery automatically
- Display: "You missed the cutoff for [date]. Next delivery: [date]"

### Minimum Lead Time Violations
- Prevent checkout if not enough time
- Display: "This item requires X days lead time. Next available: [date]"

### Product Out of Stock Before Delivery
- Send customer notification
- Offer refund or substitution
- Mark order for admin review

### Address Outside Delivery Zone
- Validate address at checkout
- Show error if outside zone
- Suggest nearest pickup location as alternative
- Future: Define delivery zones in admin

### Delivery Fee Changes Mid-Checkout
- Lock delivery fee when cart is viewed
- If fee changes during checkout, show warning
- Allow customer to accept new fee or cancel

### Product Not Eligible for Pickup
- Some products (e.g., wedding cakes) may be delivery-only
- Hide pickup option if cart contains delivery-only items
- Display message: "This order contains items that require delivery"

### No Pickup Locations Available
- If all locations inactive or no locations configured
- Hide pickup option
- Display message: "Pickup not currently available"

### Pickup Location Closes Before Order Ready
- If location becomes inactive after order placed
- Admin must reassign to different location or contact customer
- Send notification to customer about change

## Configuration UI Design

### Admin Settings → Delivery Schedule

```
Delivery Schedule Configuration
================================

Active Delivery Days:
┌─────────────────────────────────────┐
│ Wednesday                    [Edit] │
│ Cutoff: Tuesday 11:59 PM            │
│ Lead time: 1 day                    │
│ Window: 10:00 AM - 4:00 PM          │
├─────────────────────────────────────┤
│ Saturday                     [Edit] │
│ Cutoff: Friday 11:59 PM             │
│ Lead time: 1 day                    │
│ Window: 9:00 AM - 2:00 PM           │
└─────────────────────────────────────┘

[+ Add Delivery Day]

Temporary Closures:
┌─────────────────────────────────────┐
│ December 25, 2024 - Christmas       │
│ No deliveries on this date    [×]  │
└─────────────────────────────────────┘

[+ Add Closure Date]
```

### Admin Settings → Pickup Locations

```
Pickup Locations
================

Active Locations:
┌─────────────────────────────────────────────┐
│ Sweet Angel Bakery - Main Store     [Edit] │
│ 123 Main St, Seattle, WA 98101              │
│ Pickup Days: Mon, Wed, Fri, Sat            │
│ Hours: 9:00 AM - 6:00 PM                    │
│ Cutoff: Day before at 11:59 PM              │
│ Status: ● Active                            │
├─────────────────────────────────────────────┤
│ Saturday Farmers Market          [Edit]     │
│ Pike Place Market, Seattle, WA              │
│ Pickup Days: Sat                            │
│ Hours: 8:00 AM - 2:00 PM                    │
│ Cutoff: Thursday at 11:59 PM                │
│ Status: ● Active                            │
└─────────────────────────────────────────────┘

[+ Add Pickup Location]

Inactive Locations (2):
[Show inactive locations]
```

### Admin Settings → Delivery Fees

```
Delivery Fee Rules
==================

Active Rules (Priority Order):
┌─────────────────────────────────────────────┐
│ 🔥 Free Delivery Over $75      Priority: 10 │
│ Type: Order Amount                   [Edit] │
│ Condition: Order total ≥ $75.00             │
│ Fee: $0.00                                  │
├─────────────────────────────────────────────┤
│ 📦 Wedding Cake Premium        Priority: 8  │
│ Type: Product Category               [Edit] │
│ Applies to: Wedding Cakes                   │
│ Fee: $20.00                                 │
├─────────────────────────────────────────────┤
│ 🚚 Base Delivery Fee           Priority: 1  │
│ Type: Base                           [Edit] │
│ Applies to: All deliveries                  │
│ Fee: $8.00                                  │
└─────────────────────────────────────────────┘

[+ Add Fee Rule]

Fee Calculator (Test):
┌─────────────────────────────────────────────┐
│ Test your fee rules:                        │
│                                              │
│ Order Amount: [$____]                       │
│ Products:                                    │
│   [+ Add product]                           │
│                                              │
│ Calculated Fee: $X.XX                       │
│ Applied Rule: [Rule name]                   │
│ [Calculate]                                 │
└─────────────────────────────────────────────┘

Inactive Rules (1):
[Show inactive rules]
```

### Product Edit → Delivery Rules

```
Product: Custom Wedding Cake
============================

Fulfillment Settings:
┌─────────────────────────────────────┐
│ ☑ Use custom fulfillment rules      │
│                                      │
│ Fulfillment Methods:                │
│ ☑ Allow Delivery                    │
│ ☐ Allow Pickup                       │
│   (Wedding cakes are too fragile    │
│    for customer pickup)              │
│                                      │
│ Delivery Days (if delivery allowed):│
│ ☐ Monday    ☐ Tuesday   ☐ Wednesday │
│ ☐ Thursday  ☐ Friday    ☑ Saturday  │
│ ☐ Sunday                             │
│                                      │
│ Minimum Lead Time: [7] days         │
│                                      │
│ ☑ Requires special handling          │
│                                      │
│ Delivery Fee Override:              │
│ ○ Use standard delivery fees        │
│ ● Custom fee: [$20.00]              │
│   (Premium handling for fragile)     │
│                                      │
│ Customer Notes:                     │
│ ┌─────────────────────────────────┐ │
│ │ Wedding cakes require careful   │ │
│ │ transport and are only          │ │
│ │ delivered on Saturdays          │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

[Save Changes]
```

## Implementation Phases

### Phase 1: Core Delivery & Pickup (MVP)
- [ ] Database schema for delivery schedules and pickup locations
- [ ] Admin UI to configure delivery days/cutoffs
- [ ] Admin UI to configure pickup locations
- [ ] Delivery/pickup date calculation logic
- [ ] Fulfillment method selector in cart
- [ ] Display delivery/pickup options on product pages
- [ ] Store fulfillment method with order

**Success Criteria:**
- Admin can set Wed/Sat delivery schedule
- Admin can add pickup locations
- Customers can choose delivery or pickup
- Customers see correct date before checkout
- Orders stored with fulfillment method

### Phase 2: Delivery Fee System
- [ ] Database schema for delivery fee rules
- [ ] Admin UI to configure fee rules (base, order amount, product category)
- [ ] Fee calculation logic with priority system
- [ ] Display delivery fee in cart
- [ ] Add delivery fee to Stripe checkout as line item
- [ ] Fee testing calculator in admin

**Success Criteria:**
- Admin can configure base delivery fee
- Admin can set "free over $X" rules
- Customers see fee before checkout
- Stripe checkout includes delivery fee line item
- Admin can change fees without code deploy

### Phase 3: Product-Specific Rules
- [ ] Database schema for product delivery rules
- [ ] Admin UI to set per-product restrictions
- [ ] Per-product delivery fee overrides
- [ ] Allow/disallow pickup per product
- [ ] Update calculation logic for product rules
- [ ] Cart handling for mixed products
- [ ] Display warnings for conflicting products

**Success Criteria:**
- Can set "Saturday only" for wedding cakes
- Can set wedding cake premium delivery fee ($20)
- Can disable pickup for fragile items
- Cart shows latest delivery date when mixed
- Clear messaging about delivery requirements

### Phase 4: Admin Order Management
- [ ] Orders grouped by delivery date and pickup location
- [ ] Delivery status workflow
- [ ] Pickup status workflow
- [ ] Export orders for route planning
- [ ] Print pickup lists per location
- [ ] Email notifications for delivery/pickup updates
- [ ] Revenue reporting by fulfillment method

**Success Criteria:**
- Admin can view Saturday deliveries and pickups separately
- Can mark orders through delivery/pickup workflow
- Can export deliveries for route planning
- Can print pickup lists per location
- Customers notified of status changes
- Can see delivery fee revenue

### Phase 5: Advanced Features
- [ ] Delivery zones/radius configuration
- [ ] Distance-based delivery fees
- [ ] Route optimization suggestions
- [ ] Customer delivery tracking
- [ ] SMS notifications
- [ ] Split orders by delivery date
- [ ] Delivery capacity limits per day
- [ ] Pickup capacity limits per location
- [ ] Temporary fee overrides (promotions)

## Metrics & Success Indicators

### Customer Metrics
- Conversion rate at checkout (baseline vs after delivery visibility)
- Pickup vs delivery selection rate
- Impact of delivery fee on pickup selection
- Support tickets about delivery timing/fees (should decrease)
- Order cancellation rate due to delivery date or fee
- Customer satisfaction with delivery/pickup communication

### Business Metrics
- Revenue from delivery fees
- Orders per delivery day (ensure balanced)
- Orders per pickup location
- Average delivery fee per order
- Pickup adoption rate (% choosing pickup)
- Delivery fee impact on average order value
- Cost savings from pickup vs delivery
- On-time delivery/pickup rate

### Experimentation Metrics
- Delivery fee elasticity (conversions vs fee amount)
- Free delivery threshold effectiveness
- Optimal delivery fee (conversion vs revenue)
- Pickup vs delivery profitability

### System Metrics
- Delivery date calculation performance
- Fee calculation performance
- Edge case occurrences (cutoff violations, fee changes, etc.)
- Admin configuration change frequency

## Open Questions

1. **Delivery Radius**: How far will we deliver? Need address validation?
2. **Initial Delivery Fee**: What should the starting base delivery fee be? ($5, $8, $10?)
3. **Free Delivery Threshold**: What order amount triggers free delivery? ($50, $75, $100?)
4. **Order Modifications**: Can customers change delivery method/date after ordering?
5. **Capacity Limits**: Max orders per delivery day? Max pickups per location?
6. **Same-Day Delivery**: Ever allow for urgent orders with premium fee?
7. **Pickup Window**: How long do customers have to pick up before order is canceled?
8. **Split Deliveries**: Allow customer to split cart between delivery and pickup?
9. **Notification Preferences**: Email, SMS, or both for delivery/pickup updates?
10. **Delivery Confirmation**: Require signature/photo proof for deliveries?
11. **Pickup Verification**: How to verify customer identity at pickup? (Order number, ID, QR code?)
12. **Delivery Fee Discounts**: Allow promo codes to reduce/waive delivery fee?

## Future Enhancements

### Short-term (3-6 months)
- Delivery zones with geographic boundaries
- SMS notifications for delivery day
- Customer order tracking page
- Capacity limits per delivery day
- Split orders by delivery preference

### Long-term (6-12 months)
- Route optimization with Google Maps API
- Driver mobile app for delivery management
- Real-time delivery tracking (like DoorDash)
- Subscription/recurring deliveries
- Integration with delivery services (if scaling)
- Multi-location support

## Dependencies

### Required
- Existing product catalog system
- Order management system
- Customer address collection
- Email notification system

### Optional
- SMS notification service (Twilio)
- Mapping service (Google Maps API)
- Route optimization service
- Delivery tracking system

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Customers don't understand delivery windows | High | Clear, prominent messaging throughout flow |
| Owner forgets to update schedule for holidays | Medium | Calendar view showing future deliveries, reminder system |
| Technical failure shows wrong delivery date | High | Extensive testing, validation, fallback to conservative date |
| Orders exceed delivery capacity | Medium | Implement order limits per delivery day |
| Address outside delivery zone | Low | Validate at checkout, show coverage map |
| Customer misses cutoff while shopping | Medium | Show countdown timer, lock cart at cutoff |

## Success Definition

The delivery system is successful when:
1. ✅ Zero customer complaints about unclear delivery timing
2. ✅ Owner can easily plan delivery routes 24 hours in advance
3. ✅ 95%+ on-time delivery rate
4. ✅ Admin can change schedule without developer help
5. ✅ System handles edge cases gracefully (holidays, closures, etc.)
6. ✅ Checkout conversion rate maintained or improved

## Appendix

### Example Schedule Configurations

**Configuration A: Basic (2 days/week)**
- Wednesday: Cutoff Tuesday 11:59 PM, 1-day lead
- Saturday: Cutoff Friday 11:59 PM, 1-day lead

**Configuration B: Busy Season (3 days/week)**
- Wednesday: Cutoff Tuesday 11:59 PM, 1-day lead
- Friday: Cutoff Thursday 11:59 PM, 1-day lead
- Saturday: Cutoff Friday 5:00 PM, 0.5-day lead (same-day morning orders)

**Configuration C: Custom Products Only (1 day/week)**
- Saturday: Cutoff Wednesday 11:59 PM, 3-day lead
- Only for wedding cakes and custom orders

### Business Rules Summary

#### Fulfillment Method Rules
1. **Customer chooses either delivery OR pickup (not both in MVP)**
2. **Pickup is always free (delivery fee = $0.00)**
3. **Delivery incurs configurable delivery fee**
4. **If product disallows pickup, hide pickup option**
5. **If product disallows delivery, hide delivery option**

#### Date Calculation Rules
6. **Delivery/pickup date must be after order date + lead time**
7. **Order must be placed before cutoff time for delivery/pickup date**
8. **If products have different rules, use most restrictive (latest date)**
9. **Inactive schedules/locations are ignored in calculations**
10. **If no valid fulfillment option exists, prevent checkout**
11. **Date and fee calculated at cart view and locked at checkout**
12. **Admin can override delivery date/fee on individual orders (emergency)**

#### Delivery Fee Rules
13. **Fee calculated based on active rules sorted by priority**
14. **Higher priority rules override lower priority rules**
15. **If multiple rules apply, highest priority wins**
16. **Free delivery threshold (order amount rule) overrides all fees**
17. **Product category fees override base fees**
18. **Delivery fee added as separate Stripe line item**
19. **Fee changes during checkout require customer confirmation**
20. **Pickup always results in $0.00 delivery fee**

---

**Document Version:** 2.0
**Last Updated:** 2025-10-21
**Author:** AI Assistant
**Status:** Draft for Review

**Changelog:**
- v2.0 (2025-10-21): Added pickup locations, configurable delivery fees, and Stripe integration
- v1.0 (2025-10-21): Initial delivery scheduling system design
