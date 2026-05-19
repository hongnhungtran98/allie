import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const order = await prisma.foodOrder.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      menuItems: { where: { isAvailable: true }, orderBy: { name: "asc" } },
      selections: {
        include: {
          user: { select: { id: true, name: true } },
          menuItem: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only creator or participants can view
  const isCreator = order.creatorId === session.user.id;
  const isParticipant = order.selections.some((s) => s.userId === session.user.id);
  if (!isCreator && !isParticipant)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Auto-close if countdown expired
  if (order.status === "open" && order.countdownEnd && order.countdownEnd <= new Date()) {
    await prisma.foodOrder.update({ where: { id }, data: { status: "closed" } });
    order.status = "closed";
  }

  return NextResponse.json(order);
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.foodOrder.findUnique({ where: { id } });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.creatorId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  // Allow closing the order
  if (body.action === "close") {
    const updated = await prisma.foodOrder.update({
      where: { id },
      data: { status: "closed" },
    });
    return NextResponse.json(updated);
  }

  // Extend countdown by +10 minutes, max 3 times per order
  if (body.action === "extend") {
    const MAX_EXTENSIONS = 3;
    const EXTEND_MINUTES = 10;
    if (order.status !== "open")
      return NextResponse.json({ error: "Order is not open" }, { status: 400 });
    if (order.extensionCount >= MAX_EXTENSIONS)
      return NextResponse.json({ error: "Đã đạt giới hạn gia hạn (3 lần)" }, { status: 400 });

    const base = order.countdownEnd && order.countdownEnd > new Date() ? order.countdownEnd : new Date();
    const newEnd = new Date(base.getTime() + EXTEND_MINUTES * 60 * 1000);
    const updated = await prisma.foodOrder.update({
      where: { id },
      data: { countdownEnd: newEnd, extensionCount: { increment: 1 } },
    });
    return NextResponse.json(updated);
  }

  // Allow updating restaurant name (after fetch-menu)
  if (body.restaurantName !== undefined) {
    const updated = await prisma.foodOrder.update({
      where: { id },
      data: { restaurantName: body.restaurantName },
    });
    return NextResponse.json(updated);
  }

  // Allow host to update shipping fee and/or discount (even after close, e.g. final bill tweaks)
  if (body.shippingFee !== undefined || body.discount !== undefined) {
    const data: { shippingFee?: number; discount?: number } = {};
    if (body.shippingFee !== undefined) {
      const v = Number(body.shippingFee);
      if (!Number.isFinite(v) || v < 0)
        return NextResponse.json({ error: "Invalid shippingFee" }, { status: 400 });
      data.shippingFee = Math.round(v);
    }
    if (body.discount !== undefined) {
      const v = Number(body.discount);
      if (!Number.isFinite(v) || v < 0)
        return NextResponse.json({ error: "Invalid discount" }, { status: 400 });
      data.discount = Math.round(v);
    }

    const updated = await prisma.foodOrder.update({ where: { id }, data });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const order = await prisma.foodOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.foodOrder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
