CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itinerary_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`userId` int NOT NULL,
	`category` enum('activity','lodging','restaurant','transportation','note') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`location` varchar(255),
	`island` varchar(128),
	`date` varchar(32),
	`timeOfDay` enum('morning','afternoon','evening','all_day'),
	`priceRange` varchar(64),
	`url` text,
	`imageUrl` text,
	`notes` text,
	`isSaved` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `itinerary_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `search_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tripId` int NOT NULL,
	`category` enum('activity','lodging','restaurant','transportation') NOT NULL,
	`island` varchar(128),
	`query` text,
	`results` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `search_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`destination` varchar(255) NOT NULL,
	`destinationKey` varchar(64) NOT NULL DEFAULT 'hawaii',
	`mascotType` varchar(64) NOT NULL DEFAULT 'hula_dancer',
	`status` enum('planning','booked','completed','archived') NOT NULL DEFAULT 'planning',
	`planningStage` enum('welcome','dates','islands','budget','activities','lodging','transportation','summary') NOT NULL DEFAULT 'welcome',
	`startDate` varchar(32),
	`endDate` varchar(32),
	`budgetMin` int,
	`budgetMax` int,
	`islands` json DEFAULT ('[]'),
	`guestCount` int DEFAULT 2,
	`guestNames` json DEFAULT ('[]'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trips_id` PRIMARY KEY(`id`)
);
