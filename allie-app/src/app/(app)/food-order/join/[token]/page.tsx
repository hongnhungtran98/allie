import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import FoodOrderJoin from "./FoodOrderJoin";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const order = await prisma.foodOrder.findUnique({
    where: { shareToken: token },
    select: { restaurantName: true },
  });
  if (!order) return {};
  const title = `Đặt món ngay - ${order.restaurantName}`;
  const description = "Cùng tham gia đặt món dễ dàng với Allie • Click để join!";
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
  };
}

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
        include: {
          user: { select: { id: true, name: true } },
          menuItem: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) notFound();

  // Auto-close if countdown expired
  if (order.status === "open" && order.countdownEnd && order.countdownEnd <= new Date()) {
    await prisma.foodOrder.update({ where: { id: order.id }, data: { status: "closed" } });
    order.status = "closed";
  }

  // When closed, compute how much this member owes (matches docs/formular/Tính tiền Bill.xlsx).
  let myBill: { mySubtotal: number; myAmount: number; itemsSubtotal: number; grandTotal: number } | null = null;
  if (order.status === "closed") {
    const lineTotal = (s: (typeof order.selections)[number]) => {
      if (!s.menuItem) {
        return (s.priceOverride ?? 0) * s.quantity;
      }
      const base = s.menuItem.discountedPrice ?? s.menuItem.originalPrice;
      const opts = (s.selectedOptions as { price: number }[] | null) ?? [];
      const addOns = opts.reduce((a, o) => a + (o.price ?? 0), 0);
      const unit = s.priceOverride ?? base + addOns;
      return unit * s.quantity;
    };
    const itemsSubtotal = order.selections.reduce((sum, s) => sum + lineTotal(s), 0);
    const mySubtotal = order.selections
      .filter((s) => s.userId === userId)
      .reduce((sum, s) => sum + lineTotal(s), 0);
    const grandTotal = itemsSubtotal + order.shippingFee - order.discount;
    const myAmount =
      order.paymentMode === "split" && itemsSubtotal > 0
        ? Math.round((mySubtotal * grandTotal) / itemsSubtotal / 1000) * 1000
        : mySubtotal;
    myBill = { mySubtotal, myAmount, itemsSubtotal, grandTotal };
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
    mySelections: order.selections
      .filter((s) => s.userId === userId)
      .map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        menuItem: s.menuItem
          ? {
              ...s.menuItem,
              options: s.menuItem.options as { group: string; choices: { label: string; price: number }[] }[],
            }
          : null,
        selectedOptions: s.selectedOptions as { group: string; choice: string; price: number }[],
      })),
    allSelections: order.selections.map((s) => ({
      id: s.id,
      userId: s.userId,
      user: s.user,
      menuItemId: s.menuItemId,
      customName: s.customName,
      quantity: s.quantity,
      priceOverride: s.priceOverride,
      ordered: s.ordered,
      selectedOptions: s.selectedOptions as { group: string; choice: string; price: number }[],
      note: s.note,
      menuItem: s.menuItem
        ? {
            id: s.menuItem.id,
            name: s.menuItem.name,
            originalPrice: s.menuItem.originalPrice,
            discountedPrice: s.menuItem.discountedPrice,
          }
        : null,
    })),
  };

  return <FoodOrderJoin order={serialized} currentUserId={userId} shareToken={token} myBill={myBill} />;
}
