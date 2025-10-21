-- Add paymentStatus column to order table
-- Separate payment status from order fulfillment status

-- Add payment status column with default 'pending'
ALTER TABLE `order` ADD COLUMN `paymentStatus` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint

-- Create index for payment status queries
CREATE INDEX `order_payment_status_idx` ON `order` (`paymentStatus`);--> statement-breakpoint

-- Migrate existing data:
-- Orders with status 'paid' should have paymentStatus 'paid'
UPDATE `order` SET `paymentStatus` = 'paid' WHERE `status` = 'paid';--> statement-breakpoint

-- Orders with status 'payment_failed' should have paymentStatus 'failed'
UPDATE `order` SET `paymentStatus` = 'failed' WHERE `status` = 'payment_failed';--> statement-breakpoint

-- Update fulfillment status for orders that were marked as 'paid' or 'payment_failed'
-- Set them to 'pending' (awaiting confirmation) since that's the initial fulfillment state
UPDATE `order` SET `status` = 'pending' WHERE `status` IN ('paid', 'payment_failed');

