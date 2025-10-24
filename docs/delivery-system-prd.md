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
- Integrates delivery fees with Square checkout
- Adapts to changing business needs without code changes

## Goals

### Primary Goals
1. Enable customers to know exactly when their order will be delivered/ready for pickup before checkout
2. Group orders into delivery windows that align with owner availability
3. Allow admin to configure delivery schedules and fees without developer intervention
4. Support different delivery rules and fees for different products
5. Provide pickup as a free alternative to paid delivery
6. Display accurate total costs including delivery fees at checkout and in Square

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
- As a customer, I want to see the total cost including delivery fee before Square checkout
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
- Define weekly delivery days (Thursday, Saturday per new requirements)
- Set cutoff rules (Tuesday 11:59 PM per new requirements)
- **Admin calendar to mark available/unavailable dates**
- Enable/disable delivery schedule temporarily
- Configure lead time requirements (minimum days before delivery)

**Data Structure:**
```typescript
DeliverySchedule {
  id: string
  dayOfWeek: 0-6 // 0=Sunday, 6=Saturday (4=Thursday, 6=Saturday per requirements)
  cutoffDay: 0-6 // Day when orders stop being accepted (2=Tuesday per requirements)
  cutoffTime: string // "23:59" format
  isActive: boolean
  leadTimeDays: number // Minimum days before delivery
  deliveryTimeWindow: string // "9:00 AM - 5:00 PM"
}

DeliveryCalendarClosure {
  id: string
  teamId: string
  closureDate: string // ISO date "2024-12-25"
  reason: string // "Christmas", "Vacation", "Emergency closure"
  affectsDelivery: boolean // If true, no deliveries on this date
  affectsPickup: boolean // If true, no pickups on this date
  createdAt: string
  updatedAt: string
}
```

**Example Configuration (All times in Mountain Time - Boise, ID):**
```
Weekly Ordering Schedule (NEW REQUIREMENT):
- Tuesday Cutoff: 11:59 PM MT
- Fulfillment Days: Thursday & Saturday
- Lead time: 2 days minimum
- Timezone: America/Boise (Mountain Time)

Thursday Deliveries/Pickups:
- Cutoff: Tuesday 11:59 PM MT
- Lead time: 2 days
- Delivery window: 10:00 AM - 4:00 PM MT

Saturday Deliveries/Pickups:
- Cutoff: Tuesday 11:59 PM MT
- Lead time: 2-4 days (depending on order day)
- Delivery window: 9:00 AM - 2:00 PM MT
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

**Example Configurations (Mountain Time - Boise, ID):**
```
Main Bakery Location:
- Name: Sweet Angel Bakery - Main Store
- Address: 123 Main St, Boise, ID
- Pickup Days: Thursday, Saturday
- Pickup Hours: 9:00 AM - 6:00 PM MT
- Cutoff: Tuesday 11:59 PM MT
- Fee: FREE (pickup is always free)
- Instructions: "Ring bell at entrance"
- Timezone: America/Boise (Mountain Time)

Farmers Market Stand:
- Name: Saturday Farmers Market
- Address: Capital City Public Market, Boise, ID
- Pickup Days: Saturday only
- Pickup Hours: 8:00 AM - 2:00 PM MT
- Cutoff: Tuesday 11:59 PM MT
- Fee: FREE (pickup is always free)
- Instructions: "Look for Sweet Angel tent"
- Requires Preorder: Yes (2-day lead time)
- Timezone: America/Boise (Mountain Time)
```

### 3. Delivery Zone & Fee Configuration

**NEW REQUIREMENT: Delivery zones with tiered pricing**

**Admin Interface:**
- **Create configurable delivery zones** - admin defines zone name, fee, and ZIP codes
- **Add/remove ZIP codes from zones** - each zone contains a list of ZIP codes
- **Set tiered pricing per zone** - $5 local, $10 extended, or any custom amount
- **Multiple zones supported** - can have 2+ zones with different fees
- Set fee rules by order amount (free over $X)
- Set fee rules by product category
- Override fees for special days/seasons
- **Pickup from any location is ALWAYS FREE**

**Key Principle:** Admin has full control over which ZIP codes belong to which zone and what each zone costs.

**Data Structure:**
```typescript
DeliveryZone {
  id: string
  teamId: string
  name: string // Admin-defined: "Local Zone", "Extended Zone", "Premium Zone", etc.
  zipCodes: string[] // Admin-defined list of ZIP codes (e.g., ["83702", "83703", "83704"])
  feeAmount: number // Admin-defined fee in cents (e.g., 500 = $5.00, 1000 = $10.00, 1500 = $15.00)
  isActive: boolean // Admin can enable/disable zones
  priority: number // Higher priority zones override lower (for overlapping ZIPs)
  createdAt: string
  updatedAt: string
}

