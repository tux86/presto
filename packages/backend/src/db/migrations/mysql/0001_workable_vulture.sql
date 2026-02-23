CREATE TABLE `UserSettings` (
	`userId` varchar(36) NOT NULL,
	`theme` varchar(10) NOT NULL DEFAULT 'dark',
	`locale` varchar(5) NOT NULL DEFAULT 'en',
	`baseCurrency` varchar(10) NOT NULL DEFAULT 'EUR',
	`createdAt` datetime(3) NOT NULL,
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `UserSettings_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
ALTER TABLE `UserSettings` ADD CONSTRAINT `UserSettings_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE no action;