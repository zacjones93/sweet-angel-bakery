-- Add loyalty program tables and update existing tables

-- Create loyalty_customer table
CREATE TABLE `loyalty_customer` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`updateCounter` integer DEFAULT 0,
	`userId` text,
	`email` text(255) NOT NULL UNIQUE,
	`phone` text(50),
	`firstName` text(255) NOT NULL,
	`lastName` text(255) NOT NULL,
	`emailVerified` integer DEFAULT 0 NOT NULL,
	`phoneVerified` integer DEFAULT 0 NOT NULL,
	`notificationPreferences` text(1000) DEFAULT '{"emailNewFlavors":true,"emailDrops":true,"smsDelivery":false,"smsDrops":false}' NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint

CREATE INDEX `loyalty_customer_email_idx` ON `loyalty_customer` (`email`);--> statement-breakpoint
CREATE INDEX `loyalty_customer_user_id_idx` ON `loyalty_customer` (`userId`);--> statement-breakpoint

-- Add new columns to product table
ALTER TABLE `product` ADD COLUMN `isNewFlavor` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `product` ADD COLUMN `newFlavorUntil` integer;--> statement-breakpoint

CREATE INDEX `product_is_new_flavor_idx` ON `product` (`isNewFlavor`);--> statement-breakpoint

-- Add new columns to order table
ALTER TABLE `order` ADD COLUMN `loyaltyCustomerId` text REFERENCES `loyalty_customer`(`id`);--> statement-breakpoint
ALTER TABLE `order` ADD COLUMN `customerPhone` text(50);--> statement-breakpoint
ALTER TABLE `order` ADD COLUMN `subtotal` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `order` ADD COLUMN `tax` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `order` ADD COLUMN `fulfillmentType` text(50);--> statement-breakpoint
ALTER TABLE `order` ADD COLUMN `pickupTime` integer;--> statement-breakpoint
ALTER TABLE `order` ADD COLUMN `deliveryAddress` text(1000);--> statement-breakpoint
ALTER TABLE `order` ADD COLUMN `notes` text(2000);--> statement-breakpoint

CREATE INDEX `order_loyalty_customer_id_idx` ON `order` (`loyaltyCustomerId`);--> statement-breakpoint

-- Create product_drop table
CREATE TABLE `product_drop` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`updateCounter` integer DEFAULT 0,
	`name` text(255) NOT NULL,
	`description` text(2000),
	`loyaltyEarlyAccessStart` integer NOT NULL,
	`publicReleaseStart` integer NOT NULL,
	`endTime` integer,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`notificationSent` integer DEFAULT 0 NOT NULL
);--> statement-breakpoint

CREATE INDEX `product_drop_status_idx` ON `product_drop` (`status`);--> statement-breakpoint
CREATE INDEX `product_drop_loyalty_start_idx` ON `product_drop` (`loyaltyEarlyAccessStart`);--> statement-breakpoint
CREATE INDEX `product_drop_public_start_idx` ON `product_drop` (`publicReleaseStart`);--> statement-breakpoint

-- Create product_drop_item table
CREATE TABLE `product_drop_item` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`updateCounter` integer DEFAULT 0,
	`dropId` text NOT NULL,
	`productId` text NOT NULL,
	`limitedQuantity` integer NOT NULL,
	`remainingQuantity` integer NOT NULL,
	`maxPerCustomer` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`dropId`) REFERENCES `product_drop`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint

CREATE INDEX `product_drop_item_drop_id_idx` ON `product_drop_item` (`dropId`);--> statement-breakpoint
CREATE INDEX `product_drop_item_product_id_idx` ON `product_drop_item` (`productId`);
