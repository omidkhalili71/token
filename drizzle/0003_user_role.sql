ALTER TABLE `users` ADD `role` text DEFAULT 'viewer' NOT NULL;
--> statement-breakpoint
UPDATE `users` SET `role` = 'admin' WHERE `mobile` = 'admin';
