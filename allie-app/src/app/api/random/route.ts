import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.randomItem.findMany({
    where: { OR: [{ userId: null }, { userId: session.user.id }] },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, isSystem } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  if (isSystem && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const item = await prisma.randomItem.create({
    data: {
      name: name.trim(),
      userId: isSystem ? null : session.user.id,
      createdBy: session.user.email ?? session.user.id,
      updatedBy: session.user.email ?? session.user.id,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
