"use client";

const PALETTE = [
  "#8B5CF6", "#F43F5E", "#0EA5E9", "#10B981",
  "#F59E0B", "#F97316", "#14B8A6", "#6366F1",
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  hint?: string;
}

export default function ColorPicker({ value, onChange, label = "Accent color", hint }: Props) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-medium text-ink-soft uppercase tracking-wide">{label} <span className="normal-case font-normal">(optional)</span></label>}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Native color picker */}
        <div className="relative w-8 h-8 shrink-0 rounded-lg border border-border overflow-hidden cursor-pointer">
          <div className="absolute inset-0" style={{ backgroundColor: value || "#e5e7eb" }} />
          <input
            type="color"
            value={value || "#8B5CF6"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            title="Pick a color"
          />
        </div>

        {/* Hex input */}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#8B5CF6"
          maxLength={7}
          className="w-20 px-2 py-1.5 rounded-lg border border-border bg-muted text-xs text-ink font-mono focus:outline-none focus:ring-2 focus:ring-lavender-300 transition"
        />

        {/* Palette */}
        <div className="flex items-center gap-1 flex-wrap">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => onChange(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                value === c ? "border-ink scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          {value && (
            <button
              type="button"
              title="Remove color"
              onClick={() => onChange("")}
              className="w-5 h-5 rounded-full border border-border bg-muted flex items-center justify-center text-ink-soft hover:text-red-400 transition-colors text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      {hint && <p className="text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}
