import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { type InferSelectModel } from "drizzle-orm";

import { createId } from '@paralleldrive/cuid2'

export const ROLES_ENUM = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

const roleTuple = Object.values(ROLES_ENUM) as [string, ...string[]];

const commonColumns = {
  createdAt: integer({
    mode: "timestamp",
  }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer({
    mode: "timestamp",
  }).$onUpdateFn(() => new Date()).notNull(),
  updateCounter: integer().default(0).$onUpdate(() => sql`updateCounter + 1`),
}

export const userTable = sqliteTable("user", {
  ...commonColumns,
  id: text().primaryKey().$defaultFn(() => `usr_${createId()}`).notNull(),
  firstName: text({
    length: 255,
  }),
  lastName: text({
    length: 255,
  }),
  email: text({
    length: 255,
  }).unique(),
  passwordHash: text(),
  role: text({
    enum: roleTuple,
  }).default(ROLES_ENUM.USER).notNull(),
  emailVerified: integer({
    mode: "timestamp",
  }),
  signUpIpAddress: text({
    length: 100,
  }),
  googleAccountId: text({
    length: 255,
  }),
  /**
   * This can either be an absolute or relative path to an image
   */
  avatar: text({
    length: 600,
  }),
  // Loyalty/storefront customer fields (consolidated from loyaltyCustomerTable)
  phone: text({ length: 50 }), // Customer phone number
  phoneVerified: integer().default(0).notNull(),
  // Notification preferences stored as JSON
  notificationPreferences: text({ length: 1000 })
    .default('{"emailNewFlavors":true,"emailDrops":true,"smsDelivery":false,"smsDrops":false}')
    .notNull(),
  // Delivery address fields
  streetAddress1: text({ length: 255 }),
  streetAddress2: text({ length: 255 }),
  city: text({ length: 100 }),
  state: text({ length: 50 }),
  zipCode: text({ length: 20 }),
}, (table) => ([
  index('email_idx').on(table.email),
  index('google_account_id_idx').on(table.googleAccountId),
  index('role_idx').on(table.role),
  index('phone_idx').on(table.phone),
]));

export const passKeyCredentialTable = sqliteTable("passkey_credential", {
  ...commonColumns,
  id: text().primaryKey().$defaultFn(() => `pkey_${createId()}`).notNull(),
  userId: text().notNull().references(() => userTable.id),
  credentialId: text({
    length: 255,
  }).notNull().unique(),
  credentialPublicKey: text({
    length: 255,
  }).notNull(),
  counter: integer().notNull(),
  // Optional array of AuthenticatorTransport as JSON string
  transports: text({
    length: 255,
  }),
  // Authenticator Attestation GUID. We use this to identify the device/authenticator app that created the passkey
  aaguid: text({
    length: 255,
  }),
  // The user agent of the device that created the passkey
  userAgent: text({
    length: 255,
  }),
  // The IP address that created the passkey
  ipAddress: text({
    length: 100,
  }),
}, (table) => ([
  index('user_id_idx').on(table.userId),
  index('credential_id_idx').on(table.credentialId),
]));

// Product status types
export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  FEATURED: 'featured',
  INACTIVE: 'inactive',
} as const;

export const productStatusTuple = Object.values(PRODUCT_STATUS) as [string, ...string[]];

// Categories table
export const categoryTable = sqliteTable("category", {
  ...commonColumns,
  id: text().primaryKey().$defaultFn(() => `cat_${createId()}`).notNull(),
  name: text({ length: 255 }).notNull(),
  slug: text({ length: 255 }).notNull().unique(),
  description: text({ length: 1000 }),
  displayOrder: integer().default(0).notNull(),
  active: integer().default(1).notNull(),
}, (table) => ([
  index('category_slug_idx').on(table.slug),
  index('category_active_idx').on(table.active),
]));

