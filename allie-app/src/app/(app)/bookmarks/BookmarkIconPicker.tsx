"use client";

import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

function getLucideIcon(name: string): LucideIcon | null {
  if (!name.trim()) return null;
  const pascal = name.trim().split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  const icons = LucideIcons as Record<string, unknown>;
  const icon = icons[pascal] ?? icons[pascal + "Icon"];
  return icon != null ? (icon as LucideIcon) : null;
}

interface Props {
  value: string;
  onChange: (name: string) => void;
}

export default function BookmarkIconPicker({ value, onChange }: Props) {
  const Icon = getLucideIcon(value);
  const hasInput = value.trim().length > 0;
  const isValid = hasInput && Icon !== null;
  const isInvalid = hasInput && Icon === null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-ink">Icon</label>
        <a
          href="https://lucide.dev/icons"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-lavender-500 hover:text-lavender-600 transition-colors"
        >
          Browse lucide.dev/icons ↗
        </a>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter icon name, e.g. github"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent transition ${
              isInvalid ? "border-red-300 bg-red-50" : "border-border bg-bg"
            }`}
          />
          {isInvalid && (
            <p className="text-xs text-red-400 mt-1">Icon not found. Check the name at lucide.dev/icons.</p>
          )}
        </div>

        {/* Preview */}
        <div className={`w-10 h-10 shrink-0 rounded-xl border flex items-center justify-center transition-colors ${
          isValid ? "border-lavender-200 bg-lavender-50 text-lavender-600" : "border-border bg-bg text-ink-soft"
        }`}>
          {isValid && Icon ? (
            <Icon size={18} />
          ) : (
            <LucideIcons.Bookmark size={16} className="opacity-25" />
          )}
        </div>
      </div>
    </div>
  );
}
