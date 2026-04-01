CREATE TABLE `trip_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`token` varchar(128) NOT NULL,
	`role` enum('planner','viewer') NOT NULL DEFAULT 'planner',
	`inviteeName` varchar(128),
	`inviteeEmail` varchar(320),
	`accepted` boolean NOT NULL DEFAULT false,
	`acceptedByUserId` int,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `trip_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `trip_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`userId` int,
	`name` varchar(128) NOT NULL,
	`email` varchar(320),
	`role` enum('owner','planner','viewer') NOT NULL DEFAULT 'planner',
	`planningPath` enum('activities_first','lodging_first') NOT NULL DEFAULT 'activities_first',
	`planningStage` enum('welcome','dates','islands','budget','activities','lodging','transportation','summary') NOT NULL DEFAULT 'welcome',
	`avatarColor` varchar(16) NOT NULL DEFAULT '#0ea5e9',
	`planningComplete` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trip_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `memberId` int;--> statement-breakpoint
ALTER TABLE `itinerary_items` ADD `memberId` int;--> statement-breakpoint
ALTER TABLE `itinerary_items` ADD `isMaster` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `itinerary_items` ADD `votes` int DEFAULT 0 NOT NULL;