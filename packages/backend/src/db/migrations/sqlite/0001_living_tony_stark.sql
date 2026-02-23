CREATE TABLE `UserSettings` (
	`userId` text PRIMARY KEY NOT NULL,
	`theme` text DEFAULT 'dark' NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`baseCurrency` text DEFAULT 'EUR' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