// Example: Admin creates "Local Boise Zone"
// - Name: "Local Boise"
// - ZIP codes: ["83702", "83703", "83704", "83705", "83706"]
// - Fee: $5.00 (500 cents)
//
// Example: Admin creates "Extended Treasure Valley Zone"
// - Name: "Extended Treasure Valley"
// - ZIP codes: ["83642", "83646", "83713", "83714", "83716"]
// - Fee: $10.00 (1000 cents)

DeliveryFeeRule {
  id: string
  name: string // "Standard Delivery", "Wedding Cake Premium"
  ruleType: 'base' | 'zone' | 'order_amount' | 'product_category' | 'custom'
  feeAmount: number // In cents (e.g., 1000 = $10.00)
  isActive: boolean
  priority: number // Higher priority rules override lower

  // Conditional fields based on ruleType
  minimumOrderAmount?: number // For order_amount type
  freeDeliveryThreshold?: number // Free if order > this amount
  deliveryZoneId?: string // For zone type
  productCategoryIds?: string[] // For product_category type

  createdAt: string
  updatedAt: string
}
```

**Fee Calculation Algorithm:**
```
1. If fulfillment method is PICKUP → Fee = $0.00 (ALWAYS FREE)
2. For DELIVERY:
   a. Lookup delivery zone by customer's ZIP code
   b. Start with zone-based fee ($5 local, $10 extended)
   c. Check if order meets free delivery threshold → Fee = $0
   d. Apply product category fee overrides (highest priority)
   e. Apply any special promotional fees
   f. Return final calculated fee

Example 1 - Local Zone:
- Customer ZIP: 98101 (Local Zone)
- Zone fee: $5.00
- Order amount: $45.00
- Final fee: $5.00

Example 2 - Extended Zone:
- Customer ZIP: 98004 (Extended Zone)
- Zone fee: $10.00
- Order amount: $45.00
- Final fee: $10.00

Example 3 - Pickup (ALWAYS FREE):
- Customer selects pickup location
- Final fee: $0.00
```

**Example Fee Configurations (Fully Configurable by Admin):**

```
Configuration A: Boise Metro Area (Admin creates 2 zones)

Zone 1: "Local Boise"
- Admin adds ZIP codes: 83702, 83703, 83704, 83705, 83706
- Admin sets fee: $5.00
- Status: Active

Zone 2: "Extended Treasure Valley"
- Admin adds ZIP codes: 83642, 83646, 83713, 83714, 83716
- Admin sets fee: $10.00
- Status: Active

Pickup: $0.00 (ALWAYS FREE)

---

Configuration B: Admin Expands Zones Later

Admin adds more ZIPs to Local Boise zone:
- Original: 83702, 83703, 83704, 83705, 83706
- Updated: 83702, 83703, 83704, 83705, 83706, 83709, 83712

Admin creates new zone for rural areas:
Zone 3: "Rural Idaho"
- ZIP codes: 83616, 83617, 83622, 83629
- Fee: $15.00

---

Configuration C: Zone-Based + Free Threshold + Product Override
- Local Boise Zone: $5.00 (free over $75)
- Extended Treasure Valley: $10.00 (free over $100)
- Wedding cakes: $20.00 (premium handling, overrides zone)
- Pickup: $0.00 (FREE)

---

Key Point: Admin has full control to:
- Create any number of zones
- Add/remove any ZIP codes to/from zones
- Set any fee amount per zone
- Change fees without developer intervention
```

### 4. Delivery Date Calculation Logic (NEW REQUIREMENTS)

**Weekly Schedule (Mountain Time - Boise, ID):**
- **Cutoff Day**: Tuesday at 11:59 PM MT
- **Fulfillment Days**: Thursday and Saturday
- **All times are in Mountain Time (America/Boise timezone)**
- Orders placed Sunday-Tuesday by 11:59 PM MT → Available for Thursday/Saturday
- Orders placed Wednesday-Saturday → Available for following week's Thursday/Saturday

**Algorithm (All times in Mountain Time - America/Boise):**
```
1. Current date/time = Order placement time in Mountain Time
2. Check if before Tuesday 11:59 PM MT cutoff
3. If before cutoff:
   - Next fulfillment options: This week's Thursday & Saturday
