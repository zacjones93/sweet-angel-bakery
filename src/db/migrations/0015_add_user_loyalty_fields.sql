-- Add loyalty customer fields to user table
ALTER TABLE `user` ADD `phone` text(50);
ALTER TABLE `user` ADD `phoneVerified` integer DEFAULT 0 NOT NULL;
ALTER TABLE `user` ADD `notificationPreferences` text(1000) DEFAULT '{"emailNewFlavors":true,"emailDrops":true,"smsDelivery":false,"smsDrops":false}' NOT NULL;

-- Create index on phone for lookups
CREATE INDEX `phone_idx` ON `user` (`phone`);

