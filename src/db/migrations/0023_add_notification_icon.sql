-- Add icon field to home_notification table

ALTER TABLE `home_notification` ADD COLUMN `icon` text(10) DEFAULT 'ℹ️';
