-- Add delivery route optimization fields to order table
-- These fields enable route planning and optimization for delivery orders

ALTER TABLE `order` ADD COLUMN `delivery_sequence` integer;
ALTER TABLE `order` ADD COLUMN `estimated_arrival_time` text(20);
ALTER TABLE `order` ADD COLUMN `route_duration_from_previous` integer;
ALTER TABLE `order` ADD COLUMN `route_distance_from_previous` integer;
