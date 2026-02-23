CREATE TABLE `ActivityReport` (
	`id` varchar(36) NOT NULL,
	`month` int NOT NULL,
	`year` int NOT NULL,
	`status` enum('DRAFT','COMPLETED') NOT NULL DEFAULT 'DRAFT',
	`totalDays` double NOT NULL DEFAULT 0,
	`note` text,
	`dailyRate` double,
	`holidayCountry` varchar(10) NOT NULL,
	`missionId` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`createdAt` datetime(3) NOT NULL,
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `ActivityReport_id` PRIMARY KEY(`id`),
	CONSTRAINT `ActivityReport_missionId_month_year_key` UNIQUE(`missionId`,`month`,`year`)
);
--> statement-breakpoint
CREATE TABLE `Client` (
	`id` varchar(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`email` varchar(254),
	`phone` varchar(50),
	`address` text,
	`businessId` varchar(100),
	`color` varchar(20),
	`currency` varchar(10) NOT NULL,
	`holidayCountry` varchar(10) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`createdAt` datetime(3) NOT NULL,
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `Client_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ExchangeRate` (
	`currency` varchar(10) NOT NULL,
	`rate` double NOT NULL,
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `ExchangeRate_currency` PRIMARY KEY(`currency`)
);
--> statement-breakpoint
CREATE TABLE `Mission` (
	`id` varchar(36) NOT NULL,
	`name` varchar(200) NOT NULL,
	`clientId` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`dailyRate` double,
	`startDate` datetime(3),
	`endDate` datetime(3),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` datetime(3) NOT NULL,
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `Mission_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ReportEntry` (
	`id` varchar(36) NOT NULL,
	`date` datetime(3) NOT NULL,
	`value` double NOT NULL DEFAULT 0,
	`note` text,
	`isWeekend` boolean NOT NULL DEFAULT false,
	`isHoliday` boolean NOT NULL DEFAULT false,
	`reportId` varchar(36) NOT NULL,
	CONSTRAINT `ReportEntry_id` PRIMARY KEY(`id`),
	CONSTRAINT `ReportEntry_reportId_date_key` UNIQUE(`reportId`,`date`)
);
--> statement-breakpoint
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
CREATE TABLE `User` (
	`id` varchar(36) NOT NULL,
	`email` varchar(254) NOT NULL,
	`password` text NOT NULL,
	`firstName` varchar(200) NOT NULL,
	`lastName` varchar(200) NOT NULL,
	`company` varchar(200),
	`createdAt` datetime(3) NOT NULL,
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `User_id` PRIMARY KEY(`id`),
	CONSTRAINT `User_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `ActivityReport` ADD CONSTRAINT `ActivityReport_missionId_Mission_id_fk` FOREIGN KEY (`missionId`) REFERENCES `Mission`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ActivityReport` ADD CONSTRAINT `ActivityReport_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Client` ADD CONSTRAINT `Client_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Mission` ADD CONSTRAINT `Mission_clientId_Client_id_fk` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Mission` ADD CONSTRAINT `Mission_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ReportEntry` ADD CONSTRAINT `ReportEntry_reportId_ActivityReport_id_fk` FOREIGN KEY (`reportId`) REFERENCES `ActivityReport`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `UserSettings` ADD CONSTRAINT `UserSettings_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ActivityReport_userId_year_month_idx` ON `ActivityReport` (`userId`,`year`,`month`);--> statement-breakpoint
CREATE INDEX `Client_userId_idx` ON `Client` (`userId`);--> statement-breakpoint
CREATE INDEX `Mission_userId_idx` ON `Mission` (`userId`);--> statement-breakpoint
CREATE INDEX `Mission_clientId_idx` ON `Mission` (`clientId`);