4. If after cutoff:
   - Next fulfillment options: Following week's Thursday & Saturday
5. Apply product-specific lead time requirements
6. Return earliest valid delivery/pickup date

Example 1: Order placed Monday 3:00 PM MT
- Before Tuesday cutoff ✓
- Available: This Thursday (3 days) or This Saturday (5 days)

Example 2: Order placed Wednesday 9:00 AM MT
- After Tuesday cutoff ✗
- Available: Next Thursday (8 days) or Next Saturday (10 days)

Example 3: Order placed Tuesday 10:00 PM MT
- Before Tuesday cutoff ✓
- Available: This Thursday (2 days) or This Saturday (4 days)
```

**Edge Cases:**
- Order placed Tuesday 11:58 PM MT → Makes cutoff, available Thu/Sat this week
- Order placed Tuesday 12:01 AM MT (Wednesday) → Missed cutoff, next week
- Product requires 7-day lead time → Only Saturday options available
- No delivery days configured → Show error, prevent checkout
- Admin marks specific dates unavailable → Skip to next available date
- **All times stored in UTC but displayed/calculated in Mountain Time (America/Boise)**

### 5. Fulfillment Method Selection

**Customer Choice:**
At checkout, customer selects:
- **Delivery**: Paid service with scheduled delivery date + delivery fee
- **Pickup**: Free, choose pickup location and date

**Logic:**
```
If customer selects "Delivery":
  → Calculate delivery date
  → Calculate delivery fee based on ZIP code zone
  → Require delivery address
  → Add delivery fee to Square checkout line items

If customer selects "Pickup":
  → Show available pickup locations
  → Calculate pickup date based on location's schedule
  → Delivery fee = $0.00 (ALWAYS FREE)
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

**Square Checkout Integration:**
```
Line Items sent to Square:
- Chocolate Chip Cookies (x2): $24.00
- Custom Birthday Cake (x1): $45.00
- Delivery Fee: $5.00 or $10.00 (zone-based, if delivery selected, otherwise $0.00)

Total charged: $69.00 (pickup) or $74.00/$79.00 (delivery)

Metadata (stored with Square order):
- fulfillmentMethod: "delivery" | "pickup"
- deliveryDate: "2024-10-26" (if delivery)
- pickupDate: "2024-10-26" (if pickup)
- pickupLocationId: "ploc_abc123" (if pickup)
- pickupLocationName: "Main Store" (if pickup)
- deliveryAddress: {...} (if delivery)
- deliveryZoneId: "delz_abc" (if delivery)
- deliveryFeeAmount: 500 or 1000 (cents, if delivery)
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

Payment: Paid via Square (sq_abc123)
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

Payment: Paid via Square (sq_def456)
Status: Confirmed
[Mark as Prepared] [Mark as Ready for Pickup] [Mark as Picked Up]
```

## Technical Design

### Database Schema

