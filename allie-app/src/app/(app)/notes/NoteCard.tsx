"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

interface Note {
  id: string;
  title: string | null;
  content: string;
  sortOrder: number;
  updatedAt: string;
}

interface Props {
  note: Note;
  onSave: (updated: Note) => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const LINE_HEIGHT = 28;
const MAX_LINES = 7;
const CONTENT_HEIGHT = LINE_HEIGHT * MAX_LINES; // 196px

export default function NoteCard({ note, onSave, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: note.id });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(note.title ?? "");
  const [draftContent, setDraftContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      const len = draftContent.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  const handleEdit = () => {
    setDraftTitle(note.title ?? "");
    setDraftContent(note.content);
    setEditing(true);
  };

  const handleCancel = () => {
    setDraftTitle(note.title ?? "");
    setDraftContent(note.content);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!draftContent.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draftTitle.trim() || null, content: draftContent.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      onSave(updated);
      setEditing(false);
      toast("success", "Note updated");
    } else {
      toast("error", "Something went wrong. Please try again.");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      onDelete(note.id);
      toast("success", "Note deleted");
    } else {
      toast("error", "Something went wrong. Please try again.");
    }
    setShowConfirm(false);
  };

  const noteStyle = { background: "linear-gradient(160deg, #fef9c3 0%, #fef08a 100%)" };
  const linesStyle = {
    backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #d4b84a33 27px, #d4b84a33 28px)",
    backgroundPositionY: "8px",
  };

  return (
    <>
      <div ref={setNodeRef} style={{ ...noteStyle, ...sortableStyle }} className={`rounded-2xl shadow-md flex flex-col ${isDragging ? "shadow-lg" : ""}`}>
        {/* Pin + drag handle + actions */}
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base select-none">📌</span>
            <button
              {...attributes}
              {...listeners}
              className="text-yellow-800/40 hover:text-yellow-900 transition-colors touch-none cursor-grab active:cursor-grabbing"
              title="Drag to reorder"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                <circle cx="4" cy="3" r="1.2" />
                <circle cx="10" cy="3" r="1.2" />
                <circle cx="4" cy="7" r="1.2" />
                <circle cx="10" cy="7" r="1.2" />
                <circle cx="4" cy="11" r="1.2" />
                <circle cx="10" cy="11" r="1.2" />
              </svg>
            </button>
          </div>
          {!editing && (
            <div className="flex items-center gap-1">
              <button onClick={handleEdit} title="Edit"
                className="p-1.5 rounded-lg text-yellow-800/50 hover:text-yellow-900 hover:bg-yellow-200/60 transition-colors cursor-pointer">
                <Pencil size={13} />
              </button>
              <button onClick={() => setShowConfirm(true)} title="Delete"
                className="p-1.5 rounded-lg text-yellow-800/50 hover:text-red-500 hover:bg-red-100/60 transition-colors cursor-pointer">
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Title (optional)"
              className="mx-3 mb-2 px-3 py-1.5 rounded-lg bg-yellow-100/60 border border-yellow-300/60 text-sm font-semibold text-yellow-950 placeholder:text-yellow-800/35 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
            />
            <div className="mx-3 mb-3 rounded-lg overflow-hidden" style={linesStyle}>
              <textarea
                ref={textareaRef}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                rows={7}
                className="w-full bg-transparent text-sm text-yellow-950 px-3 py-2 resize-none focus:outline-none leading-7"
                style={{ lineHeight: `${LINE_HEIGHT}px` }}
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-4 pb-4">
              <button onClick={handleCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yellow-900 bg-yellow-200/60 hover:bg-yellow-200 rounded-lg transition-colors cursor-pointer">
                <X size={12} /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !draftContent.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer">
                <Check size={12} /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Title */}
            {note.title && (
              <p className="px-4 pb-1 text-sm font-semibold text-yellow-950">{note.title}</p>
            )}

            {/* Content — fixed height of 7 lines, overflow hidden */}
            <div className="mx-3 rounded-lg overflow-hidden" style={linesStyle}>
              <p
                className="text-sm text-yellow-950 whitespace-pre-wrap break-words px-3 py-2"
                style={{
                  lineHeight: `${LINE_HEIGHT}px`,
                  height: `${CONTENT_HEIGHT}px`,
                  overflow: "hidden",
                }}
              >
                {note.content}
              </p>
            </div>

            {/* Footer */}
            <div className="px-4 pb-4 pt-2 mt-auto">
              <span className="text-xs text-yellow-700/60">{formatDate(note.updatedAt)}</span>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={showConfirm}
        message="Are you sure you want to delete this note? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
        loading={deleting}
      />
    </>
  );
}
