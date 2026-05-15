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
  if (typeof body.ordered !== "boolean")
    return NextResponse.json({ error: "Invalid ordered" }, { status: 400 });

  const selection = await prisma.foodOrderSelection.findUnique({ where: { id: selectionId } });
  if (!selection || selection.orderId !== id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.foodOrderSelection.update({
    where: { id: selectionId },
    data: { ordered: body.ordered },
  });
  return NextResponse.json(updated);
}
