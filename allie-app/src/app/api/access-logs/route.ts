import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const path = typeof body?.path === "string" ? body.path.trim() : "";
  if (!path) return NextResponse.json({ error: "Invalid path" }, { status: 400 });

  await prisma.accessLog.create({
    data: {
      userId: session.user.id,
      path: path.slice(0, 500),
      ipAddress: getClientIp(req),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const pageSize = Math.min(200, Math.max(1, Number(sp.get("pageSize") ?? "50") || 50));
  const userId = sp.get("userId")?.trim() || undefined;
  const path = sp.get("path")?.trim() || undefined;
  const dateFrom = sp.get("dateFrom")?.trim() || undefined;
  const dateTo = sp.get("dateTo")?.trim() || undefined;

  const where: {
    userId?: string;
    path?: { contains: string; mode: "insensitive" };
    createdAt?: { gte?: Date; lte?: Date };
  } = {};
  if (userId) where.userId = userId;
  if (path) where.path = { contains: path, mode: "insensitive" };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      where.createdAt.lte = to;
    }
  }

  const [total, items] = await Promise.all([
    prisma.accessLog.count({ where }),
    prisma.accessLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    items: items.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.user.name,
      userEmail: l.user.email,
      path: l.path,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  });
}
