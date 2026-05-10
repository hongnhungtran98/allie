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
      selections: {
        include: {
          user: { select: { id: true, name: true } },
          menuItem: true,
        },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.creatorId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Group by user
  const byUser: Record<string, { userName: string; items: { name: string; price: number; quantity: number }[]; subtotal: number }> = {};
  for (const sel of order.selections) {
    const uid = sel.userId;
    const price = sel.menuItem.discountedPrice ?? sel.menuItem.originalPrice;
    if (!byUser[uid]) byUser[uid] = { userName: sel.user.name, items: [], subtotal: 0 };
    byUser[uid].items.push({ name: sel.menuItem.name, price, quantity: sel.quantity });
    byUser[uid].subtotal += price * sel.quantity;
  }

  const participants = Object.values(byUser);
  const grandTotal = participants.reduce((s, p) => s + p.subtotal, 0) + order.shippingFee - order.discount;

  if (order.paymentMode === "orderer_pays") {
    return NextResponse.json({ paymentMode: "orderer_pays", participants, grandTotal, shippingFee: order.shippingFee, discount: order.discount });
  }

  // Split mode — call external API if configured
  const splitApiUrl = process.env.BILL_SPLIT_API_URL;
  if (splitApiUrl) {
    try {
      const payload = {
        shippingFee: order.shippingFee,
        discount: order.discount,
        participants: participants.map((p) => ({
          name: p.userName,
          amount: p.subtotal,
        })),
      };
      const res = await fetch(splitApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const splitResult = await res.json();
        return NextResponse.json({ paymentMode: "split", participants, grandTotal, shippingFee: order.shippingFee, discount: order.discount, splitResult });
      }
    } catch {
      // Fall through to local calculation
    }
  }

  // Local split calculation: proportional by subtotal
  const totalItems = participants.reduce((s, p) => s + p.subtotal, 0) || 1;
  const splitResult = participants.map((p) => ({
    name: p.userName,
    amount: Math.round(p.subtotal + (p.subtotal / totalItems) * (order.shippingFee - order.discount)),
  }));

  return NextResponse.json({ paymentMode: "split", participants, grandTotal, shippingFee: order.shippingFee, discount: order.discount, splitResult });
}
