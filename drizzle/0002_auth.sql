CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`access_token_hash` text NOT NULL,
	`refresh_token_hash` text NOT NULL,
	`access_expires_at` integer NOT NULL,
	`refresh_expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_access_token_hash_unique` ON `sessions` (`access_token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_refresh_token_hash_unique` ON `sessions` (`refresh_token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`mobile` text NOT NULL,
	`password_hash` text NOT NULL,
	`employee_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_mobile_unique` ON `users` (`mobile`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_employee_id_unique` ON `users` (`employee_id`);