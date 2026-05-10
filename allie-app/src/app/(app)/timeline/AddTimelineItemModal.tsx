"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import ColorPicker from "@/components/ui/ColorPicker";

interface AddedItem {
  id: string; title: string; dateStr: string; time: string | null;
  isDone: boolean; color: string | null; hasReminder: boolean;
  reminderMinutes: number | null; reminderTime: string | null; isReminded: boolean;
  recurrenceGroupId: string | null;
}

interface Props {
  open: boolean;
  defaultDate: string;
  onClose: () => void;
  onAdded: (items: AddedItem | AddedItem[]) => void;
}

function toUTCTimeStr(dateStr: string, localTimeStr: string): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const [h, min] = localTimeStr.split(":").map(Number);
  const d = new Date(y, m - 1, day, h, min);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

const WEEKDAYS = [
  { label: "Mon", value: 1 }, { label: "Tue", value: 2 }, { label: "Wed", value: 3 },
  { label: "Thu", value: 4 }, { label: "Fri", value: 5 }, { label: "Sat", value: 6 }, { label: "Sun", value: 0 },
];

function getMaxEndDate(startDate: string): string {
  const [y, m, d] = startDate.split("-").map(Number);
  const max = new Date(Date.UTC(y, m - 1 + 6, d));
  return max.toISOString().slice(0, 10);
}

export default function AddTimelineItemModal({ open, defaultDate, onClose, onAdded }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [color, setColor] = useState("");
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState("15");
  const [repeat, setRepeat] = useState(false);
  const [repeatType, setRepeatType] = useState<"daily-weekday" | "weekly" | "monthly">("daily-weekday");
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([]);
  const [repeatMonthDays, setRepeatMonthDays] = useState<number[]>([]);
  const [repeatEnd, setRepeatEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(""); setDate(defaultDate); setTime(""); setColor("");
      setHasReminder(false); setReminderMinutes("15"); setRepeat(false);
      setRepeatType("daily-weekday"); setRepeatWeekdays([]); setRepeatMonthDays([]);
      setRepeatEnd(""); setError("");
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open, defaultDate]);

  const toggleWeekday = (v: number) =>
    setRepeatWeekdays((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const toggleMonthDay = (v: number) =>
    setRepeatMonthDays((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    if (repeat) {
      if (!repeatEnd) { setError("End date is required for recurrence"); return; }
      if (repeatType === "weekly" && repeatWeekdays.length === 0) { setError("Select at least one weekday"); return; }
      if (repeatType === "monthly" && repeatMonthDays.length === 0) { setError("Select at least one day of month"); return; }
    }

    setSaving(true); setError("");
    const rmMins = parseInt(reminderMinutes, 10);
    const utcTime = time ? toUTCTimeStr(date, time) : null;
    const body: Record<string, unknown> = {
      title: title.trim(), date, time: utcTime, color: color || null, hasReminder,
      reminderMinutes: hasReminder && rmMins > 0 ? rmMins : null,
    };
    if (repeat) {
      body.recurrence = {
        type: repeatType,
        endDate: repeatEnd,
        days: repeatType === "weekly" ? repeatWeekdays : repeatType === "monthly" ? repeatMonthDays : undefined,
      };
    }

    const res = await fetch("/api/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      onAdded(data);
      onClose();
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Something went wrong. Please try again.");
    }
  };

  if (!open) return null;

  const maxEnd = getMaxEndDate(date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">Add timeline item</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-muted transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-soft uppercase tracking-wide">Title *</label>
            <input ref={titleRef} value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="What's on your schedule?"
              className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-lavender-300" />
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
              <div className="ml-13 flex items-center gap-2 pl-[52px]">
                <input
                  type="number" min="1" max="1440" value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(e.target.value)}
                  className="w-20 px-3 py-1.5 rounded-xl border border-border bg-muted text-sm text-ink focus:outline-none focus:ring-2 focus:ring-lavender-300 text-center"
                />
                <span className="text-sm text-ink-soft">minutes before</span>
              </div>
            )}
          </div>

          {/* Recurrence */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setRepeat((v) => !v)}
                className={`w-10 h-6 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${repeat ? "bg-lavender-500" : "bg-border"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${repeat ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className="text-sm text-ink">Repeat</span>
            </label>

            {repeat && (
              <div className="pl-13 space-y-3 border-l-2 border-lavender-100 ml-5 pl-4">
                {/* Type */}
                <div className="flex gap-1.5 flex-wrap">
                  {(["daily-weekday", "weekly", "monthly"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setRepeatType(t)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        repeatType === t ? "bg-lavender-500 text-white" : "bg-muted text-ink-soft hover:text-ink"
                      }`}>
                      {t === "daily-weekday" ? "Daily (weekday)" : t === "weekly" ? "Weekly" : "Monthly"}
                    </button>
                  ))}
                </div>

                {/* Weekly: select weekdays */}
                {repeatType === "weekly" && (
                  <div className="flex gap-1 flex-wrap">
                    {WEEKDAYS.map(({ label, value }) => (
                      <button key={value} type="button" onClick={() => toggleWeekday(value)}
                        className={`w-9 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          repeatWeekdays.includes(value) ? "bg-lavender-500 text-white" : "bg-muted text-ink-soft hover:text-ink"
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Monthly: select days 1-31 */}
                {repeatType === "monthly" && (
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <button key={d} type="button" onClick={() => toggleMonthDay(d)}
                        className={`h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          repeatMonthDays.includes(d) ? "bg-lavender-500 text-white" : "bg-muted text-ink-soft hover:text-ink"
                        }`}>
                        {d}
                      </button>
                    ))}
                  </div>
                )}

                {/* End date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink-soft uppercase tracking-wide">End date * <span className="normal-case font-normal text-ink-soft/60">(max {maxEnd})</span></label>
                  <input type="date" value={repeatEnd} min={date} max={maxEnd}
                    onChange={(e) => setRepeatEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-muted text-sm text-ink focus:outline-none focus:ring-2 focus:ring-lavender-300 cursor-pointer" />
                </div>
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
              {saving ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
