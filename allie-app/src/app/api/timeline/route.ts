import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RawItem = Awaited<ReturnType<typeof prisma.timelineItem.findFirst>>;

function serializeItem(item: NonNullable<RawItem>) {
  return {
    id: item.id,
    title: item.title,
    dateStr: item.date.toISOString().slice(0, 10),
    time: item.time ? item.time.toISOString() : null,
    isDone: item.isDone,
    color: item.color ?? null,
    hasReminder: item.hasReminder,
    reminderMinutes: item.reminderMinutes ?? null,
    reminderTime: item.reminderTime ? item.reminderTime.toISOString() : null,
    isReminded: item.isReminded,
    recurrenceGroupId: item.recurrenceGroupId ?? null,
  };
}

// Compute absolute reminderTime from item date, time string "HH:MM", and offset minutes
function buildReminderTime(dateStr: string, timeStr: string, reminderMinutes: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  const fullTime = new Date(Date.UTC(y, m - 1, d, h, min, 0, 0));
  return new Date(fullTime.getTime() - reminderMinutes * 60 * 1000);
}

function parseUTCDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// Generate all dates matching a recurrence pattern between start and end (inclusive)
function generateRecurrenceDates(
  startStr: string,
  endStr: string,
  type: "daily-weekday" | "weekly" | "monthly",
  days?: number[]
): string[] {
  const results: string[] = [];
  const end = parseUTCDate(endStr);

  if (type === "daily-weekday") {
    let cur = parseUTCDate(startStr);
    while (cur <= end) {
      const dow = cur.getUTCDay();
      if (dow >= 1 && dow <= 5) results.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  } else if (type === "weekly") {
    const selected = days ?? [];
    let cur = parseUTCDate(startStr);
    while (cur <= end) {
      if (selected.includes(cur.getUTCDay())) results.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  } else if (type === "monthly") {
    const selected = (days ?? []).sort((a, b) => a - b);
    const [sy, sm] = startStr.split("-").map(Number);
    const [ey, em] = endStr.split("-").map(Number);
    let year = sy, month = sm;
    while (year < ey || (year === ey && month <= em)) {
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const seen = new Set<string>();
      for (const d of selected) {
        const actualDay = Math.min(d, daysInMonth);
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
        if (dateStr >= startStr && dateStr <= endStr && !seen.has(dateStr)) {
          results.push(dateStr);
          seen.add(dateStr);
        }
      }
      month++;
      if (month > 12) { month = 1; year++; }
    }
    results.sort();
  }

  return results;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  const startStr = searchParams.get("startDate");
  const endStr = searchParams.get("endDate");

  let start: Date, end: Date;
  if (startStr && endStr) {
    start = parseUTCDate(startStr);
    end = parseUTCDate(endStr);
    end.setUTCDate(end.getUTCDate() + 1);
  } else if (dateStr) {
    start = parseUTCDate(dateStr);
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
  } else {
    const todayStr = new Date().toISOString().slice(0, 10);
    start = parseUTCDate(todayStr);
    end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
  }

  const items = await prisma.timelineItem.findMany({
    where: { userId: session.user.id, date: { gte: start, lt: end } },
    orderBy: [{ date: "asc" }, { time: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });

  return NextResponse.json(items.map(serializeItem));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, date: dateStr, time: timeStr, color, hasReminder, reminderMinutes: rmMins, recurrence } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!dateStr) return NextResponse.json({ error: "Date is required" }, { status: 400 });

  const [year, month, day] = dateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  const timeObj = timeStr
    ? new Date(Date.UTC(year, month - 1, day, ...timeStr.split(":").map(Number) as [number, number]))
    : null;

  const shouldRemind = !!hasReminder && !!timeStr && rmMins > 0;
  const reminderTime = shouldRemind ? buildReminderTime(dateStr, timeStr, rmMins) : null;

  const baseData = {
    userId: session.user.id,
    title: title.trim(),
    time: timeObj,
    color: color || null,
    hasReminder: !!hasReminder,
    reminderMinutes: shouldRemind ? rmMins : null,
    reminderTime,
    createdBy: session.user.email ?? "",
    updatedBy: session.user.email ?? "",
  };

  // No recurrence — single item
  if (!recurrence) {
    const item = await prisma.timelineItem.create({ data: { ...baseData, date: dateObj } });
    return NextResponse.json(serializeItem(item), { status: 201 });
  }

  // Validate recurrence end date ≤ 6 months
  const maxEnd = new Date(Date.UTC(year, month - 1 + 6, day));
  const recEnd = parseUTCDate(recurrence.endDate);
  if (recEnd > maxEnd) {
    return NextResponse.json({ error: "Recurrence end date cannot exceed 6 months from start date" }, { status: 400 });
  }

  const dates = generateRecurrenceDates(dateStr, recurrence.endDate, recurrence.type, recurrence.days);
  if (dates.length === 0) {
    return NextResponse.json({ error: "No matching dates found for the recurrence pattern" }, { status: 400 });
  }

  const recurrenceGroupId = crypto.randomUUID();
  const items = await prisma.$transaction(
    dates.map((d) => {
      const [y, m, dy] = d.split("-").map(Number);
      const dDate = new Date(Date.UTC(y, m - 1, dy));
      const dTime = timeStr
        ? new Date(Date.UTC(y, m - 1, dy, ...timeStr.split(":").map(Number) as [number, number]))
        : null;
      const dReminderTime = shouldRemind ? buildReminderTime(d, timeStr, rmMins) : null;
      return prisma.timelineItem.create({
        data: { ...baseData, date: dDate, time: dTime, reminderTime: dReminderTime, recurrenceGroupId },
      });
    })
  );

  return NextResponse.json(items.map(serializeItem), { status: 201 });
}
