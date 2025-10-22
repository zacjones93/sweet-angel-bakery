PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" VALUES(1,'0000_init.sql','2025-10-22 18:17:01');
INSERT INTO "d1_migrations" VALUES(2,'0001_add_emailVerified.sql','2025-10-22 18:17:01');
INSERT INTO "d1_migrations" VALUES(3,'0003_add_google_sso.sql','2025-10-22 18:17:02');
INSERT INTO "d1_migrations" VALUES(4,'0004_add_passkey_credentials.sql','2025-10-22 18:17:02');
INSERT INTO "d1_migrations" VALUES(5,'0005_add_opennext_cache_tables.sql','2025-10-22 18:17:02');
INSERT INTO "d1_migrations" VALUES(6,'0006_add_credit_billing_system.sql','2025-10-22 18:17:03');
INSERT INTO "d1_migrations" VALUES(7,'0007_add_update_counter_and_payment_intent_id.sql','2025-10-22 18:17:03');
INSERT INTO "d1_migrations" VALUES(8,'0008_add_multi_tenancy.sql','2025-10-22 18:17:04');
INSERT INTO "d1_migrations" VALUES(9,'0009_bakery-schema.sql','2025-10-22 18:17:04');
INSERT INTO "d1_migrations" VALUES(10,'0010_add-inventory-stripe.sql','2025-10-22 18:17:04');
INSERT INTO "d1_migrations" VALUES(11,'0011_seed_products.sql','2025-10-22 18:17:05');
INSERT INTO "d1_migrations" VALUES(12,'0012_add-loyalty-program.sql','2025-10-22 18:17:05');
INSERT INTO "d1_migrations" VALUES(13,'0013_add_product_customizations.sql','2025-10-22 18:17:05');
INSERT INTO "d1_migrations" VALUES(14,'0014_add-payment-status.sql','2025-10-22 18:17:06');
INSERT INTO "d1_migrations" VALUES(15,'0015_add_user_loyalty_fields.sql','2025-10-22 18:17:06');
INSERT INTO "d1_migrations" VALUES(16,'0016_remove_loyalty_customer_table.sql','2025-10-22 18:17:07');
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`firstName` text(255),
	`lastName` text(255),
	`email` text(255),
	`passwordHash` text,
	`role` text DEFAULT 'user' NOT NULL
, `emailVerified` integer, `signUpIpAddress` text(100), `googleAccountId` text(255), `avatar` text(600), `currentCredits` integer DEFAULT 0 NOT NULL, `lastCreditRefreshAt` integer, `updateCounter` integer DEFAULT 0, `phone` text(50), `phoneVerified` integer DEFAULT 0 NOT NULL, `notificationPreferences` text(1000) DEFAULT '{"emailNewFlavors":true,"emailDrops":true,"smsDelivery":false,"smsDrops":false}' NOT NULL);
CREATE TABLE `passkey_credential` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`userId` text NOT NULL,
	`credentialId` text(255) NOT NULL,
	`credentialPublicKey` text(255) NOT NULL,
	`counter` integer NOT NULL,
	`transports` text(255),
	`aaguid` text(255),
	`userAgent` text(255),
	`ipAddress` text(100), `updateCounter` integer DEFAULT 0,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE tags (
    tag TEXT NOT NULL,
    path TEXT NOT NULL,
    UNIQUE(tag, path) ON CONFLICT REPLACE
);
CREATE TABLE revalidations (
    tag TEXT NOT NULL,
    revalidatedAt INTEGER NOT NULL,
    UNIQUE(tag) ON CONFLICT REPLACE
);
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`updateCounter` integer DEFAULT 0,
	`name` text(255) NOT NULL,
	`slug` text(255) NOT NULL UNIQUE,
	`description` text(1000),
	`displayOrder` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
