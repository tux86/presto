CREATE TABLE "ExchangeRate" (
	"currency" text PRIMARY KEY NOT NULL,
	"rate" double precision NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