```typescript
// New tables to add to schema.ts

deliveryScheduleTable = sqliteTable("delivery_schedule", {
  id: text("id").primaryKey(), // delsch_*
  teamId: text("team_id").notNull().references(() => teamsTable.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (4=Thursday, 6=Saturday)
  cutoffDay: integer("cutoff_day").notNull(), // 2=Tuesday
  cutoffTime: text("cutoff_time").notNull(), // "23:59"
  leadTimeDays: integer("lead_time_days").default(2), // Changed from 1 to 2 per requirements
  deliveryTimeWindow: text("delivery_time_window"),
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

deliveryCalendarClosureTable = sqliteTable("delivery_calendar_closure", {
  id: text("id").primaryKey(), // delcl_*
  teamId: text("team_id").notNull().references(() => teamsTable.id),
  closureDate: text("closure_date").notNull(), // ISO date "2024-12-25"
  reason: text("reason").notNull(), // "Christmas", "Vacation", etc.
  affectsDelivery: integer("affects_delivery", { mode: 'boolean' }).default(true),
  affectsPickup: integer("affects_pickup", { mode: 'boolean' }).default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
})

deliveryZoneTable = sqliteTable("delivery_zone", {
  id: text("id").primaryKey(), // delz_*
  teamId: text("team_id").notNull().references(() => teamsTable.id),
  name: text("name").notNull(), // "Local Zone", "Extended Zone"
  zipCodes: text("zip_codes").notNull(), // JSON array ["98101", "98102"]
  feeAmount: integer("fee_amount").notNull(), // In cents (500 = $5.00, 1000 = $10.00)
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  priority: integer("priority").default(0),
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
  ruleType: text("rule_type").notNull(), // 'base' | 'zone' | 'order_amount' | 'product_category' | 'custom'
  feeAmount: integer("fee_amount").notNull(), // In cents
  isActive: integer("is_active", { mode: 'boolean' }).default(true),
  priority: integer("priority").default(0),

  // Conditional fields
  minimumOrderAmount: integer("minimum_order_amount"), // cents
  freeDeliveryThreshold: integer("free_delivery_threshold"), // cents
  deliveryZoneId: text("delivery_zone_id").references(() => deliveryZoneTable.id), // For zone type
  productCategoryIds: text("product_category_ids"), // JSON array

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
 * Calculate delivery fee for an order (NEW: zone-based)
 */
export async function calculateDeliveryFee({
  cartItems: { productId: string; quantity: number; price: number }[]
  deliveryAddress: Address
  teamId: string
}): Promise<{
  feeAmount: number // In cents
  appliedZone: DeliveryZone | null // The zone matched by ZIP code
  appliedRule: DeliveryFeeRule | null
  breakdown: {
    zoneFee: number // $5 or $10 based on zone
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

// src/app/(admin)/admin/delivery-zones/page.tsx
// Admin page for configuring delivery zones (NEW)

// src/app/(admin)/admin/delivery-fees/page.tsx
// Admin page for configuring delivery fee rules

// src/app/(admin)/admin/delivery-calendar/page.tsx
// Admin calendar to mark available/unavailable dates (NEW)

// src/app/(admin)/admin/orders/by-fulfillment/page.tsx
// View orders grouped by delivery date and pickup location

// src/app/(admin)/admin/orders/[orderId]/page.tsx
// Individual order view with fulfillment details
```

### Square Integration

**Creating Checkout Session:**
```typescript
// src/app/(storefront)/_actions/create-square-payment.action.ts

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

  // 3. Build Square line items
  const lineItems = [
    ...cartItems.map(item => ({
      name: item.productName,
      quantity: item.quantity.toString(),
      basePriceMoney: {
        amount: item.price, // in cents
        currency: 'USD'
      }
    })),
    // Add delivery fee as separate line item
    ...(deliveryFee > 0 ? [{
      name: 'Delivery Fee',
      note: `Delivery on ${format(fulfillmentDate, 'MMM dd, yyyy')}`,
      quantity: '1',
      basePriceMoney: {
        amount: deliveryFee, // in cents
        currency: 'USD'
      }
    }] : [])
  ]

  // 4. Create Square checkout with metadata
  const checkoutResponse = await squareClient.checkoutApi.createPaymentLink({
    order: {
      locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
      lineItems,
      metadata: {
        teamId,
        fulfillmentMethod,
        ...(fulfillmentMethod === 'delivery' ? {
          deliveryDate: fulfillmentDate.toISOString(),
          deliveryAddress: JSON.stringify(deliveryAddress),
          deliveryFeeAmount: deliveryFee.toString(),
          deliveryZoneId: feeResult.appliedZone?.id || ''
        } : {
          pickupDate: fulfillmentDate.toISOString(),
          pickupLocationId,
          pickupLocationName: location.name
        })
      }
    },
    checkoutOptions: {
      redirectUrl: `${baseUrl}/purchase/thanks`,
      merchantSupportEmail: process.env.SUPPORT_EMAIL
    }
  })

  return { checkoutUrl: checkoutResponse.result.paymentLink.url }
}
```