INSERT INTO "category" VALUES('cat_2tdLW2HVrEFaYPg1vxdKKC',1761066405,1761066405,0,'Cookies','cookies','Handcrafted cookies made fresh daily',1,1);
INSERT INTO "category" VALUES('cat_2tdLW2HVrEFaYPg1vxdKKD',1761066405,1761066405,0,'Gift Boxes','gift-boxes','Curated gift boxes perfect for any occasion',2,1);
INSERT INTO "category" VALUES('cat_2tdLW2HVrEFaYPg1vxdKKE',1761066405,1761066405,0,'Cakes','cakes','Custom cakes for celebrations',3,1);
INSERT INTO "category" VALUES('cat_2tdLW2HVrEFaYPg1vxdKKF',1761066405,1761066405,0,'Custom Orders','custom-orders','Custom baked goods made to order',4,1);
CREATE TABLE `product` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`updateCounter` integer DEFAULT 0,
	`name` text(255) NOT NULL,
	`description` text(2000),
	`categoryId` text NOT NULL,
	`price` integer NOT NULL,
	`imageUrl` text(600),
	`status` text DEFAULT 'active' NOT NULL, `quantityAvailable` integer DEFAULT 0 NOT NULL, `stripeProductId` text(255), `stripePriceId` text(255), `isNewFlavor` integer DEFAULT 0 NOT NULL, `newFlavorUntil` integer, `customizations` text(10000),
	FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE no action
);
INSERT INTO "product" VALUES('prod_miib6ur4c97uix2f335eok6q',1761066405,1761066405,0,'Cookie Gift Box','A delightful assortment of our signature cookies, perfect for gifting.','cat_2tdLW2HVrEFaYPg1vxdKKD',1800,NULL,'active',0,NULL,NULL,0,NULL,NULL);
INSERT INTO "product" VALUES('prod_g4fix1glehhdsldozc8uk8y1',1761066405,1761066405,0,'Whiskey Rye Salted Chocolate Chip Cookie','Rich chocolate chip cookie with a hint of whiskey rye and sea salt.','cat_2tdLW2HVrEFaYPg1vxdKKC',400,NULL,'active',0,NULL,NULL,0,NULL,NULL);
INSERT INTO "product" VALUES('prod_hkmlajg97zagaxnosypawmt3',1761066405,1761066405,0,'Cinnamon Roll Cookie','All the flavors of a cinnamon roll in cookie form.','cat_2tdLW2HVrEFaYPg1vxdKKC',400,NULL,'active',0,NULL,NULL,0,NULL,NULL);
INSERT INTO "product" VALUES('prod_hba1q7p7v4j3h1d3nim7l95g',1761066405,1761066405,0,'Cowboy Cookie','Hearty cookie loaded with oats, chocolate chips, and coconut.','cat_2tdLW2HVrEFaYPg1vxdKKC',400,NULL,'active',0,NULL,NULL,0,NULL,NULL);
INSERT INTO "product" VALUES('prod_gsbgnuryl38lx9xdg6o36rcl',1761066405,1761066405,0,'Treasure Cookie','A treasure trove of flavors in every bite.','cat_2tdLW2HVrEFaYPg1vxdKKC',400,NULL,'active',0,NULL,NULL,0,NULL,NULL);
INSERT INTO "product" VALUES('prod_o2rlgl1hxyf8qd07sw0mnzlm',1761066405,1761066405,0,'GA Bar','Delicious bar cookie with a perfect blend of sweet and savory.','cat_2tdLW2HVrEFaYPg1vxdKKC',400,NULL,'active',0,NULL,NULL,0,NULL,NULL);
INSERT INTO "product" VALUES('prod_bmi5vwtntfi3u3mrxx8cz969',1761066405,1761066405,0,'Banana Chocolate Chip Cake - 6"','Moist banana cake studded with chocolate chips.','cat_2tdLW2HVrEFaYPg1vxdKKE',4500,NULL,'active',0,NULL,NULL,0,NULL,NULL);
INSERT INTO "product" VALUES('prod_ju009qeqref6krk32myrhvw3',1761066405,1761066405,0,'Banana Chocolate Chip Cake - 9"','Moist banana cake studded with chocolate chips.','cat_2tdLW2HVrEFaYPg1vxdKKE',4500,NULL,'active',0,NULL,NULL,0,NULL,NULL);
INSERT INTO "product" VALUES('prod_y204x38x9hzf86t2fh4nksqj',1761066405,1761066405,0,'Oreo Chocolate Cake - 6"','Rich chocolate cake with Oreo cookies baked in.','cat_2tdLW2HVrEFaYPg1vxdKKE',4500,NULL,'active',0,NULL,NULL,0,NULL,NULL);
INSERT INTO "product" VALUES('prod_v12ntf8n5bkp9ndlch7sbytg',1761066405,1761066405,0,'Oreo Chocolate Cake - 9"','Rich chocolate cake with Oreo cookies baked in.','cat_2tdLW2HVrEFaYPg1vxdKKE',4500,NULL,'active',0,NULL,NULL,0,NULL,NULL);
INSERT INTO "product" VALUES('prod_ktlreowbndh13drzvkflnpsx',1761066405,1761066405,0,'Custom Cake','Create your own custom cake. Contact us for pricing and details.','cat_2tdLW2HVrEFaYPg1vxdKKF',0,NULL,'active',0,NULL,NULL,0,NULL,NULL);
CREATE TABLE `order_item` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`updateCounter` integer DEFAULT 0,
	`orderId` text NOT NULL,
	`productId` text NOT NULL,
	`quantity` integer NOT NULL,
	`priceAtPurchase` integer NOT NULL, `customizations` text(5000),
	FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE `product_drop` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`updateCounter` integer DEFAULT 0,
	`name` text(255) NOT NULL,
	`description` text(2000),
	`loyaltyEarlyAccessStart` integer NOT NULL,
	`publicReleaseStart` integer NOT NULL,
	`endTime` integer,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`notificationSent` integer DEFAULT 0 NOT NULL
);
CREATE TABLE `product_drop_item` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`updateCounter` integer DEFAULT 0,
	`dropId` text NOT NULL,
	`productId` text NOT NULL,
	`limitedQuantity` integer NOT NULL,
	`remainingQuantity` integer NOT NULL,
	`maxPerCustomer` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`dropId`) REFERENCES `product_drop`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE TABLE IF NOT EXISTS "order" (
  `id` text PRIMARY KEY NOT NULL,
  `userId` text REFERENCES user(id),
  `customerEmail` text(255) NOT NULL,
  `customerName` text(255) NOT NULL,
  `customerPhone` text(50),
  `totalAmount` integer NOT NULL,
  `subtotal` integer NOT NULL,
  `tax` integer NOT NULL,
  `paymentStatus` text DEFAULT 'pending' NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `stripePaymentIntentId` text(255),
  `fulfillmentType` text(50),
  `pickupTime` integer,
  `deliveryAddress` text(1000),
  `notes` text(2000),
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL,
  `updateCounter` integer DEFAULT 0
);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" VALUES('d1_migrations',16);
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);
CREATE INDEX `email_idx` ON `user` (`email`);
CREATE INDEX `google_account_id_idx` ON `user` (`googleAccountId`);
CREATE INDEX `role_idx` ON `user` (`role`);
CREATE UNIQUE INDEX `passkey_credential_credentialId_unique` ON `passkey_credential` (`credentialId`);
CREATE INDEX `user_id_idx` ON `passkey_credential` (`userId`);
CREATE INDEX `credential_id_idx` ON `passkey_credential` (`credentialId`);
CREATE INDEX `category_slug_idx` ON `category` (`slug`);
CREATE INDEX `category_active_idx` ON `category` (`active`);
CREATE INDEX `product_category_idx` ON `product` (`categoryId`);
CREATE INDEX `product_status_idx` ON `product` (`status`);
CREATE INDEX `order_item_order_id_idx` ON `order_item` (`orderId`);
CREATE INDEX `order_item_product_id_idx` ON `order_item` (`productId`);
CREATE INDEX `product_stripe_product_id_idx` ON `product` (`stripeProductId`);
CREATE INDEX `product_is_new_flavor_idx` ON `product` (`isNewFlavor`);
CREATE INDEX `product_drop_status_idx` ON `product_drop` (`status`);
CREATE INDEX `product_drop_loyalty_start_idx` ON `product_drop` (`loyaltyEarlyAccessStart`);
CREATE INDEX `product_drop_public_start_idx` ON `product_drop` (`publicReleaseStart`);
CREATE INDEX `product_drop_item_drop_id_idx` ON `product_drop_item` (`dropId`);
CREATE INDEX `product_drop_item_product_id_idx` ON `product_drop_item` (`productId`);
CREATE INDEX `phone_idx` ON `user` (`phone`);
CREATE INDEX `order_user_id_idx` ON `order` (`userId`);
CREATE INDEX `order_payment_status_idx` ON `order` (`paymentStatus`);
CREATE INDEX `order_status_idx` ON `order` (`status`);
CREATE INDEX `order_created_at_idx` ON `order` (`createdAt`);
CREATE INDEX `order_stripe_payment_intent_id_idx` ON `order` (`stripePaymentIntentId`);