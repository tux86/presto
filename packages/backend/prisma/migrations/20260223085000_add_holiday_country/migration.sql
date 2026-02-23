-- AlterTable
ALTER TABLE "ActivityReport" ADD COLUMN     "holidayCountry" TEXT NOT NULL DEFAULT 'FR';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "holidayCountry" TEXT NOT NULL DEFAULT 'FR';
