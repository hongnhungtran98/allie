"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Bell } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AddTimelineItemModal from "./AddTimelineItemModal";
import EditTimelineItemModal from "./EditTimelineItemModal";

export interface TimelineItem {
  id: string;
  title: string;
  dateStr: string;
  time: string | null;
  isDone: boolean;
  color: string | null;
  hasReminder: boolean;
  reminderMinutes: number | null;
  reminderTime: string | null;
  isReminded: boolean;
  recurrenceGroupId: string | null;
}

interface Props {
  initialItems: TimelineItem[];
  initialDate: string;
  todayStr: string;
}

type View = "day" | "week" | "month";

// ── date helpers ──────────────────────────────────────────────
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function shiftDay(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function shiftMonth(s: string, n: number): string {
  const [y, m, d] = s.split("-").map(Number);
  const nd = new Date(y, m - 1 + n, d);
  if (nd.getMonth() !== ((m - 1 + n + 12) % 12)) nd.setDate(0);
  return toDateStr(nd);
}

function getWeekRange(anchor: string): { days: string[]; label: string } {
  const d = parseDate(anchor);
  const dow = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  const days = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(mon);
    x.setDate(mon.getDate() + i);
    return toDateStr(x);
  });
  const sun = parseDate(days[6]);
  const fmt = (dt: Date) => dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const label = mon.getFullYear() === sun.getFullYear()
    ? `${fmt(mon)} – ${fmt(sun)}, ${mon.getFullYear()}`
    : `${fmt(mon)} ${mon.getFullYear()} – ${fmt(sun)} ${sun.getFullYear()}`;
  return { days, label };
}

