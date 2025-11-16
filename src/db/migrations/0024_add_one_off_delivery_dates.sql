-- Add one-off delivery/pickup dates table
CREATE TABLE `delivery_one_off_date` (
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`update_counter` integer DEFAULT 0,
	`id` text PRIMARY KEY NOT NULL,
	`date` text(20) NOT NULL,
	`type` text(20) NOT NULL,
	`reason` text(500),
	`time_window_start` text(10),
	`time_window_end` text(10),
	`cutoff_day` integer,
	`cutoff_time` text(10),
	`lead_time_days` integer,
	`is_active` integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
CREATE INDEX `delivery_one_off_date_idx` ON `delivery_one_off_date` (`date`);
--> statement-breakpoint
CREATE INDEX `delivery_one_off_type_idx` ON `delivery_one_off_date` (`type`);
--> statement-breakpoint
CREATE INDEX `delivery_one_off_active_idx` ON `delivery_one_off_date` (`is_active`);
