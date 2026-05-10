"use client";

import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

function getLucideIcon(name: string): LucideIcon | null {
  const pascal = name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  const icons = LucideIcons as Record<string, unknown>;
  const icon = icons[pascal] ?? icons[pascal + "Icon"];
  return icon != null ? (icon as LucideIcon) : null;
}

interface Props {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  color: string | null;
}

export default function PinnedBookmarkItem({ title, url, icon, color }: Props) {
  const Icon = icon ? getLucideIcon(icon) : null;
  const accent = color || null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:border-lavender-200 hover:bg-lavender-50 transition-colors group overflow-hidden"
      style={accent ? { borderLeftColor: accent, borderLeftWidth: "3px" } : undefined}
    >
      <span
        className="shrink-0"
        style={{ color: accent || undefined }}
      >
        {Icon ? (
          <Icon size={15} />
        ) : (
          <LucideIcons.Bookmark size={14} className="text-ink-soft opacity-40" />
        )}
      </span>
      <span className="text-sm text-ink group-hover:text-lavender-600 truncate font-medium" title={title}>
        {title}
      </span>
    </a>
  );
}
