-- AlterTable
ALTER TABLE "TimelineItem" ADD COLUMN     "color" TEXT,
ADD COLUMN     "hasReminder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurrenceGroupId" TEXT;
