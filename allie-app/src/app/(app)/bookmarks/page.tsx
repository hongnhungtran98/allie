import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import BookmarkGrid from "./BookmarkGrid";

export default async function BookmarksPage() {
  const session = await auth();
  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session!.user.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">🔖 Bookmarks</h1>
        <p className="text-sm text-ink-soft mt-1">Your saved links</p>
      </div>
      <BookmarkGrid initialBookmarks={bookmarks} />
    </div>
  );
}
