-- Add delivery system tables as per delivery-system-prd.md

-- Delivery Schedule table
CREATE TABLE `delivery_schedule` (
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`update_counter` integer DEFAULT 0,
	`id` text PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`day_of_week` integer NOT NULL,
	`cutoff_day` integer NOT NULL,
	`cutoff_time` text(10) NOT NULL,
	`lead_time_days` integer DEFAULT 2 NOT NULL,
	`delivery_time_window` text(100),
	`is_active` integer DEFAULT 1 NOT NULL
);

-- Delivery Calendar Closures table
CREATE TABLE `delivery_calendar_closure` (
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`update_counter` integer DEFAULT 0,
	`id` text PRIMARY KEY NOT NULL,
	`closure_date` text(20) NOT NULL,
	`reason` text(500) NOT NULL,
	`affects_delivery` integer DEFAULT 1 NOT NULL,
	`affects_pickup` integer DEFAULT 1 NOT NULL
);

-- Delivery Zones table
CREATE TABLE `delivery_zone` (
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`update_counter` integer DEFAULT 0,
	`id` text PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`zip_codes` text(5000) NOT NULL,
	`fee_amount` integer NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL
);

-- Pickup Locations table
CREATE TABLE `pickup_location` (
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`update_counter` integer DEFAULT 0,
	`id` text PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`address` text(1000) NOT NULL,
	`pickup_days` text(100) NOT NULL,
	`pickup_time_windows` text(255) NOT NULL,
	`instructions` text(1000),
	`is_active` integer DEFAULT 1 NOT NULL,
	`requires_preorder` integer DEFAULT 0 NOT NULL,
	`cutoff_day` integer,
	`cutoff_time` text(10),
	`lead_time_days` integer DEFAULT 0 NOT NULL
);

-- Delivery Fee Rules table
CREATE TABLE `delivery_fee_rule` (
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`update_counter` integer DEFAULT 0,
	`id` text PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`rule_type` text(50) NOT NULL,
	`fee_amount` integer NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`minimum_order_amount` integer,
	`free_delivery_threshold` integer,
	`delivery_zone_id` text,
	`product_category_ids` text(1000),
	FOREIGN KEY (`delivery_zone_id`) REFERENCES `delivery_zone`(`id`) ON UPDATE no action ON DELETE no action
);

-- Product Delivery Rules table
CREATE TABLE `product_delivery_rules` (
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`update_counter` integer DEFAULT 0,
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`allowed_delivery_days` text(100),
	`minimum_lead_time_days` integer,
	`requires_special_handling` integer DEFAULT 0 NOT NULL,
	`delivery_notes` text(1000),
	`allow_pickup` integer DEFAULT 1 NOT NULL,
	`allow_delivery` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);

-- Add new fulfillment fields to order table
ALTER TABLE `order` ADD COLUMN `fulfillment_method` text(50);
ALTER TABLE `order` ADD COLUMN `delivery_date` text(20);
ALTER TABLE `order` ADD COLUMN `delivery_time_window` text(100);
ALTER TABLE `order` ADD COLUMN `delivery_address_json` text(1000);
ALTER TABLE `order` ADD COLUMN `delivery_instructions` text(1000);
ALTER TABLE `order` ADD COLUMN `delivery_fee` integer;
ALTER TABLE `order` ADD COLUMN `delivery_zone_id` text REFERENCES `delivery_zone`(`id`);
ALTER TABLE `order` ADD COLUMN `delivery_status` text(50);
ALTER TABLE `order` ADD COLUMN `pickup_location_id` text REFERENCES `pickup_location`(`id`);
ALTER TABLE `order` ADD COLUMN `pickup_date` text(20);
ALTER TABLE `order` ADD COLUMN `pickup_time_window` text(100);
ALTER TABLE `order` ADD COLUMN `pickup_status` text(50);
ALTER TABLE `order` ADD COLUMN `pickup_instructions` text(1000);

-- Create indexes for delivery schedule table
CREATE INDEX `delivery_schedule_day_of_week_idx` ON `delivery_schedule` (`day_of_week`);
CREATE INDEX `delivery_schedule_is_active_idx` ON `delivery_schedule` (`is_active`);

-- Create indexes for delivery calendar closure table
CREATE INDEX `delivery_closure_date_idx` ON `delivery_calendar_closure` (`closure_date`);

-- Create indexes for delivery zone table
CREATE INDEX `delivery_zone_is_active_idx` ON `delivery_zone` (`is_active`);
CREATE INDEX `delivery_zone_priority_idx` ON `delivery_zone` (`priority`);

-- Create indexes for pickup location table
CREATE INDEX `pickup_location_is_active_idx` ON `pickup_location` (`is_active`);

-- Create indexes for delivery fee rule table
CREATE INDEX `delivery_fee_rule_is_active_idx` ON `delivery_fee_rule` (`is_active`);
CREATE INDEX `delivery_fee_rule_priority_idx` ON `delivery_fee_rule` (`priority`);
CREATE INDEX `delivery_fee_rule_type_idx` ON `delivery_fee_rule` (`rule_type`);

-- Create indexes for product delivery rules table
CREATE INDEX `product_delivery_rules_product_id_idx` ON `product_delivery_rules` (`product_id`);

-- Create indexes for new order table fields
CREATE INDEX `order_fulfillment_method_idx` ON `order` (`fulfillment_method`);
CREATE INDEX `order_delivery_date_idx` ON `order` (`delivery_date`);
CREATE INDEX `order_pickup_date_idx` ON `order` (`pickup_date`);
CREATE INDEX `order_pickup_location_id_idx` ON `order` (`pickup_location_id`);
