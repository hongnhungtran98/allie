"use client";

import { useEffect, useRef } from "react";

export default function ReminderPoller() {
  const firedIds = useRef<Set<string>>(new Set());

  const check = async () => {
    // Browser notification permission must be granted
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    try {
      const res = await fetch("/api/timeline/reminders/due");
      if (!res.ok) return;

      const items: { id: string; title: string; reminderTime: string | null }[] = await res.json();
      const fresh = items.filter((i) => !firedIds.current.has(i.id));
      if (fresh.length === 0) return;

      for (const item of fresh) {
        firedIds.current.add(item.id);
        new Notification("⏰ Reminder — Allie", { body: item.title, icon: "/favicon.ico" });
        // Mark as reminded
        fetch(`/api/timeline/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isReminded: true }),
        });
      }
    } catch {}
  };

  useEffect(() => {
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
