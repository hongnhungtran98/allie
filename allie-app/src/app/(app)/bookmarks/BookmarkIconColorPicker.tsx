"use client";

import BookmarkIconPicker from "./BookmarkIconPicker";

const PALETTE = [
  "#8B5CF6", "#F43F5E", "#0EA5E9", "#10B981",
  "#F59E0B", "#F97316", "#14B8A6", "#6366F1",
];

interface Props {
  icon: string;
  color: string;
  onIconChange: (v: string) => void;
  onColorChange: (v: string) => void;
}

export default function BookmarkIconColorPicker({ icon, color, onIconChange, onColorChange }: Props) {
  return (
    <div className="space-y-4">
      <BookmarkIconPicker value={icon} onChange={onIconChange} />

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">Accent color</label>
        <div className="flex items-center gap-2">
          {/* Color picker */}
          <div className="relative w-8 h-8 shrink-0 rounded-lg border border-border overflow-hidden cursor-pointer">
            <div className="absolute inset-0" style={{ backgroundColor: color || "#e5e7eb" }} />
            <input
              type="color"
              value={color || "#8B5CF6"}
              onChange={(e) => onColorChange(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              title="Pick a color"
            />
          </div>

          {/* Hex input */}
          <input
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            placeholder="#8B5CF6"
            maxLength={7}
            className="w-20 px-2 py-1.5 rounded-lg border border-border bg-bg text-xs text-ink font-mono focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent transition"
          />

          {/* Palette */}
          <div className="flex items-center gap-1">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => onColorChange(c)}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                  color === c ? "border-ink scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            {color && (
              <button
                type="button"
                title="Remove color"
                onClick={() => onColorChange("")}
                className="w-5 h-5 rounded-full border border-border bg-bg flex items-center justify-center text-ink-soft hover:text-red-400 transition-colors text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-ink-soft mt-1">Used as accent on the bookmark card. Leave empty for default.</p>
      </div>
    </div>
  );
}