**Webhook Handler (Order Creation):**
```typescript
// src/app/api/webhooks/square/route.ts

async function handlePaymentUpdated(payment: Payment) {
  const order = await squareClient.ordersApi.retrieveOrder(payment.orderId)
  const metadata = order.result.order.metadata

  // Create order with fulfillment details
  await db.insert(ordersTable).values({
    id: generateId('order'),
    teamId: metadata.teamId,
    squareOrderId: order.result.order.id,
    squarePaymentId: payment.id,
    totalAmount: payment.totalMoney.amount, // includes delivery fee

    fulfillmentMethod: metadata.fulfillmentMethod,

    // Delivery fields
    ...(metadata.fulfillmentMethod === 'delivery' ? {
      deliveryDate: metadata.deliveryDate,
      deliveryAddress: metadata.deliveryAddress,
      deliveryFee: parseInt(metadata.deliveryFeeAmount),
      deliveryZoneId: metadata.deliveryZoneId,
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

1. Customer browses products on Monday
2. Views product page → Sees "Delivery: Thu, Oct 24 ($5.00) | Pickup: Available (FREE)"
3. Adds to cart
4. Views cart → Selects "Delivery" → Enters ZIP code 98101
5. System shows: Local Zone - $5.00 delivery fee
6. Proceeds to checkout
7. Enters delivery address
8. Reviews order summary: Subtotal $45.00 + Delivery $5.00 = Total $50.00
9. Proceeds to Square checkout
10. Square shows line items: Product ($45.00) + Delivery Fee ($5.00 Local Zone)
11. Completes payment
12. Receives confirmation email with Thursday delivery date and total

### Flow 2: Customer Chooses Pickup to Avoid Fee

1. Customer adds cookies to cart ($24.00) on Monday
2. Views cart → Sees "Delivery: $5.00-$10.00 | Pickup: FREE"
3. Selects "Pickup"
4. Views 2 available pickup locations
5. Selects "Main Store - Thursday, Oct 24, 9AM-6PM"
6. Enters phone number
7. Proceeds to checkout
8. Reviews order summary: Subtotal $24.00 + Delivery $0.00 = Total $24.00
9. Proceeds to Square checkout
10. Square shows: Cookies ($24.00) only (no delivery fee)
11. Completes payment
12. Receives confirmation email with pickup location (Main Store) and Thursday pickup date

### Flow 3: Customer Orders Mixed Products

1. Customer adds cookies (1-day lead) to cart
2. Adds custom cake (3-day lead) to cart
3. Views cart → Warning shown: "Delivery date based on longest lead time"
4. Cart shows: "Delivery: Saturday, Oct 26 ($10 fee) | Pickup: Saturday, Oct 26 (Free)"
5. Customer selects Pickup to save $10
6. Selects pickup location
7. Proceeds with unified pickup
8. Completes checkout

### Flow 4: Admin Configures Delivery Zones

1. Admin navigates to Settings → Delivery Zones
2. Clicks "Create New Delivery Zone"
3. Enters zone name: "Local Boise"
4. Enters delivery fee: $5.00
5. Enters ZIP codes: 83702, 83703, 83704, 83705, 83706
6. Sets priority: 10
7. Saves zone
8. System validates ZIP codes (checks format)
9. Zone is now active
10. Future orders with those ZIP codes charged $5.00

Later, admin edits the zone:
11. Clicks "Edit" on Local Boise zone
12. Adds more ZIP codes: 83709, 83712
13. Saves
14. All new orders with 83709/83712 now charged $5.00

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

### Flow 6: Admin Experiments with Zone Pricing

1. Admin notices low delivery orders from Extended Treasure Valley zone
2. Navigates to Settings → Delivery Zones
3. Clicks "Edit" on Extended Treasure Valley zone
4. Changes fee from $10.00 to $8.00
5. Saves
6. System immediately applies $8.00 to new orders in those ZIP codes
7. Monitors conversion rate over next week
8. If needed, adjusts fee again or adds more ZIP codes to Local zone

### Flow 7: Admin Adds New Rural Delivery Zone

1. Admin wants to start delivering to rural areas
2. Navigates to Settings → Delivery Zones
3. Clicks "Create New Delivery Zone"
4. Enters zone name: "Rural Idaho"
5. Enters delivery fee: $15.00 (higher for distance)
6. Enters ZIP codes: 83616, 83617, 83622, 83629
7. Sets priority: 3 (lower than local/extended)
8. Saves
9. Customers in those ZIP codes can now choose delivery for $15.00

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

### Time Zone Handling (CRITICAL)
- **Business Timezone: America/Boise (Mountain Time)**
- All times stored in UTC in database
- All times displayed in Mountain Time to customers and admin
- Cutoff calculated in Mountain Time (11:59 PM MT)
- Order timestamps converted to MT for cutoff calculations
- Delivery/pickup windows shown in MT
- **Never use user's local timezone - always use business timezone (MT)**

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
Delivery Schedule Configuration (NEW REQUIREMENTS)
====================================================

Weekly Schedule (Mountain Time - Boise, ID):
┌─────────────────────────────────────┐
│ Order Cutoff: Tuesday 11:59 PM MT   │
│ Fulfillment Days: Thursday, Saturday│
│ Lead time: 2 days minimum           │
│ Timezone: America/Boise (MT)        │
│                              [Edit] │
└─────────────────────────────────────┘

Active Delivery Days:
┌─────────────────────────────────────┐
│ Thursday                     [Edit] │
│ Cutoff: Tuesday 11:59 PM MT         │
│ Lead time: 2 days                   │
│ Window: 10:00 AM - 4:00 PM MT       │
├─────────────────────────────────────┤
│ Saturday                     [Edit] │
│ Cutoff: Tuesday 11:59 PM MT         │
│ Lead time: 2-4 days                 │
│ Window: 9:00 AM - 2:00 PM MT        │
└─────────────────────────────────────┘

[+ Add Delivery Day]

Calendar View (NEW FEATURE):
┌─────────────────────────────────────┐
│        December 2024                │
│ Sun Mon Tue Wed Thu Fri Sat        │
│  1   2   3   4   5   6   7         │
│  8   9  10  11  12  13  14         │
│ 15  16  17  18  19  20  21         │
│ 22  23  24 [25] 26  27  28  ← Closed│
│ 29  30 [31]                   ← Closed│
│                                     │
│ ■ = Delivery/Pickup Day            │
│ [X] = Closed/Unavailable           │
└─────────────────────────────────────┘

[Mark Date Unavailable]

Temporary Closures:
┌─────────────────────────────────────┐
│ December 25, 2024 - Christmas       │
│ Affects: ☑ Delivery ☑ Pickup  [×] │
│                                     │
│ December 31, 2024 - New Year's Eve │
│ Affects: ☑ Delivery ☑ Pickup  [×] │
└─────────────────────────────────────┘

[+ Add Closure Date]
```

