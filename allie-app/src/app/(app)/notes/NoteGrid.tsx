"use client";

import { useState, useRef, useEffect } from "react";
import { Check, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useToast } from "@/components/ui/Toast";
import NoteCard from "./NoteCard";

interface Note {
  id: string;
  title: string | null;
  content: string;
  sortOrder: number;
  updatedAt: string;
}

export default function NoteGrid({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [adding, setAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toast = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (adding && titleRef.current) titleRef.current.focus();
  }, [adding]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = notes.findIndex((n) => n.id === active.id);
    const newIndex = notes.findIndex((n) => n.id === over.id);
    const reordered = arrayMove(notes, oldIndex, newIndex);
    setNotes(reordered);
    fetch("/api/notes/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((n) => n.id) }),
    });
  };

  const handleAdd = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draftTitle.trim() || null, content: draft.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      const note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setDraftTitle("");
      setDraft("");
      setAdding(false);
      toast("success", "Note created");
    } else {
      toast("error", "Something went wrong. Please try again.");
    }
  };

  const handleCancel = () => { setDraftTitle(""); setDraft(""); setAdding(false); };

  const handleSave = (updated: Note) => {
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  };

  const handleDelete = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setAdding(true)}
          disabled={adding}
          className="bg-lavender-500 hover:bg-lavender-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
        >
          + Add note
        </button>
      </div>

      {/* New note card — sticky note style */}
      {adding && (
        <div
          className="rounded-2xl shadow-md flex flex-col sm:max-w-sm"
          style={{ background: "linear-gradient(160deg, #fef9c3 0%, #fef08a 100%)" }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-base select-none">📌</span>
            <span className="text-xs text-yellow-700/60 font-medium">New note</span>
          </div>

          <input
            ref={titleRef}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Title (optional)"
            className="mx-3 mb-2 px-3 py-1.5 rounded-lg bg-yellow-100/60 border border-yellow-300/60 text-sm font-semibold text-yellow-950 placeholder:text-yellow-800/35 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
          />

          <div
            className="mx-3 mb-3 rounded-lg overflow-hidden"
            style={{
              backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #d4b84a33 27px, #d4b84a33 28px)",
              backgroundPositionY: "8px",
            }}
          >
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write your note here…"
              rows={7}
              className="w-full bg-transparent text-sm text-yellow-950 placeholder:text-yellow-800/40 px-3 py-2 resize-none focus:outline-none leading-7"
              style={{ lineHeight: "28px" }}
            />
          </div>

          <div className="flex items-center justify-end gap-2 px-4 pb-4">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yellow-900 bg-yellow-200/60 hover:bg-yellow-200 rounded-lg transition-colors cursor-pointer"
            >
              <X size={12} /> Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !draft.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              <Check size={12} /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 && !adding ? (
        <div className="text-center py-16 text-ink-soft text-sm">
          No notes yet. Click <strong>+ Add note</strong> to get started.
        </div>
      ) : (
        <DndContext
          id="note-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={notes.map((n) => n.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} onSave={handleSave} onDelete={handleDelete} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </>
  );
}
