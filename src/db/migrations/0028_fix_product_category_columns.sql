-- Fix product_category table column names to use snake_case
-- Drop old table and recreate with correct column names
DROP TABLE IF EXISTS `product_category`;

CREATE TABLE `product_category` (
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`update_counter` integer DEFAULT 0,
	`id` text PRIMARY KEY NOT NULL,
	`productId` text NOT NULL,
	`categoryId` text NOT NULL,
	FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_category_product_idx` ON `product_category` (`productId`);
--> statement-breakpoint
CREATE INDEX `product_category_category_idx` ON `product_category` (`categoryId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_category_unique_idx` ON `product_category` (`productId`,`categoryId`);
