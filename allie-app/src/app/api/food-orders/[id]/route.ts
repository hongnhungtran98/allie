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

  // Allow updating restaurant name (after fetch-menu)
  if (body.restaurantName !== undefined) {
    const updated = await prisma.foodOrder.update({
      where: { id },
      data: { restaurantName: body.restaurantName },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
