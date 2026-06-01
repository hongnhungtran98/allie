import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import FoodOrderDetail from "./FoodOrderDetail";

type Props = { params: Promise<{ id: string }> };

export default async function FoodOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const order = await prisma.foodOrder.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      menuItems: { where: { isAvailable: true }, orderBy: { name: "asc" } },
      selections: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          menuItem: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) notFound();

  // Only creator can view detail page
  if (order.creatorId !== userId) redirect(`/food-order/join/${order.shareToken}`);

  // Auto-close if countdown expired
  if (order.status === "open" && order.countdownEnd && order.countdownEnd <= new Date()) {
    await prisma.foodOrder.update({ where: { id }, data: { status: "closed" } });
    order.status = "closed";
  }

  const serialized = {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    countdownEnd: order.countdownEnd?.toISOString() ?? null,
    menuItems: order.menuItems.map((m) => ({
      ...m,
      options: m.options as { group: string; choices: { label: string; price: number }[] }[],
    })),
    selections: order.selections.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      menuItem: s.menuItem
        ? {
            ...s.menuItem,
            options: s.menuItem!.options as { group: string; choices: { label: string; price: number }[] }[],
          }
        : null,
      selectedOptions: s.selectedOptions as { group: string; choice: string; price: number }[],
    })),
  };

  return <FoodOrderDetail order={serialized} currentUserId={userId} />;
}
