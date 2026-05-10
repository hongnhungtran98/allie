"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import BookmarkIconColorPicker from "./BookmarkIconColorPicker";

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
  open: boolean;
  onClose: () => void;
  onAdd: (bm: Bookmark) => void;
}

export default function AddBookmarkModal({ open, onClose, onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; url?: string }>({});
  const toast = useToast();

  if (!open) return null;

  const validate = () => {
    const e: typeof errors = {};
    if (!title.trim()) e.title = "Title is required";
    if (!url.trim()) e.url = "URL is required";
    else if (!/^https?:\/\/.+/.test(url.trim())) e.url = "URL must start with http:// or https://";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), url: url.trim(), icon: icon.trim() || null, color: color.trim() || null }),
    });
    setLoading(false);

    if (res.ok) {
      const bm = await res.json();
      onAdd(bm);
      reset();
      onClose();
    } else {
      toast("error", "Something went wrong. Please try again.");
    }
  };

  const reset = () => {
    setTitle("");
    setUrl("");
    setIcon("");
    setColor("");
    setErrors({});
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
      <div className="relative bg-surface rounded-2xl shadow-lg border border-border w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-semibold text-ink text-base mb-5">Add bookmark</h3>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => { setTitle(e.target.value); setErrors((prev) => ({ ...prev, title: undefined })); }}
              onBlur={validate}
              placeholder="e.g. GitHub"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent transition ${
                errors.title ? "border-red-400 bg-red-50" : "border-border bg-bg"
              }`}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              URL <span className="text-red-400">*</span>
            </label>
            <input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setErrors((prev) => ({ ...prev, url: undefined })); }}
              onBlur={validate}
              placeholder="https://..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent transition ${
                errors.url ? "border-red-400 bg-red-50" : "border-border bg-bg"
              }`}
            />
            {errors.url && <p className="text-xs text-red-500 mt-1">{errors.url}</p>}
          </div>

          <BookmarkIconColorPicker
            icon={icon}
            color={color}
            onIconChange={setIcon}
            onColorChange={setColor}
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-ink border border-border rounded-xl hover:bg-bg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-lavender-500 hover:bg-lavender-600 disabled:opacity-60 rounded-xl transition-colors cursor-pointer"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
