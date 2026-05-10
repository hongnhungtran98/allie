"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
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
  bookmark: Bookmark | null;
  onClose: () => void;
  onSave: (updated: Bookmark) => void;
  onDelete: (id: string) => void;
}

export default function EditBookmarkModal({ bookmark, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("");
  const [color, setColor] = useState("");
  const [errors, setErrors] = useState<{ title?: string; url?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title);
      setUrl(bookmark.url);
      setIcon(bookmark.icon ?? "");
      setColor(bookmark.color ?? "");
      setErrors({});
    }
  }, [bookmark]);

  if (!bookmark) return null;

  const validate = () => {
    const e: typeof errors = {};
    if (!title.trim()) e.title = "Title is required";
    if (!url.trim()) e.url = "URL is required";
    else if (!/^https?:\/\/.+/.test(url.trim())) e.url = "URL must start with http:// or https://";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const res = await fetch(`/api/bookmarks/${bookmark.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        url: url.trim(),
        icon: icon.trim() || null,
        color: color.trim() || null,
      }),
    });
    setLoading(false);
    if (res.ok) {
      const updated = await res.json();
      onSave(updated);
      toast("success", "Bookmark has been updated");
      onClose();
    } else {
      toast("error", "Something went wrong. Please try again.");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/bookmarks/${bookmark.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      onDelete(bookmark.id);
      toast("success", "Bookmark has been deleted");
      setShowConfirm(false);
      onClose();
    } else {
      toast("error", "Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="relative bg-surface rounded-2xl shadow-lg border border-border w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-ink text-base">Edit bookmark</h3>
            <button
              onClick={() => setShowConfirm(true)}
              title="Delete bookmark"
              className="p-1.5 rounded-lg text-ink-soft hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3,4 12,4" />
                <path d="M5 4V3h5v1" />
                <rect x="3.5" y="4" width="8" height="8" rx="1" />
                <line x1="6" y1="7" x2="6" y2="10" />
                <line x1="9" y1="7" x2="9" y2="10" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                autoFocus
                value={title}
                onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: undefined })); }}
                onBlur={validate}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-ink focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent transition ${
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
                onChange={(e) => { setUrl(e.target.value); setErrors((p) => ({ ...p, url: undefined })); }}
                onBlur={validate}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-ink focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent transition ${
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
                onClick={onClose}
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

      <ConfirmDialog
        open={showConfirm}
        message={`Are you sure you want to delete "${bookmark.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        loading={deleting}
      />
    </>
  );
}
