import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import FoodOrderStatusBadge from "./FoodOrderStatusBadge";
import DeleteOrderButton from "./DeleteOrderButton";

export default async function FoodOrderPage() {
  const session = await auth();
  const userId = session!.user.id;
  const isAdmin = session!.user.role === "ADMIN";

  const orders = await prisma.foodOrder.findMany({
    where: isAdmin ? undefined : { creatorId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { selections: true } },
      selections: {
        include: { menuItem: true },
      },
    },
  });

  // Calculate total per order
  const ordersWithTotal = orders.map((o) => {
    const itemTotal = o.selections.reduce((sum, s) => {
      if (!s.menuItem) {
        return sum + (s.priceOverride ?? 0) * s.quantity;
      }
      const basePrice = s.menuItem.discountedPrice ?? s.menuItem.originalPrice;
      const options = (s.selectedOptions as { price: number }[] | null) ?? [];
      const addOns = options.reduce((a, opt) => a + (opt.price ?? 0), 0);
      const unit = s.priceOverride ?? basePrice + addOns;
      return sum + unit * s.quantity;
    }, 0);
    const grandTotal = itemTotal + o.shippingFee - o.discount;
    return { ...o, grandTotal };
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">🍱 Food Order</h1>
          <p className="text-sm text-ink-soft mt-1">Group food ordering for your team</p>
        </div>
        <Link
          href="/food-order/new"
          className="px-4 py-2 bg-lavender-500 text-white text-sm font-medium rounded-xl hover:bg-lavender-600 transition-colors"
        >
          + New Order
        </Link>
      </div>

      {ordersWithTotal.length === 0 ? (
        <div className="text-center py-20 text-ink-soft">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="font-medium">No food orders yet.</p>
          <p className="text-sm mt-1">
            Click <strong>+ New Order</strong> to get started.
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg">
                <th className="text-left px-4 py-3 font-medium text-ink-soft">Restaurant</th>
                <th className="text-left px-4 py-3 font-medium text-ink-soft">Created</th>
                <th className="text-left px-4 py-3 font-medium text-ink-soft">Status</th>
                <th className="text-right px-4 py-3 font-medium text-ink-soft">Orders</th>
                <th className="text-right px-4 py-3 font-medium text-ink-soft">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {ordersWithTotal.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-bg transition-colors">
                  <td className="px-4 py-3 font-medium text-ink">
                    {o.restaurantName || <span className="text-ink-soft italic">Fetching...</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">
                    <FoodOrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-ink-soft">
                    {o._count.selections}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-ink">
                    {o.grandTotal > 0 ? o.grandTotal.toLocaleString("vi-VN") + "₫" : "—"}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/food-order/${o.id}`}
                      className="text-lavender-600 hover:underline text-xs font-medium"
                    >
                      View →
                    </Link>
                    {isAdmin && <DeleteOrderButton orderId={o.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
