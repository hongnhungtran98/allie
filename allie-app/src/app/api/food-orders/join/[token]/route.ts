import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;

  const order = await prisma.foodOrder.findUnique({
    where: { shareToken: token },
    include: {
      creator: { select: { id: true, name: true } },
      menuItems: {
        where: { isAvailable: true },
        orderBy: [
          { categorySortOrder: "asc" },
          { category: "asc" },
          { itemSortOrder: "asc" },
          { name: "asc" },
        ],
      },
      selections: {
        where: { userId: session.user.id },
        include: { menuItem: true },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-close if countdown expired
  if (order.status === "open" && order.countdownEnd && order.countdownEnd <= new Date()) {
    await prisma.foodOrder.update({ where: { id: order.id }, data: { status: "closed" } });
    order.status = "closed";
  }

  return NextResponse.json(order);
}
