-- 1. Create Company table
CREATE TABLE "Company" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"businessId" text,
	"isDefault" boolean DEFAULT false NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp (3) NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "Company_userId_idx" ON "Company" USING btree ("userId");
--> statement-breakpoint
-- 2. Add companyId to Mission as NULLABLE first
ALTER TABLE "Mission" ADD COLUMN "companyId" text;
--> statement-breakpoint
-- 3. Data migration: create a default Company for each user
INSERT INTO "Company" ("id", "name", "isDefault", "userId", "createdAt", "updatedAt")
SELECT
  substr(md5(random()::text), 1, 21),
  COALESCE(NULLIF("company", ''), 'Default'),
  true,
  "id",
  NOW(),
  NOW()
FROM "User";
--> statement-breakpoint
-- 4. Set companyId on all existing missions to the user's default company
UPDATE "Mission" m
SET "companyId" = c."id"
FROM "Company" c
WHERE c."userId" = m."userId" AND c."isDefault" = true;
--> statement-breakpoint
-- 5. Make companyId NOT NULL now that all rows have values
ALTER TABLE "Mission" ALTER COLUMN "companyId" SET NOT NULL;
--> statement-breakpoint
-- 6. Add FK constraint and index for companyId
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "Mission_companyId_idx" ON "Mission" USING btree ("companyId");
--> statement-breakpoint
-- 7. Drop the old company column from User
ALTER TABLE "User" DROP COLUMN "company";
