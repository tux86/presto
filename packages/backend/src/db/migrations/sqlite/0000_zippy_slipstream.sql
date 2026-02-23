CREATE TABLE `ActivityReport` (
	`id` text PRIMARY KEY NOT NULL,
	`month` integer NOT NULL,
	`year` integer NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`totalDays` real DEFAULT 0 NOT NULL,
	`note` text,
	`holidayCountry` text NOT NULL,
	`missionId` text NOT NULL,
	`userId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`missionId`) REFERENCES `Mission`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ActivityReport_userId_year_month_idx` ON `ActivityReport` (`userId`,`year`,`month`);--> statement-breakpoint
CREATE UNIQUE INDEX `ActivityReport_missionId_month_year_key` ON `ActivityReport` (`missionId`,`month`,`year`);--> statement-breakpoint
CREATE TABLE `Client` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`address` text,
	`businessId` text,
	`currency` text NOT NULL,
	`holidayCountry` text NOT NULL,
	`userId` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Client_userId_idx` ON `Client` (`userId`);--> statement-breakpoint
CREATE TABLE `Mission` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`clientId` text NOT NULL,
	`userId` text NOT NULL,
	`dailyRate` real,
	`startDate` integer,
	`endDate` integer,
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Mission_userId_idx` ON `Mission` (`userId`);--> statement-breakpoint
CREATE INDEX `Mission_clientId_idx` ON `Mission` (`clientId`);--> statement-breakpoint
CREATE TABLE `ReportEntry` (
	`id` text PRIMARY KEY NOT NULL,
	`date` integer NOT NULL,
	`value` real DEFAULT 0 NOT NULL,
	`note` text,
	`isWeekend` integer DEFAULT false NOT NULL,
	`isHoliday` integer DEFAULT false NOT NULL,
	`reportId` text NOT NULL,
	FOREIGN KEY (`reportId`) REFERENCES `ActivityReport`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ReportEntry_reportId_date_key` ON `ReportEntry` (`reportId`,`date`);--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`firstName` text NOT NULL,
	`lastName` text NOT NULL,
	`company` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `User_email_unique` ON `User` (`email`);