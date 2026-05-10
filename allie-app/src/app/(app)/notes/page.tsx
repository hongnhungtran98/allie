import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import NoteGrid from "./NoteGrid";

export default async function NotesPage() {
  const session = await auth();
  const notes = await prisma.note.findMany({
    where: { userId: session!.user.id },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">📝 Notes</h1>
        <p className="text-sm text-ink-soft mt-1">Your quick notes</p>
      </div>
      <NoteGrid initialNotes={notes.map((n) => ({ id: n.id, title: n.title, content: n.content, sortOrder: n.sortOrder, updatedAt: n.updatedAt.toISOString() }))} />
    </div>
  );
}
