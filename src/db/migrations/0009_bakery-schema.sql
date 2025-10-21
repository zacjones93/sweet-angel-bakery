-- Custom SQL migration file, put your code below! --

-- Drop old SaaS/credit/team tables
DROP TABLE IF EXISTS `purchased_item`;--> statement-breakpoint
DROP TABLE IF EXISTS `credit_transaction`;--> statement-breakpoint
DROP TABLE IF EXISTS `team_invitation`;--> statement-breakpoint
DROP TABLE IF EXISTS `team_membership`;--> statement-breakpoint
DROP TABLE IF EXISTS `team_role`;--> statement-breakpoint
DROP TABLE IF EXISTS `team`;--> statement-breakpoint

-- Create categories table
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`updateCounter` integer DEFAULT 0,
	`name` text(255) NOT NULL,
	`slug` text(255) NOT NULL UNIQUE,
	`description` text(1000),
	`displayOrder` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);--> statement-breakpoint

CREATE INDEX `category_slug_idx` ON `category` (`slug`);--> statement-breakpoint
CREATE INDEX `category_active_idx` ON `category` (`active`);--> statement-breakpoint

-- Create products table
CREATE TABLE `product` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`updateCounter` integer DEFAULT 0,
	`name` text(255) NOT NULL,
	`description` text(2000),
	`categoryId` text NOT NULL,
	`price` integer NOT NULL,
	`imageUrl` text(600),
	`status` text DEFAULT 'active' NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint

CREATE INDEX `product_category_idx` ON `product` (`categoryId`);--> statement-breakpoint
CREATE INDEX `product_status_idx` ON `product` (`status`);--> statement-breakpoint

-- Create orders table
CREATE TABLE `order` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`updateCounter` integer DEFAULT 0,
	`userId` text,
	`customerEmail` text(255) NOT NULL,
	`customerName` text(255) NOT NULL,
	`totalAmount` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`stripePaymentIntentId` text(255),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint

CREATE INDEX `order_user_id_idx` ON `order` (`userId`);--> statement-breakpoint
CREATE INDEX `order_status_idx` ON `order` (`status`);--> statement-breakpoint
CREATE INDEX `order_created_at_idx` ON `order` (`createdAt`);--> statement-breakpoint
CREATE INDEX `order_stripe_payment_intent_id_idx` ON `order` (`stripePaymentIntentId`);--> statement-breakpoint

-- Create order_items table
CREATE TABLE `order_item` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`updateCounter` integer DEFAULT 0,
	`orderId` text NOT NULL,
	`productId` text NOT NULL,
	`quantity` integer NOT NULL,
	`priceAtPurchase` integer NOT NULL,
	FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint

CREATE INDEX `order_item_order_id_idx` ON `order_item` (`orderId`);--> statement-breakpoint
CREATE INDEX `order_item_product_id_idx` ON `order_item` (`productId`);

-- Note: SQLite doesn't support DROP COLUMN, so currentCredits and lastCreditRefreshAt
-- columns will remain in the user table but won't be used
