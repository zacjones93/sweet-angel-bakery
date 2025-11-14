-- Add site content management tables

CREATE TABLE `home_notification` (
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`updateCounter` integer DEFAULT 0,
	`id` text PRIMARY KEY NOT NULL,
	`title` text(255) NOT NULL,
	`message` text(2000) NOT NULL,
	`imageUrl` text(600),
	`isActive` integer DEFAULT 1 NOT NULL,
	`displayOrder` integer DEFAULT 0 NOT NULL,
	`startDate` integer,
	`endDate` integer
);

CREATE TABLE `sales_banner` (
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`updateCounter` integer DEFAULT 0,
	`id` text PRIMARY KEY NOT NULL,
	`message` text(500) NOT NULL,
	`backgroundColor` text(50) DEFAULT '#ef4444' NOT NULL,
	`textColor` text(50) DEFAULT '#ffffff' NOT NULL,
	`endDateTime` integer NOT NULL,
	`isActive` integer DEFAULT 1 NOT NULL,
	`isDismissible` integer DEFAULT 1 NOT NULL,
	`ctaText` text(100),
	`ctaLink` text(500)
);