### Admin Settings → Pickup Locations

```
Pickup Locations
================

Active Locations (Mountain Time - Boise, ID):
┌─────────────────────────────────────────────┐
│ Sweet Angel Bakery - Main Store     [Edit] │
│ 123 Main St, Boise, ID 83702                │
│ Pickup Days: Thursday, Saturday             │
│ Hours: 9:00 AM - 6:00 PM MT                 │
│ Cutoff: Tuesday at 11:59 PM MT              │
│ Status: ● Active                            │
├─────────────────────────────────────────────┤
│ Saturday Farmers Market          [Edit]     │
│ Capital City Public Market, Boise, ID       │
│ Pickup Days: Saturday                       │
│ Hours: 8:00 AM - 2:00 PM MT                 │
│ Cutoff: Tuesday at 11:59 PM MT              │
│ Status: ● Active                            │
└─────────────────────────────────────────────┘

[+ Add Pickup Location]

Inactive Locations (2):
[Show inactive locations]
```

### Admin Settings → Delivery Zones (NEW - Fully Configurable)

```
Delivery Zones Configuration
==============================
Admin creates zones and assigns ZIP codes + fees

Active Zones:
┌─────────────────────────────────────────────────────────┐
│ 🏙️ Local Boise                        Priority: 10     │
│ Fee: $5.00                                      [Edit]  │
│ ZIP Codes (5): 83702, 83703, 83704, 83705, 83706        │
│ [+ Add ZIP] [- Remove ZIP]                              │
│ Status: ● Active                                        │
├─────────────────────────────────────────────────────────┤
│ 🌆 Extended Treasure Valley           Priority: 5      │
│ Fee: $10.00                                     [Edit]  │
│ ZIP Codes (5): 83642, 83646, 83713, 83714, 83716        │
│ [+ Add ZIP] [- Remove ZIP]                              │
│ Status: ● Active                                        │
└─────────────────────────────────────────────────────────┘

[+ Create New Delivery Zone]

Add Zone Flow:
┌─────────────────────────────────────────────────────────┐
│ Create Delivery Zone                                    │
│                                                          │
│ Zone Name: [________________]  (e.g., "Local Boise")   │
│                                                          │
│ Delivery Fee: $[____]  (e.g., 5.00)                    │
│                                                          │
│ ZIP Codes (one per line or comma-separated):            │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 83702, 83703, 83704, 83705, 83706                  │ │
│ │                                                     │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ Priority: [__10__] (higher = takes precedence)         │
│                                                          │
│ [Cancel]  [Create Zone]                                 │
└─────────────────────────────────────────────────────────┘

Zone Lookup Test:
┌─────────────────────────────────────────────┐
│ Enter ZIP Code: [83702]                     │
│                                              │
│ Result: Local Boise - $5.00 delivery fee   │
│ [Look Up]                                   │
└─────────────────────────────────────────────┘
```

