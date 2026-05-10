import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await prisma.note.findMany({
    where: { userId: session.user.id },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, content } = await req.json();
  if (!content?.trim())
    return NextResponse.json({ error: "Content is required" }, { status: 400 });

  await prisma.note.updateMany({
    where: { userId: session.user.id },
    data: { sortOrder: { increment: 1 } },
  });

  const note = await prisma.note.create({
    data: {
      userId: session.user.id,
      title: title?.trim() || null,
      content: content.trim(),
      sortOrder: 0,
      createdBy: session.user.email ?? "",
      updatedBy: session.user.email ?? "",
    },
  });

  return NextResponse.json(note, { status: 201 });
}