// Products table
export const productTable = sqliteTable("product", {
  ...commonColumns,
  id: text().primaryKey().$defaultFn(() => `prod_${createId()}`).notNull(),
  name: text({ length: 255 }).notNull(),
  description: text({ length: 2000 }),
  categoryId: text().notNull().references(() => categoryTable.id),
  price: integer().notNull(), // in cents - base price if no customizations, or default price
  imageUrl: text({ length: 600 }),
  status: text({
    enum: productStatusTuple,
  }).default(PRODUCT_STATUS.ACTIVE).notNull(),
  quantityAvailable: integer().default(0).notNull(), // inventory tracking
  merchantProvider: text({ length: 50 }).default('stripe'), // 'stripe' or 'square'
  stripeProductId: text({ length: 255 }), // Stripe product ID (legacy, keeping for backward compatibility)
  stripePriceId: text({ length: 255 }), // Stripe price ID (legacy, keeping for backward compatibility)
  merchantProductId: text({ length: 255 }), // Provider product ID (Stripe/Square)
  merchantPriceId: text({ length: 255 }), // Provider price ID (Stripe/Square)
  isNewFlavor: integer().default(0).notNull(), // Flag for "new flavor" notifications
  newFlavorUntil: integer({
    mode: "timestamp",
  }), // Auto-unflag after this date
  // Customizations config - JSON field for flexible product customization
  // Can be size variants, custom builder, or null for standard products
  customizations: text({ length: 10000 }), // Stored as JSON string
}, (table) => ([
  index('product_category_idx').on(table.categoryId),
  index('product_status_idx').on(table.status),
  index('product_stripe_product_id_idx').on(table.stripeProductId),
  index('product_is_new_flavor_idx').on(table.isNewFlavor),
]));

// Order status types - Comprehensive bakery workflow
// Payment Status - separate from order fulfillment status
export const PAYMENT_STATUS = {
  PENDING: 'pending',       // Awaiting payment
  PAID: 'paid',            // Payment successful
  FAILED: 'failed',        // Payment failed
  REFUNDED: 'refunded',    // Payment refunded
} as const;

export const paymentStatusTuple = Object.values(PAYMENT_STATUS) as [string, ...string[]];

export const PAYMENT_STATUS_LABELS: Record<keyof typeof PAYMENT_STATUS, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
} as const;

export const PAYMENT_STATUS_COLORS: Record<keyof typeof PAYMENT_STATUS, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  REFUNDED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
} as const;

// Order Fulfillment Status - workflow from order placement to completion
export const ORDER_STATUS = {
  PENDING: 'pending',              // Order placed, awaiting confirmation
  CONFIRMED: 'confirmed',          // Order confirmed by bakery staff

  // Production states
  IN_PRODUCTION: 'in_production',  // Order is being worked on (for custom items)
  BAKING: 'baking',               // Items are in the oven
  BAKED: 'baked',                 // Items finished baking
  COOLING: 'cooling',             // Items are cooling
  DECORATING: 'decorating',       // Custom decorations being applied
  PACKAGING: 'packaging',         // Order being packaged

  // Fulfillment states
  READY_FOR_PICKUP: 'ready_for_pickup',  // Ready for customer pickup
  OUT_FOR_DELIVERY: 'out_for_delivery',  // Order is being delivered
  COMPLETED: 'completed',         // Order fulfilled

  // Terminal states
  CANCELLED: 'cancelled',         // Order cancelled
} as const;

export const orderStatusTuple = Object.values(ORDER_STATUS) as [string, ...string[]];

// Helper to get human-readable status labels
export const ORDER_STATUS_LABELS: Record<keyof typeof ORDER_STATUS, string> = {
  PENDING: 'Processing', // E-commerce standard - order received and being prepared
  CONFIRMED: 'Confirmed',
  IN_PRODUCTION: 'In Production',
  BAKING: 'Baking',
  BAKED: 'Baked',
  COOLING: 'Cooling',
  DECORATING: 'Decorating',
  PACKAGING: 'Packaging',
  READY_FOR_PICKUP: 'Ready for Pickup',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

// Status color coding for UI
export const ORDER_STATUS_COLORS: Record<keyof typeof ORDER_STATUS, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  IN_PRODUCTION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  BAKING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  BAKED: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  COOLING: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  DECORATING: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  PACKAGING: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  READY_FOR_PICKUP: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  OUT_FOR_DELIVERY: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
} as const;

