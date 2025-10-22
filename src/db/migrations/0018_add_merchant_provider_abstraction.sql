-- Add merchant provider fields to product table
ALTER TABLE product ADD COLUMN merchantProvider TEXT DEFAULT 'stripe';
ALTER TABLE product ADD COLUMN merchantProductId TEXT;
ALTER TABLE product ADD COLUMN merchantPriceId TEXT;

-- Add merchant provider fields to order table
ALTER TABLE "order" ADD COLUMN merchantProvider TEXT DEFAULT 'stripe' NOT NULL;
ALTER TABLE "order" ADD COLUMN paymentIntentId TEXT;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS order_payment_intent_id_idx ON "order"(paymentIntentId);
CREATE INDEX IF NOT EXISTS order_merchant_provider_idx ON "order"(merchantProvider);

-- Create merchant_fee table for tracking processing fees
CREATE TABLE IF NOT EXISTS merchant_fee (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL,
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
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  updateCounter INTEGER DEFAULT 0,

  -- Foreign key constraint
  FOREIGN KEY (orderId) REFERENCES "order"(id) ON DELETE CASCADE
);

-- Create indexes for merchant_fee
CREATE INDEX IF NOT EXISTS merchant_fee_order_id_idx ON merchant_fee(orderId);
CREATE INDEX IF NOT EXISTS merchant_fee_merchant_provider_idx ON merchant_fee(merchantProvider);
CREATE INDEX IF NOT EXISTS merchant_fee_calculated_at_idx ON merchant_fee(calculatedAt);
CREATE INDEX IF NOT EXISTS merchant_fee_created_at_idx ON merchant_fee(createdAt);

-- Backfill merchant fees for existing paid orders
-- This uses standard Stripe fees (2.9% + $0.30) as an approximation
INSERT INTO merchant_fee (
  id,
  orderId,
  merchantProvider,
  orderAmount,
  percentageFee,
  fixedFee,
  totalFee,
  netAmount,
  paymentIntentId,
  calculatedAt,
  createdAt,
  updatedAt,
  updateCounter
)
SELECT
  'mfee_' || substr(hex(randomblob(16)), 1, 24) as id,
  id as orderId,
  'stripe' as merchantProvider,
  totalAmount as orderAmount,
  290 as percentageFee,
  30 as fixedFee,
  CAST(ROUND((totalAmount * 290.0 / 10000.0) + 30) AS INTEGER) as totalFee,
  totalAmount - CAST(ROUND((totalAmount * 290.0 / 10000.0) + 30) AS INTEGER) as netAmount,
  stripePaymentIntentId as paymentIntentId,
  unixepoch() as calculatedAt,
  createdAt,
  updatedAt,
  0 as updateCounter
FROM "order"
WHERE paymentStatus = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM merchant_fee WHERE merchant_fee.orderId = "order".id
  );
