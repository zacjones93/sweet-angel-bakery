ALTER TABLE `user` ADD `adminNotificationPreferences` text DEFAULT '{"emailNewOrders":true,"newOrderEmailAddress":null}' NOT NULL;
