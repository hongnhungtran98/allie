import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const session = await auth();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: { name?: string; email?: string; role?: "ADMIN" | "USER"; notificationEnabled?: boolean } = {};

  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Tên không được trống" }, { status: 400 });
    data.name = name;
  }

  if (typeof body?.email === "string") {
    const email = body.email.trim().toLowerCase();
    if (!email.includes("@")) return NextResponse.json({ error: "Email không hợp lệ" }, { status: 400 });
    if (email !== target.email) {
      const existed = await prisma.user.findUnique({ where: { email } });
      if (existed) return NextResponse.json({ error: "Email đã tồn tại" }, { status: 409 });
    }
    data.email = email;
  }

  if (body?.role === "ADMIN" || body?.role === "USER") {
    if (target.role === "ADMIN" && body.role === "USER") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Phải còn ít nhất 1 admin" }, { status: 400 });
      }
    }
    data.role = body.role;
  }

  if (typeof body?.notificationEnabled === "boolean") {
    data.notificationEnabled = body.notificationEnabled;
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, notificationEnabled: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;

  if (id === guard.session!.user.id) {
    return NextResponse.json({ error: "Không thể tự xoá tài khoản của mình" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Phải còn ít nhất 1 admin" }, { status: 400 });
    }
  }

  await prisma.user.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
