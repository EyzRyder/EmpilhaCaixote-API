CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`coins` integer DEFAULT 0 NOT NULL,
	`gems` integer DEFAULT 0 NOT NULL,
	`password` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_username_unique` ON `profiles` (`username`);--> statement-breakpoint
CREATE TABLE `shop_coin_packs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`coin_amount` integer NOT NULL,
	`price_gems` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shop_gem_packs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gem_amount` integer NOT NULL,
	`price_real` real NOT NULL,
	`store_product_id` text
);
--> statement-breakpoint
CREATE TABLE `shop_powers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price_coins` integer DEFAULT 0 NOT NULL,
	`icon_url` text
);
--> statement-breakpoint
CREATE TABLE `shop_skins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price_coins` integer DEFAULT 0 NOT NULL,
	`skin_type` text NOT NULL,
	`icon_url` text
);
--> statement-breakpoint
CREATE TABLE `user_equipped_items` (
	`user_id` text PRIMARY KEY NOT NULL,
	`scenario_skin_id` integer,
	`claw_skin_id` integer,
	`player_skin_id` integer,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scenario_skin_id`) REFERENCES `shop_skins`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`claw_skin_id`) REFERENCES `shop_skins`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_skin_id`) REFERENCES `shop_skins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_powers` (
	`user_id` text NOT NULL,
	`power_id` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`user_id`, `power_id`),
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`power_id`) REFERENCES `shop_powers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_skins` (
	`user_id` text NOT NULL,
	`skin_id` integer NOT NULL,
	PRIMARY KEY(`user_id`, `skin_id`),
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skin_id`) REFERENCES `shop_skins`(`id`) ON UPDATE no action ON DELETE cascade
);
