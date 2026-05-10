import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function getOwned(id: string, userId: string) {
  return prisma.timelineItem.findFirst({ where: { id, userId } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await getOwned(id, session.user.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { isDone, title, date: dateStr, time: timeStr, color, hasReminder, reminderMinutes: rmMins, isReminded } = await req.json();

  const data: Record<string, unknown> = { updatedBy: session.user.email ?? "" };
  if (isDone !== undefined) data.isDone = isDone;
  if (title !== undefined) data.title = title.trim();
  if (color !== undefined) data.color = color || null;
  if (hasReminder !== undefined) data.hasReminder = !!hasReminder;
  if (isReminded !== undefined) data.isReminded = !!isReminded;
  if (rmMins !== undefined) data.reminderMinutes = rmMins ?? null;

  const effectiveDateIso = dateStr ?? item.date.toISOString().slice(0, 10);
  if (dateStr !== undefined) {
    const [y, mo, d] = dateStr.split("-").map(Number);
    data.date = new Date(Date.UTC(y, mo - 1, d));
  }

  if (timeStr !== undefined) {
    if (timeStr === null) {
      data.time = null;
    } else {
      const [y, mo, d] = effectiveDateIso.split("-").map(Number);
      const [h, m] = timeStr.split(":").map(Number);
      data.time = new Date(Date.UTC(y, mo - 1, d, h, m, 0, 0));
    }
  }

  // Recompute reminderTime when reminder settings or time/date change
  const reminderSettingsChanged = timeStr !== undefined || dateStr !== undefined || rmMins !== undefined || hasReminder !== undefined;
  if (reminderSettingsChanged) {
    const effectiveHasReminder = (data.hasReminder !== undefined ? data.hasReminder : item.hasReminder) as boolean;
    const effectiveRmMins = (data.reminderMinutes !== undefined ? data.reminderMinutes : item.reminderMinutes) as number | null;

    // Determine the effective time string for reminderTime calculation
    let effectiveTimeStr: string | null = null;
    if (timeStr !== undefined) {
      effectiveTimeStr = timeStr; // null or "HH:MM"
    } else if (item.time) {
      const h = item.time.getUTCHours();
      const m = item.time.getUTCMinutes();
      effectiveTimeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    if (!effectiveHasReminder) {
      data.reminderTime = null;
      if (isReminded === undefined) data.isReminded = false;
    } else if (effectiveTimeStr && effectiveRmMins && effectiveRmMins > 0) {
      const [y, mo, d] = effectiveDateIso.split("-").map(Number);
      const [h, m] = effectiveTimeStr.split(":").map(Number);
      const fullTime = new Date(Date.UTC(y, mo - 1, d, h, m, 0, 0));
      data.reminderTime = new Date(fullTime.getTime() - effectiveRmMins * 60 * 1000);
      // Reset isReminded so the reminder fires again with new settings
      if (isReminded === undefined) data.isReminded = false;
    } else {
      data.reminderTime = null;
    }
  }

  try {
    const updated = await prisma.timelineItem.update({ where: { id }, data });

    // When a reminder fires, log it to the notification inbox
    if (isReminded === true) {
      await prisma.notificationInbox.create({
        data: {
          userId: session.user.id,
          timelineItemId: id,
          title: item.title,
          itemDate: item.date.toISOString().slice(0, 10),
        },
      });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/timeline/:id]", err);
    return NextResponse.json({ error: "Internal server error", detail: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await getOwned(id, session.user.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope"); // "single" | "series"

  if (scope === "series" && item.recurrenceGroupId) {
    await prisma.timelineItem.deleteMany({
      where: { recurrenceGroupId: item.recurrenceGroupId, userId: session.user.id },
    });
  } else {
    await prisma.timelineItem.delete({ where: { id } });
  }

  return new NextResponse(null, { status: 204 });
}
