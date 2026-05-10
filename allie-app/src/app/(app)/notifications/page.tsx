"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  itemDate: string;
  timelineItemId: string | null;
  firedAt: string;
  isRead: boolean;
}

function formatFiredAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
      );
    }
    router.push(`/timeline?date=${n.itemDate}`);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Notification Inbox</h1>
          <p className="text-sm text-ink-soft mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={async () => {
              const unread = notifications.filter((n) => !n.isRead);
              await Promise.all(unread.map((n) => fetch(`/api/notifications/${n.id}`, { method: "PATCH" })));
              setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            }}
            className="flex items-center gap-1.5 text-sm text-lavender-600 hover:text-lavender-700 font-medium transition-colors cursor-pointer"
          >
            <CheckCheck size={15} />
            Mark all read
          </button>
        )}
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        {loading && (
          <div className="py-12 text-center text-sm text-ink-soft">Loading…</div>
        )}
        {!loading && notifications.length === 0 && (
          <div className="py-12 text-center space-y-2">
            <Bell size={32} className="mx-auto text-ink-soft/40" />
            <p className="text-sm text-ink-soft">No notifications yet</p>
          </div>
        )}
        {!loading && notifications.length > 0 && (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-muted transition-colors cursor-pointer ${
                  n.isRead ? "opacity-60" : ""
                }`}
              >
                <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${
                  n.isRead ? "bg-muted" : "bg-lavender-100"
                }`}>
                  <Bell size={15} className={n.isRead ? "text-ink-soft" : "text-lavender-500"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.isRead && (
                      <span className="shrink-0 w-2 h-2 rounded-full bg-lavender-500" />
                    )}
                    <p className="text-sm font-medium text-ink truncate">{n.title}</p>
                  </div>
                  <p className="text-xs text-ink-soft mt-0.5">{formatFiredAt(n.firedAt)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
