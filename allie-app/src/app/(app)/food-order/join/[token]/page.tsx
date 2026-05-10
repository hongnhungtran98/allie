import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import FoodOrderJoin from "./FoodOrderJoin";

type Props = { params: Promise<{ token: string }> };

export default async function FoodOrderJoinPage({ params }: Props) {
  const { token } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const order = await prisma.foodOrder.findUnique({
    where: { shareToken: token },
    include: {
      creator: { select: { id: true, name: true } },
      menuItems: { where: { isAvailable: true }, orderBy: { name: "asc" } },
      selections: {
        where: { userId },
        include: { menuItem: true },
      },
    },
  });

  if (!order) notFound();

  // Auto-close if countdown expired
  if (order.status === "open" && order.countdownEnd && order.countdownEnd <= new Date()) {
    await prisma.foodOrder.update({ where: { id: order.id }, data: { status: "closed" } });
    order.status = "closed";
  }

  // If creator visits join link, redirect them to detail page
  // (We'll keep them on join page too — it's fine)

  const serialized = {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    countdownEnd: order.countdownEnd?.toISOString() ?? null,
    menuItems: order.menuItems.map((m) => ({
      ...m,
      options: m.options as { group: string; choices: { label: string; price: number }[] }[],
    })),
    mySelections: order.selections.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      menuItem: {
        ...s.menuItem,
        options: s.menuItem.options as { group: string; choices: { label: string; price: number }[] }[],
      },
      selectedOptions: s.selectedOptions as { group: string; choice: string; price: number }[],
    })),
  };

  return <FoodOrderJoin order={serialized} currentUserId={userId} shareToken={token} />;
}
