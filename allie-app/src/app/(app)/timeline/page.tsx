import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TimelineList from "./TimelineList";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  const { date: dateParam } = await searchParams;

  const todayStr = new Date().toISOString().slice(0, 10);
  const initialDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayStr;

  const start = new Date(`${initialDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const items = await prisma.timelineItem.findMany({
    where: { userId: session!.user.id, date: { gte: start, lt: end }, },
    orderBy: [{ time: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">📅 Timeline</h1>
        <p className="text-sm text-ink-soft mt-1">Your daily schedule</p>
      </div>
      <TimelineList
        initialItems={items.map((item) => ({
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
        }))}
        initialDate={initialDate}
        todayStr={todayStr}
      />
    </div>
  );
}
