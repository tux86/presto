CREATE TABLE `ExchangeRate` (
	`currency` varchar(10) NOT NULL,
	`rate` double NOT NULL,
	`updatedAt` datetime(3) NOT NULL,
	CONSTRAINT `ExchangeRate_currency` PRIMARY KEY(`currency`)
);
