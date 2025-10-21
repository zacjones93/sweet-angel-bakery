-- Custom SQL migration file, put your code below! --

-- Add inventory and Stripe columns to product table
ALTER TABLE `product` ADD COLUMN `quantityAvailable` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `product` ADD COLUMN `stripeProductId` text(255);--> statement-breakpoint
ALTER TABLE `product` ADD COLUMN `stripePriceId` text(255);--> statement-breakpoint

-- Add index for Stripe product ID
CREATE INDEX `product_stripe_product_id_idx` ON `product` (`stripeProductId`);