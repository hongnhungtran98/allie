import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ token: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;

  const order = await prisma.foodOrder.findUnique({
    where: { shareToken: token },
    include: { menuItems: true },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status === "closed")
    return NextResponse.json({ error: "This order session is closed" }, { status: 400 });

  const { selections } = await req.json() as {
    selections: { menuItemId: string; quantity: number; selectedOptions: unknown[]; note?: string }[];
  };

  if (!Array.isArray(selections) || selections.length === 0)
    return NextResponse.json({ error: "No selections provided" }, { status: 400 });

  if (selections.length > 3)
    return NextResponse.json({ error: "You can select at most 3 items" }, { status: 400 });

  // Validate all menu items belong to this order
  const validIds = new Set(order.menuItems.map((m) => m.id));
  for (const sel of selections) {
    if (!validIds.has(sel.menuItemId))
      return NextResponse.json({ error: "Invalid menu item" }, { status: 400 });
  }

  // Replace existing selections for this user in this order
  await prisma.$transaction([
    prisma.foodOrderSelection.deleteMany({
      where: { orderId: order.id, userId: session.user.id },
    }),
    prisma.foodOrderSelection.createMany({
      data: selections.map((sel) => ({
        orderId: order.id,
        userId: session.user.id,
        menuItemId: sel.menuItemId,
        quantity: Math.max(1, sel.quantity || 1),
        selectedOptions: (sel.selectedOptions ?? []) as object,
        note: sel.note?.trim() || null,
      })),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
