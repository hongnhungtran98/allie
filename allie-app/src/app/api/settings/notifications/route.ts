import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { notificationEnabled: true },
    });
    return NextResponse.json({ notificationEnabled: user?.notificationEnabled ?? true });
  } catch {
    return NextResponse.json({ notificationEnabled: true });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notificationEnabled } = await req.json();
  if (typeof notificationEnabled !== "boolean") {
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationEnabled },
    select: { notificationEnabled: true },
  });

  return NextResponse.json({ notificationEnabled: user.notificationEnabled });
}
