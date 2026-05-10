import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    prisma.notificationInbox.findMany({
      where: { userId: session.user.id },
      orderBy: { firedAt: "desc" },
    }),
    prisma.notificationInbox.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ]);

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      itemDate: n.itemDate,
      timelineItemId: n.timelineItemId,
      firedAt: n.firedAt.toISOString(),
      isRead: n.isRead,
    })),
    unreadCount,
  });
}
