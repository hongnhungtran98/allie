import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check user's notification setting — if disabled, return nothing (don't mark isReminded)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationEnabled: true },
  });
  if (!user?.notificationEnabled) return NextResponse.json([]);

  const now = new Date();
  const items = await prisma.timelineItem.findMany({
    where: {
      userId: session.user.id,
      hasReminder: true,
      isReminded: false,
      reminderTime: { lte: now },
    },
    select: { id: true, title: true, reminderTime: true },
  });

  return NextResponse.json(
    items.map((i) => ({
      id: i.id,
      title: i.title,
      reminderTime: i.reminderTime?.toISOString() ?? null,
    }))
  );
}
