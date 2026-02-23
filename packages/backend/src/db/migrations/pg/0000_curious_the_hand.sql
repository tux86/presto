CREATE TYPE "public"."ReportStatus" AS ENUM('DRAFT', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "ActivityReport" (
	"id" text PRIMARY KEY NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"status" "ReportStatus" DEFAULT 'DRAFT' NOT NULL,
	"totalDays" double precision DEFAULT 0 NOT NULL,
	"note" text,
	"holidayCountry" text NOT NULL,
	"missionId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "ActivityReport_missionId_month_year_key" UNIQUE("missionId","month","year")
);
--> statement-breakpoint
CREATE TABLE "Client" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"businessId" text,
	"currency" text NOT NULL,
	"holidayCountry" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Mission" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"clientId" text NOT NULL,
	"userId" text NOT NULL,
	"dailyRate" double precision,
	"startDate" timestamp (3),
	"endDate" timestamp (3),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ReportEntry" (
	"id" text PRIMARY KEY NOT NULL,
	"date" timestamp (3) NOT NULL,
	"value" double precision DEFAULT 0 NOT NULL,
	"note" text,
	"isWeekend" boolean DEFAULT false NOT NULL,
	"isHoliday" boolean DEFAULT false NOT NULL,
	"reportId" text NOT NULL,
	CONSTRAINT "ReportEntry_reportId_date_key" UNIQUE("reportId","date")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"company" text,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ActivityReport" ADD CONSTRAINT "ActivityReport_missionId_Mission_id_fk" FOREIGN KEY ("missionId") REFERENCES "public"."Mission"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ActivityReport" ADD CONSTRAINT "ActivityReport_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_clientId_Client_id_fk" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ReportEntry" ADD CONSTRAINT "ReportEntry_reportId_ActivityReport_id_fk" FOREIGN KEY ("reportId") REFERENCES "public"."ActivityReport"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ActivityReport_userId_year_month_idx" ON "ActivityReport" USING btree ("userId","year","month");--> statement-breakpoint
CREATE INDEX "Client_userId_idx" ON "Client" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Mission_userId_idx" ON "Mission" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Mission_clientId_idx" ON "Mission" USING btree ("clientId");