import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function getOwned(id: string, userId: string) {
  return prisma.note.findFirst({ where: { id, userId } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await getOwned(id, session.user.id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title, content } = await req.json();
  if (!content?.trim())
    return NextResponse.json({ error: "Content is required" }, { status: 400 });

  const updated = await prisma.note.update({
    where: { id },
    data: {
      title: title?.trim() || null,
      content: content.trim(),
      updatedBy: session.user.email ?? "",
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await getOwned(id, session.user.id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.note.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