### Admin Settings → Delivery Fees

```
Delivery Fee Rules (UPDATED)
==============================

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
│ 🚚 Local Zone Delivery         Priority: 5  │
│ Type: Zone                           [Edit] │
│ Zone: Local Zone (98101, 98102...)          │
│ Fee: $5.00                                  │
├─────────────────────────────────────────────┤
│ 🚛 Extended Zone Delivery      Priority: 4  │
│ Type: Zone                           [Edit] │
│ Zone: Extended Zone (98004, 98005...)       │
│ Fee: $10.00                                 │
└─────────────────────────────────────────────┘

[+ Add Fee Rule]

Fee Calculator (Test):
┌─────────────────────────────────────────────┐
│ Test your fee rules:                        │
│                                              │
│ Delivery ZIP: [_____]                       │
│ Order Amount: [$____]                       │
│ Products:                                    │
│   [+ Add product]                           │
│                                              │
│ Calculated Fee: $5.00                       │
│ Applied Zone: Local Zone                    │
│ Applied Rule: Local Zone Delivery           │
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

### Phase 1: Core Delivery & Pickup (MVP) ✅ Commits: 8e1ee5d, 881ead2
- [x] Database schema for delivery schedules and pickup locations
- [x] Core utilities for timezone (Mountain Time) handling
- [x] Core utilities for delivery/pickup date calculation logic
- [x] **Comprehensive testing and validation** (docs/phase-1-test-results.md)

**Success Criteria:**
- ✅ Backend infrastructure for delivery system complete
- ✅ All date calculations working in Mountain Time
- ✅ Tests passing for delivery/pickup date logic

### Phase 2: Admin UI ✅ Commits: 99b2cab, e507d03, 7c08844
- [x] Admin UI to configure delivery days/cutoffs
- [x] Admin UI to configure pickup locations
- [x] Admin UI to configure delivery zones
- [x] Server actions for all 3 admin modules
- [x] Create/edit/delete/enable-disable operations
- [x] Full CRUD admin interface

**Success Criteria:**
- ✅ Admin can set Thu/Sat delivery schedule with Tuesday cutoff
- ✅ Admin can add pickup locations with hours and instructions
- ✅ Admin can configure delivery zones with ZIP codes and fees
- ✅ All admin operations work with proper validation

### Phase 3: Customer-Facing UI ✅ Commit: c3e8de3
- [x] Fulfillment method selector in checkout
- [x] Display delivery/pickup options with dates and fees
- [x] ZIP code delivery fee calculation
- [x] Pickup location selection
- [x] Square payment integration with fulfillment data
- [x] Store fulfillment method with order

**Success Criteria:**
- ✅ Customers can choose delivery or pickup
- ✅ Customers see correct date and fee before checkout
- ✅ Delivery fees calculated based on ZIP code zones
- ✅ Pickup is always FREE
- ✅ Orders stored with fulfillment method, dates, and fees
- ✅ Square checkout includes delivery fee in total

### Phase 4: Product-Specific Rules (Optional Enhancement)
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

### Phase 5: Admin Order Management (Next Priority)
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

### Phase 6: Advanced Features (Future)
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

### Example Schedule Configurations (UPDATED)

**Configuration A: Standard Weekly Schedule (NEW REQUIREMENT - Mountain Time)**
- Cutoff: Tuesday 11:59 PM MT
- Fulfillment Days: Thursday & Saturday
- Lead time: 2 days minimum
- Timezone: America/Boise (Mountain Time)
- Orders Sunday-Tuesday → Available Thu/Sat same week
- Orders Wednesday-Saturday → Available Thu/Sat following week

**Configuration B: Holiday Modified Schedule**
- Standard: Tuesday 11:59 PM MT cutoff for Thu/Sat
- Week of Dec 25th: Mark Dec 25th & 26th as closed in calendar
- System automatically skips to next available dates
- All times in Mountain Time

**Configuration C: Custom Products with Extended Lead Time**
- Standard products: 2-day lead (Tuesday 11:59 PM MT cutoff for Thu/Sat)
- Wedding cakes: 7-day lead (only Saturday fulfillment)
- Custom cakes: 4-day lead (Saturday fulfillment only)
- All cutoffs in Mountain Time

### Business Rules Summary

#### Fulfillment Method Rules (UPDATED)
1. **Customer chooses either delivery OR pickup (not both in MVP)**
2. **Pickup is ALWAYS free from any location (delivery fee = $0.00)** ← NEW
3. **Delivery incurs zone-based delivery fee ($5 local, $10 extended)** ← UPDATED
4. **If product disallows pickup, hide pickup option**
5. **If product disallows delivery, hide delivery option**

#### Date Calculation Rules (UPDATED)
6. **Weekly cutoff: Tuesday 11:59 PM MT (Mountain Time)** ← NEW
7. **Fulfillment days: Thursday and Saturday only** ← NEW
8. **Orders Sunday-Tuesday by 11:59 PM MT → Available Thu/Sat same week** ← NEW
9. **Orders Wednesday-Saturday → Available Thu/Sat following week** ← NEW
10. **All times calculated in America/Boise timezone (Mountain Time)** ← NEW
11. **Delivery/pickup date must be after order date + lead time (2 days minimum)** ← UPDATED
12. **If products have different rules, use most restrictive (latest date)**
13. **Inactive schedules/locations are ignored in calculations**
14. **Admin calendar closures skip affected dates to next available** ← NEW
15. **If no valid fulfillment option exists, prevent checkout**
16. **Date and fee calculated at cart view and locked at checkout**
17. **Admin can override delivery date/fee on individual orders (emergency)**

#### Delivery Fee Rules (UPDATED)
17. **Pickup is ALWAYS $0.00 (free from any location)** ← NEW
18. **Delivery fee determined by ZIP code → delivery zone lookup** ← NEW
19. **Admin creates zones with custom ZIP code lists and fees** ← NEW
20. **Admin can add/remove ZIP codes from zones anytime** ← NEW
21. **Admin can change zone fees without code deployment** ← NEW
22. **Multiple zones supported (Local $5, Extended $10, Rural $15, etc.)** ← NEW
23. **Fee calculated based on active zones sorted by priority**
24. **Higher priority zones override lower priority zones (for overlapping ZIPs)**
25. **If multiple zones match a ZIP, highest priority zone wins**
26. **Free delivery threshold (order amount rule) can override zone fees**
27. **Product category fees can override zone fees (e.g., wedding cakes $20)**
28. **Delivery fee added as separate line item to Square checkout** ← UPDATED
29. **Fee changes during checkout require customer confirmation**
30. **Unknown ZIP codes → show error, suggest pickup or contact**

---

**Document Version:** 3.0
**Last Updated:** 2025-10-24
**Author:** AI Assistant
**Status:** Draft for Review

**Changelog:**
- v3.0 (2025-10-24): Updated with new requirements:
  - Weekly ordering schedule: Tuesday 11:59 PM MT cutoff for Thursday/Saturday fulfillment
  - **All times in Mountain Time (America/Boise timezone)**
  - Admin calendar for marking available/unavailable dates
  - Pickup from configurable locations is ALWAYS FREE
  - Configurable delivery zones with tiered pricing ($5 local, $10 extended)
  - Changed from Stripe to Square payment integration
  - Updated all examples to use Boise, ID locations
- v2.0 (2025-10-21): Added pickup locations, configurable delivery fees, and Stripe integration
- v1.0 (2025-10-21): Initial delivery scheduling system design
