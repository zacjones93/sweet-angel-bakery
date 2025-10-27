-- Add delivery notification tracking fields to order table

ALTER TABLE `order` ADD COLUMN `delivery_notification_sent_at` integer;
ALTER TABLE `order` ADD COLUMN `delivery_notification_count` integer DEFAULT 0;
