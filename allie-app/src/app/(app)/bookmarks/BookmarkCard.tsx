"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Bookmark {
  id: string;
  title: string;
  url: string;
  isPinned: boolean;
  sortOrder: number;
  icon: string | null;
  color: string | null;
}

interface Props {
  bookmark: Bookmark;
  onPin: (bm: Bookmark) => void;
  onDelete: (bm: Bookmark) => void;
  onEdit: (bm: Bookmark) => void;
}

function getLucideIcon(name: string): LucideIcon | null {
  const pascal = name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  const icons = LucideIcons as Record<string, unknown>;
  const icon = icons[pascal] ?? icons[pascal + "Icon"];
  return icon != null ? (icon as LucideIcon) : null;
}

export default function BookmarkCard({ bookmark: bm, onPin, onDelete, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bm.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const Icon = bm.icon ? getLucideIcon(bm.icon) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-surface rounded-2xl border overflow-hidden flex flex-col transition-colors ${
        bm.isPinned ? "border-lavender-200" : "border-border"
      } ${isDragging ? "shadow-lg" : ""}`}
    >
      {/* Color accent bar */}
      {bm.color && <div className="h-1 w-full shrink-0" style={{ backgroundColor: bm.color }} />}

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Drag handle + icon + title row */}
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 text-ink-soft hover:text-ink transition-colors touch-none cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="4" cy="3" r="1.2" />
              <circle cx="10" cy="3" r="1.2" />
              <circle cx="4" cy="7" r="1.2" />
              <circle cx="10" cy="7" r="1.2" />
              <circle cx="4" cy="11" r="1.2" />
              <circle cx="10" cy="11" r="1.2" />
            </svg>
          </button>

          {/* Icon */}
          <div className="mt-0.5 w-4 h-4 shrink-0 flex items-center justify-center" style={{ color: bm.color || undefined }}>
            {Icon ? (
              <Icon size={15} />
            ) : (
              <LucideIcons.Bookmark size={14} className="text-ink-soft opacity-40" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-ink truncate" title={bm.title}>{bm.title}</p>
            <a
              href={bm.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-ink-soft hover:text-lavender-500 truncate block mt-0.5 transition-colors"
            >
              {bm.url.replace(/^https?:\/\//, "")}
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(bm)}
              title="Delete"
              className="p-1.5 rounded-lg text-ink-soft hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LucideIcons.Trash2 size={14} />
            </button>
            <button
              onClick={() => onEdit(bm)}
              title="Edit"
              className="p-1.5 rounded-lg text-ink-soft hover:text-lavender-500 hover:bg-lavender-50 transition-colors cursor-pointer"
            >
              <LucideIcons.Pencil size={14} />
            </button>
          </div>

          <button
            onClick={() => onPin(bm)}
            title={bm.isPinned ? "Unpin" : "Pin"}
            className={`text-sm px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              bm.isPinned
                ? "bg-lavender-200 text-lavender-700 hover:bg-lavender-300"
                : "text-ink-soft hover:bg-lavender-100 hover:text-lavender-600"
            }`}
          >
            {bm.isPinned ? "📌 Pinned" : "📌 Pin"}
          </button>
        </div>
      </div>
    </div>
  );
}
