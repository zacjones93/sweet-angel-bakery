-- Remove loyaltyCustomerId column from order table and drop loyalty_customer table
-- Note: SQLite doesn't support DROP COLUMN directly, so we need to recreate the table

-- Disable foreign key constraints temporarily
PRAGMA foreign_keys = OFF;

-- Create new order table without loyaltyCustomerId
CREATE TABLE `order_new` (
  `id` text PRIMARY KEY NOT NULL,
  `userId` text REFERENCES user(id),
  `customerEmail` text(255) NOT NULL,
  `customerName` text(255) NOT NULL,
  `customerPhone` text(50),
  `totalAmount` integer NOT NULL,
  `subtotal` integer NOT NULL,
  `tax` integer NOT NULL,
  `paymentStatus` text DEFAULT 'pending' NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `stripePaymentIntentId` text(255),
  `fulfillmentType` text(50),
  `pickupTime` integer,
  `deliveryAddress` text(1000),
  `notes` text(2000),
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL,
  `updateCounter` integer DEFAULT 0
);

-- Copy data from old table (excluding loyaltyCustomerId)
INSERT INTO `order_new` SELECT 
  id, userId, customerEmail, customerName, customerPhone,
  totalAmount, subtotal, tax, paymentStatus, status,
  stripePaymentIntentId, fulfillmentType, pickupTime,
  deliveryAddress, notes, createdAt, updatedAt, updateCounter
FROM `order`;

-- Drop old table and rename new one
DROP TABLE `order`;
ALTER TABLE `order_new` RENAME TO `order`;

-- Recreate indexes
CREATE INDEX `order_user_id_idx` ON `order` (`userId`);
CREATE INDEX `order_payment_status_idx` ON `order` (`paymentStatus`);
CREATE INDEX `order_status_idx` ON `order` (`status`);
CREATE INDEX `order_created_at_idx` ON `order` (`createdAt`);
CREATE INDEX `order_stripe_payment_intent_id_idx` ON `order` (`stripePaymentIntentId`);

-- Drop the loyalty_customer table
DROP TABLE IF EXISTS `loyalty_customer`;

-- Drop related indexes (if they still exist)
DROP INDEX IF EXISTS `loyalty_customer_email_idx`;
DROP INDEX IF EXISTS `loyalty_customer_user_id_idx`;
DROP INDEX IF EXISTS `order_loyalty_customer_id_idx`;

-- Re-enable foreign key constraints
PRAGMA foreign_keys = ON;

