import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getGreeting, formatDate } from "@/lib/greeting";
import Link from "next/link";
import EmptyTimeline from "@/components/illustrations/EmptyTimeline";
import EmptyBookmark from "@/components/illustrations/EmptyBookmark";
import PinnedBookmarkItem from "./PinnedBookmarkItem";

async function getTodayTimeline(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.timelineItem.findMany({
    where: { userId, date: { gte: today, lt: tomorrow } },
    orderBy: [{ time: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });
}

async function getPinnedBookmarks(userId: string) {
  return prisma.bookmark.findMany({
    where: { userId, isPinned: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 6,
  });
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [timelineItems, pinnedBookmarks] = await Promise.all([
    getTodayTimeline(userId),
    getPinnedBookmarks(userId),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-ink">
          {getGreeting()}, {session!.user.name} 👋
        </h1>
        <p className="text-sm text-ink-soft mt-1">{formatDate(new Date())}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Timeline */}
        <div className="bg-surface rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink">📅 Today</h2>
            <Link
              href="/timeline"
              className="text-xs bg-lavender-100 hover:bg-lavender-200 text-lavender-600 font-medium px-2.5 py-1 rounded-lg transition-colors"
            >
              View all
            </Link>
          </div>

          {timelineItems.length === 0 ? (
            <div className="flex flex-col items-center py-4 gap-3">
              <EmptyTimeline />
              <p className="text-sm text-ink-soft text-center">
                No items scheduled today
              </p>
              <Link
                href="/timeline"
                className="text-xs bg-lavender-500 hover:bg-lavender-600 text-white font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                + Add item
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {timelineItems.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 ${
                      item.isDone
                        ? "bg-lavender-500 border-lavender-500"
                        : "border-border"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.isDone ? "line-through text-ink-soft" : "text-ink"}`}>
                      {item.title}
                    </p>
                    {item.time && (
                      <p className="text-xs text-ink-soft mt-0.5">
                        {(() => { const d = new Date(item.time); const off = -new Date().getTimezoneOffset(); let t = d.getUTCHours() * 60 + d.getUTCMinutes() + off; t = ((t % 1440) + 1440) % 1440; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; })()}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pinned Bookmarks */}
        <div className="bg-surface rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink">🔖 Pinned</h2>
            <Link
              href="/bookmarks"
              className="text-xs bg-lavender-100 hover:bg-lavender-200 text-lavender-600 font-medium px-2.5 py-1 rounded-lg transition-colors"
            >
              View all
            </Link>
          </div>

          {pinnedBookmarks.length === 0 ? (
            <div className="flex flex-col items-center py-4 gap-3">
              <EmptyBookmark />
              <p className="text-sm text-ink-soft text-center">
                No pinned bookmarks yet
              </p>
              <Link
                href="/bookmarks"
                className="text-xs bg-lavender-500 hover:bg-lavender-600 text-white font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                + Add bookmark
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {pinnedBookmarks.map((bm) => (
                <PinnedBookmarkItem
                  key={bm.id}
                  id={bm.id}
                  title={bm.title}
                  url={bm.url}
                  icon={bm.icon}
                  color={bm.color}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Random Tool shortcut */}
      <div className="bg-lavender-50 rounded-2xl border border-lavender-100 p-6 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-ink">🎲 What to eat today?</h2>
          <p className="text-sm text-ink-soft mt-0.5">Let Allie decide for you</p>
        </div>
        <Link
          href="/random"
          className="bg-lavender-500 hover:bg-lavender-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          Random
        </Link>
      </div>
    </div>
  );
}
