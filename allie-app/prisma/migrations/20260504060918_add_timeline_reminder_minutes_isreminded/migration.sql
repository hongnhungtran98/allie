-- AlterTable
ALTER TABLE "TimelineItem" ADD COLUMN     "isReminded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderMinutes" INTEGER;
