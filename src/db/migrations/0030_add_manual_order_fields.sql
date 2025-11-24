-- Add payment method field to track how the order was paid (card, cash, check, external)
ALTER TABLE `order` ADD `payment_method` text DEFAULT 'card';

-- Add created_by_admin_id to track which admin created manual orders
ALTER TABLE `order` ADD `created_by_admin_id` text REFERENCES user(id);

-- Add admin_notes for internal notes on manual orders
ALTER TABLE `order` ADD `admin_notes` text;

-- Create indexes for querying
CREATE INDEX IF NOT EXISTS `order_created_by_admin_id_idx` ON `order` (`created_by_admin_id`);
CREATE INDEX IF NOT EXISTS `order_payment_method_idx` ON `order` (`payment_method`);
