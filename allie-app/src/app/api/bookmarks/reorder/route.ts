import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await req.json() as { ids: string[] };
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids must be an array" }, { status: 400 });

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.bookmark.updateMany({
        where: { id, userId: session.user.id },
        data: { sortOrder: index },
      })
    )
  );

  return new NextResponse(null, { status: 204 });
}
