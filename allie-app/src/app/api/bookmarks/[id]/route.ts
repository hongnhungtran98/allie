import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function getOwned(id: string, userId: string) {
  return prisma.bookmark.findFirst({ where: { id, userId } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const bookmark = await getOwned(id, session.user.id);
  if (!bookmark) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.bookmark.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.url !== undefined && { url: body.url }),
      ...(body.isPinned !== undefined && { isPinned: body.isPinned }),
      ...(body.icon !== undefined && { icon: body.icon || null }),
      ...(body.color !== undefined && { color: body.color || null }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const bookmark = await getOwned(id, session.user.id);
  if (!bookmark) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.bookmark.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
