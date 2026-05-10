import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = (await req.json()) as { ids: string[] };
  if (!Array.isArray(ids)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  // Use raw SQL to update sortOrder without triggering Prisma's automatic updatedAt update
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.$executeRaw`UPDATE "Note" SET "sortOrder" = ${index} WHERE id = ${id} AND "userId" = ${session.user.id}`
    )
  );

  return new NextResponse(null, { status: 204 });
}