// Orders table
export const orderTable = sqliteTable("order", {
  ...commonColumns,
  id: text().primaryKey().$defaultFn(() => `ord_${createId()}`).notNull(),
  userId: text().references(() => userTable.id), // Link to user (nullable for guest checkout)
  customerEmail: text({ length: 255 }).notNull(),
  customerName: text({ length: 255 }).notNull(),
  customerPhone: text({ length: 50 }), // Optional phone for SMS notifications
  totalAmount: integer().notNull(), // in cents
  subtotal: integer().notNull(), // in cents
  tax: integer().notNull(), // in cents
  // Payment status - critical financial data
  paymentStatus: text({
    enum: paymentStatusTuple,
  }).default(PAYMENT_STATUS.PENDING).notNull(),
  // Order fulfillment status - workflow tracking
  status: text({
    enum: orderStatusTuple,
  }).default(ORDER_STATUS.PENDING).notNull(),
  merchantProvider: text({ length: 50 }).default('stripe').notNull(), // 'stripe' or 'square'
  stripePaymentIntentId: text({ length: 255 }), // Legacy field, keeping for backward compatibility
  paymentIntentId: text({ length: 255 }), // Provider payment intent ID (Stripe/Square)
  fulfillmentType: text({ length: 50 }), // 'pickup' or 'delivery'
  pickupTime: integer({
    mode: "timestamp",
  }),
  deliveryAddress: text({ length: 1000 }),
  notes: text({ length: 2000 }),
}, (table) => ([
  index('order_user_id_idx').on(table.userId),
  index('order_payment_status_idx').on(table.paymentStatus),
  index('order_status_idx').on(table.status),
  index('order_created_at_idx').on(table.createdAt),
  index('order_stripe_payment_intent_id_idx').on(table.stripePaymentIntentId),
  index('order_payment_intent_id_idx').on(table.paymentIntentId),
  index('order_merchant_provider_idx').on(table.merchantProvider),
]));

// Order items table
export const orderItemTable = sqliteTable("order_item", {
  ...commonColumns,
  id: text().primaryKey().$defaultFn(() => `oitem_${createId()}`).notNull(),
  orderId: text().notNull().references(() => orderTable.id),
  productId: text().notNull().references(() => productTable.id),
  quantity: integer().notNull(),
  priceAtPurchase: integer().notNull(), // in cents - store price at time of purchase
  // Customer's selected customizations - stored as JSON
  // Contains what size/options were selected and the final calculated price
  customizations: text({ length: 5000 }), // Stored as JSON string
}, (table) => ([
  index('order_item_order_id_idx').on(table.orderId),
  index('order_item_product_id_idx').on(table.productId),
]));

// Product Drop status types
export const DROP_STATUS = {
  SCHEDULED: 'scheduled',           // Drop is scheduled but not yet active
  LOYALTY_ACTIVE: 'loyalty_active', // Early access for loyalty members
  PUBLIC_ACTIVE: 'public_active',   // Available to everyone
  ENDED: 'ended',                   // Drop has ended
} as const;

export const dropStatusTuple = Object.values(DROP_STATUS) as [string, ...string[]];

// Product Drops table
export const productDropTable = sqliteTable("product_drop", {
  ...commonColumns,
  id: text().primaryKey().$defaultFn(() => `drop_${createId()}`).notNull(),
  name: text({ length: 255 }).notNull(),
  description: text({ length: 2000 }),
  loyaltyEarlyAccessStart: integer({
    mode: "timestamp",
  }).notNull(), // When loyalty members can access
  publicReleaseStart: integer({
    mode: "timestamp",
  }).notNull(), // When public can access
  endTime: integer({
    mode: "timestamp",
  }), // Optional end time
  status: text({
    enum: dropStatusTuple,
  }).default(DROP_STATUS.SCHEDULED).notNull(),
  notificationSent: integer().default(0).notNull(), // Flag to track if notification was sent
}, (table) => ([
  index('product_drop_status_idx').on(table.status),
  index('product_drop_loyalty_start_idx').on(table.loyaltyEarlyAccessStart),
  index('product_drop_public_start_idx').on(table.publicReleaseStart),
]));

// Product Drop Items table (which products are in which drops)
export const productDropItemTable = sqliteTable("product_drop_item", {
  ...commonColumns,
  id: text().primaryKey().$defaultFn(() => `dropi_${createId()}`).notNull(),
  dropId: text().notNull().references(() => productDropTable.id),
  productId: text().notNull().references(() => productTable.id),
  limitedQuantity: integer().notNull(), // Total quantity available for this drop
  remainingQuantity: integer().notNull(), // Remaining quantity
  maxPerCustomer: integer().default(0).notNull(), // 0 = no limit
}, (table) => ([
  index('product_drop_item_drop_id_idx').on(table.dropId),
  index('product_drop_item_product_id_idx').on(table.productId),
]));

