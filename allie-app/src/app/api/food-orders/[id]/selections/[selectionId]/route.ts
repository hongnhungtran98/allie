import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string; selectionId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, selectionId } = await params;
  const order = await prisma.foodOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.creatorId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const selection = await prisma.foodOrderSelection.findUnique({ where: { id: selectionId } });
  if (!selection || selection.orderId !== id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: { ordered?: boolean; priceOverride?: number | null } = {};

  if (body.ordered !== undefined) {
    if (typeof body.ordered !== "boolean")
      return NextResponse.json({ error: "Invalid ordered" }, { status: 400 });
    data.ordered = body.ordered;
  }

  if (body.priceOverride !== undefined) {
    if (body.priceOverride === null) {
      data.priceOverride = null;
    } else {
      const v = Number(body.priceOverride);
      if (!Number.isFinite(v) || v < 0)
        return NextResponse.json({ error: "Invalid priceOverride" }, { status: 400 });
      data.priceOverride = Math.round(v);
    }
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const updated = await prisma.foodOrderSelection.update({
    where: { id: selectionId },
    data,
  });
  return NextResponse.json(updated);
}
