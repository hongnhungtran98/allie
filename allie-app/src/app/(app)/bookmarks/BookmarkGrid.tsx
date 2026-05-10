"use client";

import { useState } from "react";
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
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import AddBookmarkModal from "./AddBookmarkModal";
import EditBookmarkModal from "./EditBookmarkModal";
import BookmarkCard from "./BookmarkCard";

interface Bookmark {
  id: string;
  title: string;
  url: string;
  isPinned: boolean;
  sortOrder: number;
  icon: string | null;
  color: string | null;
}

export default function BookmarkGrid({ initialBookmarks }: { initialBookmarks: Bookmark[] }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Bookmark | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bookmark | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = bookmarks.findIndex((b) => b.id === active.id);
    const newIndex = bookmarks.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(bookmarks, oldIndex, newIndex);
    setBookmarks(reordered);
    fetch("/api/bookmarks/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((b) => b.id) }),
    });
  };

  const handleAdd = (bm: Bookmark) => {
    setBookmarks((prev) => [bm, ...prev]);
    toast("success", "Bookmark has been created successfully");
  };

  const handleSave = (updated: Bookmark) => {
    setBookmarks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleEditDelete = (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const handlePin = async (bm: Bookmark) => {
    const newVal = !bm.isPinned;
    setBookmarks((prev) => prev.map((b) => (b.id === bm.id ? { ...b, isPinned: newVal } : b)));
    const res = await fetch(`/api/bookmarks/${bm.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: newVal }),
    });
    if (!res.ok) {
      setBookmarks((prev) => prev.map((b) => (b.id === bm.id ? { ...b, isPinned: bm.isPinned } : b)));
      toast("error", "Something went wrong. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/bookmarks/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setBookmarks((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      toast("success", "Bookmark has been deleted");
    } else {
      toast("error", "Something went wrong. Please try again.");
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="bg-lavender-500 hover:bg-lavender-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
        >
          + Add bookmark
        </button>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-16 text-ink-soft text-sm">
          No bookmarks yet. Click <strong>+ Add bookmark</strong> to get started.
        </div>
      ) : (
        <DndContext id="bookmark-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={bookmarks.map((b) => b.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookmarks.map((bm) => (
                <BookmarkCard
                  key={bm.id}
                  bookmark={bm}
                  onPin={handlePin}
                  onDelete={setDeleteTarget}
                  onEdit={setEditTarget}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AddBookmarkModal open={showAdd} onClose={() => setShowAdd(false)} onAdd={handleAdd} />

      <EditBookmarkModal
        bookmark={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSave}
        onDelete={handleEditDelete}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </>
  );
}
