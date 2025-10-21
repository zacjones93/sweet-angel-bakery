-- Add customizations support to products and order items

-- Add customizations column to product table
ALTER TABLE `product` ADD COLUMN `customizations` text(10000);--> statement-breakpoint

-- Add customizations column to order_item table
ALTER TABLE `order_item` ADD COLUMN `customizations` text(5000);

