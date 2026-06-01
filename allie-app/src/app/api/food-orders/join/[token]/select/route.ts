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

  const body = await req.json() as {
    selections: {
      menuItemId?: string;
      customName?: string;
      quantity: number;
      selectedOptions?: unknown[];
      note?: string;
    }[];
  };
  const { selections } = body;

  if (!Array.isArray(selections) || selections.length === 0)
    return NextResponse.json({ error: "No selections provided" }, { status: 400 });

  if (selections.length > 3)
    return NextResponse.json({ error: "You can select at most 3 items" }, { status: 400 });

  let prepared: {
    orderId: string;
    userId: string;
    menuItemId: string | null;
    customName: string | null;
    quantity: number;
    selectedOptions: object;
    note: string | null;
  }[];

  if (order.orderType === "manual") {
    prepared = [];
    for (const sel of selections) {
      const name = sel.customName?.trim();
      if (!name)
        return NextResponse.json({ error: "Item name is required" }, { status: 400 });
      prepared.push({
        orderId: order.id,
        userId: session.user.id,
        menuItemId: null,
        customName: name,
        quantity: Math.max(1, sel.quantity || 1),
        selectedOptions: [],
        note: sel.note?.trim() || null,
      });
    }
  } else {
    const validIds = new Set(order.menuItems.map((m) => m.id));
    for (const sel of selections) {
      if (!sel.menuItemId || !validIds.has(sel.menuItemId))
        return NextResponse.json({ error: "Invalid menu item" }, { status: 400 });
    }
    prepared = selections.map((sel) => ({
      orderId: order.id,
      userId: session.user.id,
      menuItemId: sel.menuItemId!,
      customName: null,
      quantity: Math.max(1, sel.quantity || 1),
      selectedOptions: (sel.selectedOptions ?? []) as object,
      note: sel.note?.trim() || null,
    }));
  }

  await prisma.$transaction([
    prisma.foodOrderSelection.deleteMany({
      where: { orderId: order.id, userId: session.user.id },
    }),
    prisma.foodOrderSelection.createMany({ data: prepared }),
  ]);

  return NextResponse.json({ ok: true });
}