function getMonthRange(anchor: string): { days: string[]; label: string } {
  const [y, m] = anchor.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const days = Array.from({ length: lastDay }, (_, i) =>
    `${y}-${String(m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
  );
  const label = new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return { days, label };
}

function formatDayLabel(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return "Today";
  return parseDate(dateStr).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function formatSectionLabel(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short" });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const offsetMin = -new Date().getTimezoneOffset();
  let totalMin = d.getUTCHours() * 60 + d.getUTCMinutes() + offsetMin;
  totalMin = ((totalMin % 1440) + 1440) % 1440;
  return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}

// ── item row ──────────────────────────────────────────────────
function ItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: TimelineItem;
  onToggle: (item: TimelineItem) => void;
  onEdit: (item: TimelineItem) => void;
  onDelete: (item: TimelineItem) => void;
}) {
  const accent = item.color;
  return (
    <div className="group flex items-center gap-3 px-5 py-3" style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item)}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
          item.isDone ? "bg-lavender-500 border-lavender-500" : "border-border hover:border-lavender-400"
        }`}
      >
        {item.isDone && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Title + time */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm ${item.isDone ? "line-through text-ink-soft" : "text-ink"}`}>{item.title}</p>
          {item.hasReminder && <Bell size={12} className="shrink-0 text-lavender-400" />}
        </div>
        {item.time && <p className="text-xs text-ink-soft mt-0.5">{formatTime(item.time)}</p>}
      </div>

      {/* Actions (visible on hover) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(item)}
          className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-muted transition-colors cursor-pointer" title="Edit">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(item)}
          className="p-1.5 rounded-lg text-ink-soft hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer" title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── delete dialog for recurrence ──────────────────────────────
function RecurrenceDeleteDialog({
  open, itemTitle, onSingle, onSeries, onCancel,
}: {
  open: boolean; itemTitle: string;
  onSingle: () => void; onSeries: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-sm p-6 space-y-4">
        <h2 className="font-semibold text-ink">Delete recurring item</h2>
        <p className="text-sm text-ink-soft">
          <span className="font-medium text-ink">"{itemTitle}"</span> is part of a recurring series. What would you like to delete?
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={onSingle}
            className="w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-ink hover:bg-muted transition-colors cursor-pointer text-left">
            Delete this item only
          </button>
          <button onClick={onSeries}
            className="w-full px-4 py-2.5 rounded-xl border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors cursor-pointer text-left">
            Delete entire series
          </button>
          <button onClick={onCancel}
            className="w-full px-4 py-2 text-sm text-ink-soft hover:text-ink transition-colors cursor-pointer">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────
export default function TimelineList({ initialItems, initialDate, todayStr }: Props) {
  const [view, setView] = useState<View>("day");
  const [anchor, setAnchor] = useState(initialDate);
  const [items, setItems] = useState<TimelineItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TimelineItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimelineItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  // ── fetch helpers ──
  const fetchRange = async (startDate: string, endDate: string) => {
    setLoading(true);
    const res = await fetch(`/api/timeline?startDate=${startDate}&endDate=${endDate}`);
    setLoading(false);
    if (res.ok) setItems(await res.json());
  };

  const fetchForView = (newAnchor: string, newView: View) => {
    if (newView === "day") fetchRange(newAnchor, newAnchor);
    else if (newView === "week") { const { days } = getWeekRange(newAnchor); fetchRange(days[0], days[6]); }
    else { const { days } = getMonthRange(newAnchor); fetchRange(days[0], days[days.length - 1]); }
  };

  // Restore saved view from localStorage after hydration
  useEffect(() => {
    const saved = localStorage.getItem("timeline-view") as View | null;
    if (saved && saved !== "day") {
      setView(saved);
      fetchForView(anchor, saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync view to localStorage
  useEffect(() => {
    localStorage.setItem("timeline-view", view);
  }, [view]);

  const changeView = (v: View) => { setView(v); fetchForView(anchor, v); };

  const navigate = (direction: -1 | 1) => {
    let next: string;
    if (view === "day") next = shiftDay(anchor, direction);
    else if (view === "week") next = shiftDay(anchor, direction * 7);
    else next = shiftMonth(anchor, direction);
    setAnchor(next);
    fetchForView(next, view);
  };

  const goToday = () => { setAnchor(todayStr); fetchForView(todayStr, view); };

  // ── toggle done ──
  const handleToggle = async (item: TimelineItem) => {
    const next = !item.isDone;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isDone: next } : i)));
    const res = await fetch(`/api/timeline/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: next }),
    });
    if (!res.ok) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isDone: item.isDone } : i)));
      toast("error", "Something went wrong. Please try again.");
    }
  };

  // ── delete ──
  const handleDeleteClick = (item: TimelineItem) => setDeleteTarget(item);

  const doDelete = async (scope: "single" | "series") => {
    if (!deleteTarget) return;
    setDeleting(true);
    const url = scope === "series"
      ? `/api/timeline/${deleteTarget.id}?scope=series`
      : `/api/timeline/${deleteTarget.id}`;
    const res = await fetch(url, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      if (scope === "series" && deleteTarget.recurrenceGroupId) {
        setItems((prev) => prev.filter((i) => i.recurrenceGroupId !== deleteTarget.recurrenceGroupId));
      } else {
        setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      }
      toast("success", scope === "series" ? "Series deleted" : "Item deleted");
    } else {
      toast("error", "Something went wrong. Please try again.");
    }
    setDeleteTarget(null);
  };

  // ── after add ──
  const handleAdded = (data: TimelineItem | TimelineItem[]) => {
    fetchForView(anchor, view); // reload to reflect new items in correct order
    toast("success", Array.isArray(data) ? `${data.length} items added` : "Item added");
  };

  // ── after edit ──
  const handleSaved = () => { fetchForView(anchor, view); toast("success", "Item updated"); };

  // ── nav label ──
  const isTodayInView = (() => {
    if (view === "day") return anchor === todayStr;
    if (view === "week") return getWeekRange(anchor).days.includes(todayStr);
    const [ay, am] = anchor.split("-").map(Number);
    const [ty, tm] = todayStr.split("-").map(Number);
    return ay === ty && am === tm;
  })();

  const navLabel = view === "day" ? formatDayLabel(anchor, todayStr)
    : view === "week" ? getWeekRange(anchor).label
    : getMonthRange(anchor).label;

  const addDefaultDate = view === "day" ? anchor : todayStr;

  // ── render helpers ──
  const renderItems = (dayItems: TimelineItem[]) =>
    dayItems.map((item) => (
      <ItemRow key={item.id} item={item} onToggle={handleToggle} onEdit={setEditTarget} onDelete={handleDeleteClick} />
    ));

  const renderDayView = () => {
    if (loading) return <div className="py-12 text-center text-sm text-ink-soft">Loading…</div>;
    if (items.length === 0) return <div className="py-12 text-center text-sm text-ink-soft">Nothing scheduled for this day.</div>;
    return <div className="divide-y divide-border">{renderItems(items)}</div>;
  };

  const renderGroupedView = (days: string[]) => {
    if (loading) return <div className="py-12 text-center text-sm text-ink-soft">Loading…</div>;
    const byDate = new Map<string, TimelineItem[]>();
    for (const item of items) {
      if (!byDate.has(item.dateStr)) byDate.set(item.dateStr, []);
      byDate.get(item.dateStr)!.push(item);
    }
    const visibleDays = view === "week" ? days : days.filter((d) => byDate.has(d));
    if (visibleDays.length === 0) return <div className="py-12 text-center text-sm text-ink-soft">No items this {view}.</div>;

    return (
      <div className="divide-y divide-border">
        {visibleDays.map((d) => {
          const dayItems = byDate.get(d) ?? [];
          const isToday = d === todayStr;
          return (
            <div key={d}>
              <div className={`px-5 py-2 flex items-center gap-2 ${isToday ? "bg-lavender-50" : ""}`}>
                <span className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-lavender-600" : "text-ink-soft"}`}>
                  {formatSectionLabel(d)}
                </span>
                {isToday && <span className="text-xs bg-lavender-100 text-lavender-600 px-1.5 py-0.5 rounded-md font-medium">Today</span>}
              </div>
              {dayItems.length === 0
                ? <p className="px-5 py-2 text-xs text-ink-soft/50 italic">No items</p>
                : <div className="divide-y divide-border">{renderItems(dayItems)}</div>}
            </div>
          );
        })}
      </div>
    );
  };

  const content = view === "day" ? renderDayView()
    : view === "week" ? renderGroupedView(getWeekRange(anchor).days)
    : renderGroupedView(getMonthRange(anchor).days);

  const isRecurrenceDelete = !!deleteTarget?.recurrenceGroupId;

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex bg-muted rounded-xl p-1 gap-0.5">
          {(["day", "week", "month"] as View[]).map((v) => (
            <button key={v} onClick={() => changeView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors cursor-pointer ${
                view === v ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}>
              {v}
            </button>
          ))}
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 bg-lavender-500 hover:bg-lavender-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer">
          <Plus size={15} /> Add item
        </button>
      </div>

      {/* Date nav */}
      <div className="bg-surface rounded-2xl border border-border px-4 py-3 flex items-center justify-between gap-2">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-ink-soft hover:text-ink hover:bg-muted transition-colors cursor-pointer">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink text-sm text-center">{navLabel}</span>
          {!isTodayInView && (
            <button onClick={goToday} className="text-xs px-2.5 py-1 rounded-lg bg-lavender-100 hover:bg-lavender-200 text-lavender-600 font-medium transition-colors cursor-pointer">
              Today
            </button>
          )}
        </div>
        <button onClick={() => navigate(1)} className="p-2 rounded-lg text-ink-soft hover:text-ink hover:bg-muted transition-colors cursor-pointer">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">{content}</div>

      <AddTimelineItemModal open={addOpen} defaultDate={addDefaultDate} onClose={() => setAddOpen(false)} onAdded={handleAdded} />
      <EditTimelineItemModal open={!!editTarget} item={editTarget} onClose={() => setEditTarget(null)} onSaved={handleSaved} />

      {/* Delete: simple confirm for non-recurrence */}
      <ConfirmDialog
        open={!!deleteTarget && !isRecurrenceDelete}
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={() => doDelete("single")}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      {/* Delete: recurrence dialog */}
      <RecurrenceDeleteDialog
        open={!!deleteTarget && isRecurrenceDelete}
        itemTitle={deleteTarget?.title ?? ""}
        onSingle={() => doDelete("single")}
        onSeries={() => doDelete("series")}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
