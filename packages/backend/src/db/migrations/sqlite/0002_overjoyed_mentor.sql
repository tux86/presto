CREATE TABLE `ExchangeRate` (
	`currency` text PRIMARY KEY NOT NULL,
	`rate` real NOT NULL,
	`updatedAt` integer NOT NULL
);
