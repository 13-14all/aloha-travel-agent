ALTER TABLE `users` ADD `displayName` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `hasChosenName` boolean DEFAULT false NOT NULL;