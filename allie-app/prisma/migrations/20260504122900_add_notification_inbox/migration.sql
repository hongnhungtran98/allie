-- CreateTable
CREATE TABLE "NotificationInbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timelineItemId" TEXT,
    "title" TEXT NOT NULL,
    "itemDate" TEXT NOT NULL,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotificationInbox_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NotificationInbox" ADD CONSTRAINT "NotificationInbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationInbox" ADD CONSTRAINT "NotificationInbox_timelineItemId_fkey" FOREIGN KEY ("timelineItemId") REFERENCES "TimelineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
