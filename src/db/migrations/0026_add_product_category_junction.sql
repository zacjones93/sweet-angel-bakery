-- Create product_category junction table for many-to-many relationship
CREATE TABLE `product_category` (
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`update_counter` integer DEFAULT 0,
	`id` text PRIMARY KEY NOT NULL,
	`productId` text NOT NULL,
	`categoryId` text NOT NULL,
	FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_category_product_idx` ON `product_category` (`productId`);--> statement-breakpoint
CREATE INDEX `product_category_category_idx` ON `product_category` (`categoryId`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_category_unique_idx` ON `product_category` (`productId`,`categoryId`);