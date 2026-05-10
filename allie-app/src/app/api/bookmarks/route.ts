import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(bookmarks);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, url, icon, color } = await req.json();
  if (!title?.trim() || !url?.trim())
    return NextResponse.json({ error: "Title and URL are required" }, { status: 400 });

  const [, bookmark] = await prisma.$transaction([
    prisma.bookmark.updateMany({
      where: { userId: session.user.id },
      data: { sortOrder: { increment: 1 } },
    }),
    prisma.bookmark.create({
      data: {
        userId: session.user.id,
        title: title.trim(),
        url: url.trim(),
        sortOrder: 0,
        icon: icon?.trim() || null,
        color: color?.trim() || null,
      },
    }),
  ]);

  return NextResponse.json(bookmark, { status: 201 });
}
