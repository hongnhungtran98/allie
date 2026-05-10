"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import ColorPicker from "@/components/ui/ColorPicker";

interface TimelineItem {
  id: string; title: string; dateStr: string; time: string | null;
  isDone: boolean; color: string | null; hasReminder: boolean; reminderMinutes: number | null; recurrenceGroupId: string | null;
}

interface Props {
  open: boolean;
  item: TimelineItem | null;
  onClose: () => void;
  onSaved: () => void; // reload data after save
}

// Returns local HH:MM from a stored UTC ISO string
function isoToTimeStr(iso: string): string {
  const d = new Date(iso);
  const offsetMin = -new Date().getTimezoneOffset();
  let totalMin = d.getUTCHours() * 60 + d.getUTCMinutes() + offsetMin;
  totalMin = ((totalMin % 1440) + 1440) % 1440;
  return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}

// Convert a local HH:MM on a given date to UTC HH:MM for storage
function toUTCTimeStr(dateStr: string, localTimeStr: string): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const [h, min] = localTimeStr.split(":").map(Number);
  const d = new Date(y, m - 1, day, h, min);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export default function EditTimelineItemModal({ open, item, onClose, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [color, setColor] = useState("");
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState("15");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && item) {
      setTitle(item.title);
      setDate(item.dateStr);
      setTime(item.time ? isoToTimeStr(item.time) : "");
      setColor(item.color ?? "");
      setHasReminder(item.hasReminder);
      setReminderMinutes(item.reminderMinutes ? String(item.reminderMinutes) : "15");
      setError("");
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    if (!item) return;

    setSaving(true); setError("");
    const res = await fetch(`/api/timeline/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        date,
        time: time ? toUTCTimeStr(date, time) : null,
        color: color || null,
        hasReminder,
        reminderMinutes: hasReminder && parseInt(reminderMinutes, 10) > 0 ? parseInt(reminderMinutes, 10) : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    } else {
      setError("Something went wrong. Please try again.");
    }
  };

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">Edit item</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-muted transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-soft uppercase tracking-wide">Title *</label>
            <input ref={titleRef} value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }}
              className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-sm text-ink focus:outline-none focus:ring-2 focus:ring-lavender-300" />
          </div>

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-soft uppercase tracking-wide">Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-sm text-ink focus:outline-none focus:ring-2 focus:ring-lavender-300 cursor-pointer" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-soft uppercase tracking-wide">Time <span className="normal-case font-normal">(optional)</span></label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-sm text-ink focus:outline-none focus:ring-2 focus:ring-lavender-300 cursor-pointer" />
            </div>
          </div>

          {/* Color */}
          <ColorPicker value={color} onChange={setColor} />

          {/* Has Reminder */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setHasReminder((v) => !v)}
                className={`w-10 h-6 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${hasReminder ? "bg-lavender-500" : "bg-border"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${hasReminder ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className="text-sm text-ink">Has Reminder</span>
            </label>
            {hasReminder && (
              <div className="flex items-center gap-2 pl-[52px]">
                <input
                  type="number" min="1" max="1440" value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(e.target.value)}
                  className="w-20 px-3 py-1.5 rounded-xl border border-border bg-muted text-sm text-ink focus:outline-none focus:ring-2 focus:ring-lavender-300 text-center"
                />
                <span className="text-sm text-ink-soft">minutes before</span>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-border text-sm font-medium text-ink hover:bg-muted transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 rounded-xl bg-lavender-500 hover:bg-lavender-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
