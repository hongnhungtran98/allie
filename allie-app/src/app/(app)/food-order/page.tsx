import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import FoodOrderStatusBadge from "./FoodOrderStatusBadge";
import DeleteOrderButton from "./DeleteOrderButton";

export default async function FoodOrderPage() {
  const session = await auth();
  const userId = session!.user.id;
  const isAdmin = session!.user.role === "ADMIN";

  const ordersWithTotal = await prisma.foodOrder.findMany({
    where: isAdmin ? undefined : { creatorId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { selections: true } },
    },
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
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-surface border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="text-left px-4 py-3 font-medium text-ink-soft">Restaurant</th>
                  <th className="text-left px-4 py-3 font-medium text-ink-soft">Created</th>
                  <th className="text-left px-4 py-3 font-medium text-ink-soft">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-ink-soft">Orders</th>
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

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {ordersWithTotal.map((o) => (
              <div key={o.id} className="bg-surface border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-ink text-sm">
                    {o.restaurantName || <span className="text-ink-soft italic">Fetching...</span>}
                  </p>
                  <FoodOrderStatusBadge status={o.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-ink-soft">
                  <span>{new Date(o.createdAt).toLocaleDateString("vi-VN")}</span>
                  <span>{o._count.selections} orders</span>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
                  <Link
                    href={`/food-order/${o.id}`}
                    className="text-lavender-600 hover:underline text-xs font-medium"
                  >
                    View →
                  </Link>
                  {isAdmin && <DeleteOrderButton orderId={o.id} />}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