// Merchant Fee table - tracks processing fees for revenue analytics
export const merchantFeeTable = sqliteTable("merchant_fee", {
  ...commonColumns,
  id: text().primaryKey().$defaultFn(() => `mfee_${createId()}`).notNull(),
  orderId: text().notNull().references(() => orderTable.id, { onDelete: 'cascade' }),
  merchantProvider: text({ length: 50 }).notNull(), // 'stripe' or 'square'

  // Fee breakdown
  orderAmount: integer().notNull(), // Order total in cents
  percentageFee: integer().notNull(), // Percentage fee in basis points (e.g., 290 = 2.9%)
  fixedFee: integer().notNull(), // Fixed fee in cents (e.g., 30 = $0.30)
  totalFee: integer().notNull(), // Total fee in cents (calculated)

  // Net revenue
  netAmount: integer().notNull(), // Order amount minus fees

  // Metadata
  paymentIntentId: text({ length: 255 }), // Provider's payment ID
  calculatedAt: integer({
    mode: "timestamp",
  }).notNull(), // Timestamp when fee was calculated
}, (table) => ([
  index('merchant_fee_order_id_idx').on(table.orderId),
  index('merchant_fee_merchant_provider_idx').on(table.merchantProvider),
  index('merchant_fee_calculated_at_idx').on(table.calculatedAt),
  index('merchant_fee_created_at_idx').on(table.createdAt),
]));

// Relations
export const categoryRelations = relations(categoryTable, ({ many }) => ({
  products: many(productTable),
}));

export const productRelations = relations(productTable, ({ one, many }) => ({
  category: one(categoryTable, {
    fields: [productTable.categoryId],
    references: [categoryTable.id],
  }),
  orderItems: many(orderItemTable),
  dropItems: many(productDropItemTable),
}));

export const orderRelations = relations(orderTable, ({ one, many }) => ({
  user: one(userTable, {
    fields: [orderTable.userId],
    references: [userTable.id],
  }),
  items: many(orderItemTable),
  merchantFees: many(merchantFeeTable),
}));

export const orderItemRelations = relations(orderItemTable, ({ one }) => ({
  order: one(orderTable, {
    fields: [orderItemTable.orderId],
    references: [orderTable.id],
  }),
  product: one(productTable, {
    fields: [orderItemTable.productId],
    references: [productTable.id],
  }),
}));

export const userRelations = relations(userTable, ({ many }) => ({
  passkeys: many(passKeyCredentialTable),
  orders: many(orderTable),
}));

export const passKeyCredentialRelations = relations(passKeyCredentialTable, ({ one }) => ({
  user: one(userTable, {
    fields: [passKeyCredentialTable.userId],
    references: [userTable.id],
  }),
}));

export const productDropRelations = relations(productDropTable, ({ many }) => ({
  items: many(productDropItemTable),
}));

export const productDropItemRelations = relations(productDropItemTable, ({ one }) => ({
  drop: one(productDropTable, {
    fields: [productDropItemTable.dropId],
    references: [productDropTable.id],
  }),
  product: one(productTable, {
    fields: [productDropItemTable.productId],
    references: [productTable.id],
  }),
}));

export const merchantFeeRelations = relations(merchantFeeTable, ({ one }) => ({
  order: one(orderTable, {
    fields: [merchantFeeTable.orderId],
    references: [orderTable.id],
  }),
}));

// Type exports
export type User = InferSelectModel<typeof userTable>;
export type PassKeyCredential = InferSelectModel<typeof passKeyCredentialTable>;
export type Category = InferSelectModel<typeof categoryTable>;
export type Product = InferSelectModel<typeof productTable>;
export type Order = InferSelectModel<typeof orderTable>;
export type OrderItem = InferSelectModel<typeof orderItemTable>;
export type ProductDrop = InferSelectModel<typeof productDropTable>;
export type ProductDropItem = InferSelectModel<typeof productDropItemTable>;
export type MerchantFee = InferSelectModel<typeof merchantFeeTable>;
