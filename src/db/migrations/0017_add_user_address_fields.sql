-- Add address fields to user table for delivery addresses
ALTER TABLE `user` ADD COLUMN `streetAddress1` text(255);
ALTER TABLE `user` ADD COLUMN `streetAddress2` text(255);
ALTER TABLE `user` ADD COLUMN `city` text(100);
ALTER TABLE `user` ADD COLUMN `state` text(50);
ALTER TABLE `user` ADD COLUMN `zipCode` text(20);
