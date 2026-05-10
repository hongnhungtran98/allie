"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FoodOrderStatusBadge from "../FoodOrderStatusBadge";

interface OptionChoice { label: string; price: number }
interface OptionGroup { group: string; choices: OptionChoice[] }
interface MenuItem {
  id: string;
  name: string;
  imageUrl: string | null;
  originalPrice: number;
  discountedPrice: number | null;
  options: OptionGroup[];
  isAvailable: boolean;
}
interface SelectionItem {
  id: string;
  userId: string;
  menuItemId: string;
  quantity: number;
  selectedOptions: { group: string; choice: string; price: number }[];
  note: string | null;
  user: { id: string; name: string };
  menuItem: MenuItem;
}
interface Order {
  id: string;
  restaurantName: string;
  sourceUrl: string;
  status: string;
  countdownEnd: string | null;
  paymentMode: string;
  shippingFee: number;
  discount: number;
  shareToken: string;
  createdAt: string;
  creator: { id: string; name: string };
  menuItems: MenuItem[];
  selections: SelectionItem[];
}

interface BillParticipant {
  userName: string;
  items: { name: string; price: number; quantity: number }[];
  subtotal: number;
}
interface BillResult {
  paymentMode: string;
  grandTotal: number;
  shippingFee: number;
  discount: number;
  participants: BillParticipant[];
  splitResult?: { name: string; amount: number }[];
}

function Countdown({ end }: { end: string }) {
  const calc = useCallback(() => {
    const diff = Math.max(0, Math.floor((new Date(end).getTime() - Date.now()) / 1000));
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return { m, s, done: diff === 0 };
  }, [end]);

  const [time, setTime] = useState(calc);

  useEffect(() => {
    if (time.done) return;
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc, time.done]);

  if (time.done) return <span className="text-red-500 font-medium">Time&apos;s up!</span>;
  return (
    <span className="font-mono text-amber-600 font-medium">
      {String(time.m).padStart(2, "0")}:{String(time.s).padStart(2, "0")}
    </span>
  );
}

export default function FoodOrderDetail({ order, currentUserId }: { order: Order; currentUserId: string }) {
  const toast = useToast();
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [showClose, setShowClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [bill, setBill] = useState<BillResult | null>(null);
  const [loadingBill, setLoadingBill] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/food-order/join/${order.shareToken}`
    : `/food-order/join/${order.shareToken}`;

  async function handleClose() {
    setClosing(true);
    try {
      const res = await fetch(`/api/food-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      if (res.ok) {
        setStatus("closed");
        setShowClose(false);
        toast("success", "Order session closed");
        await loadBill();
      } else {
        toast("error", "Failed to close session");
      }
    } finally {
      setClosing(false);
    }
  }

  const loadBill = useCallback(async () => {
    setLoadingBill(true);
    try {
      const res = await fetch(`/api/food-orders/${order.id}/bill`);
      if (res.ok) setBill(await res.json());
    } finally {
      setLoadingBill(false);
    }
  }, [order.id]);

  useEffect(() => {
    if (status === "closed") loadBill();
  }, [status, loadBill]);

  function copyShareLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Group selections by user
  const byUser: Record<string, { userName: string; items: SelectionItem[] }> = {};
  for (const sel of order.selections) {
    if (!byUser[sel.userId]) byUser[sel.userId] = { userName: sel.user.name, items: [] };
    byUser[sel.userId].items.push(sel);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/food-order" className="text-sm text-ink-soft hover:text-ink transition-colors">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-ink mt-2">
            {order.restaurantName || "Loading menu..."}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <FoodOrderStatusBadge status={status} />
            {status === "open" && order.countdownEnd && (
              <span className="text-sm text-ink-soft">
                Closes in <Countdown end={order.countdownEnd} />
              </span>
            )}
            <a
              href={order.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-lavender-600 hover:underline"
            >
              View source ↗
            </a>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {status === "open" && (
            <button
              onClick={() => setShowClose(true)}
              className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-xl transition-colors"
            >
              Close Session
            </button>
          )}
        </div>
      </div>

      {/* Share link */}
      {status === "open" && (
        <div className="bg-lavender-50 border border-lavender-200 rounded-2xl p-4">
          <p className="text-sm font-medium text-ink mb-2">Share link with your team</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 text-sm border border-border rounded-xl bg-surface text-ink-soft"
            />
            <button
              onClick={copyShareLink}
              className="px-3 py-2 text-sm font-medium text-white bg-lavender-500 hover:bg-lavender-600 rounded-xl transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Order details row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Payment", value: order.paymentMode === "orderer_pays" ? "Orderer pays" : "Split bill" },
          { label: "Shipping", value: order.shippingFee > 0 ? order.shippingFee.toLocaleString("vi-VN") + "₫" : "Free" },
          { label: "Discount", value: order.discount > 0 ? "-" + order.discount.toLocaleString("vi-VN") + "₫" : "None" },
        ].map((item) => (
          <div key={item.label} className="bg-surface border border-border rounded-xl p-3">
            <p className="text-xs text-ink-soft mb-1">{item.label}</p>
            <p className="text-sm font-medium text-ink">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Menu */}
        <div>
          <h2 className="text-base font-semibold text-ink mb-3">Menu ({order.menuItems.length} items)</h2>
          {order.menuItems.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-8 text-center text-ink-soft text-sm">
              Menu is being fetched...
            </div>
          ) : (
            <div className="space-y-2">
              {order.menuItems.map((item) => (
                <div key={item.id} className="bg-surface border border-border rounded-xl p-3 flex gap-3 items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.discountedPrice != null ? (
                        <>
                          <span className="text-sm font-semibold text-lavender-600">
                            {item.discountedPrice.toLocaleString("vi-VN")}₫
                          </span>
                          <span className="text-xs text-ink-soft line-through">
                            {item.originalPrice.toLocaleString("vi-VN")}₫
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-semibold text-ink">
                          {item.originalPrice.toLocaleString("vi-VN")}₫
                        </span>
                      )}
                    </div>
                    {item.options.length > 0 && (
                      <p className="text-xs text-ink-soft mt-1">
                        Options: {item.options.map((o) => o.group).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selections */}
        <div>
          <h2 className="text-base font-semibold text-ink mb-3">
            Selections ({Object.keys(byUser).length} people)
          </h2>
          {Object.keys(byUser).length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-8 text-center text-ink-soft text-sm">
              No selections yet
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(byUser).map(([uid, { userName, items }]) => (
                <div key={uid} className="bg-surface border border-border rounded-xl p-3">
                  <p className="text-sm font-semibold text-ink mb-2">{userName}</p>
                  <div className="space-y-1">
                    {items.map((sel) => {
                      const price = sel.menuItem.discountedPrice ?? sel.menuItem.originalPrice;
                      return (
                        <div key={sel.id} className="flex items-center justify-between text-sm">
                          <span className="text-ink flex-1 min-w-0 truncate">
                            {sel.menuItem.name}
                            {sel.quantity > 1 && <span className="text-ink-soft"> ×{sel.quantity}</span>}
                          </span>
                          <span className="text-ink-soft ml-2 shrink-0">
                            {(price * sel.quantity).toLocaleString("vi-VN")}₫
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bill summary */}
      {status === "closed" && (
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h2 className="text-base font-semibold text-ink mb-4">Bill Summary</h2>
          {loadingBill ? (
            <p className="text-sm text-ink-soft">Calculating...</p>
          ) : bill ? (
            <div className="space-y-4">
              {bill.paymentMode === "split" && bill.splitResult ? (
                <>
                  <p className="text-sm font-medium text-ink-soft">Each person pays:</p>
                  <div className="space-y-2">
                    {bill.splitResult.map((p) => (
                      <div key={p.name} className="flex justify-between text-sm">
                        <span className="text-ink font-medium">{p.name}</span>
                        <span className="text-ink font-semibold">{p.amount.toLocaleString("vi-VN")}₫</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  {bill.participants.map((p) => (
                    <div key={p.userName} className="flex justify-between text-sm">
                      <span className="text-ink">{p.userName}</span>
                      <span className="text-ink-soft">{p.subtotal.toLocaleString("vi-VN")}₫</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between text-sm text-ink-soft">
                  <span>Subtotal</span>
                  <span>{(bill.grandTotal - bill.shippingFee + bill.discount).toLocaleString("vi-VN")}₫</span>
                </div>
                {bill.shippingFee > 0 && (
                  <div className="flex justify-between text-sm text-ink-soft">
                    <span>Shipping</span>
                    <span>+{bill.shippingFee.toLocaleString("vi-VN")}₫</span>
                  </div>
                )}
                {bill.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{bill.discount.toLocaleString("vi-VN")}₫</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-ink mt-2">
                  <span>Total</span>
                  <span>{bill.grandTotal.toLocaleString("vi-VN")}₫</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={loadBill}
              className="text-sm text-lavender-600 hover:underline"
            >
              Load bill summary
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showClose}
        title="Close Order Session"
        message="Are you sure you want to close this order session? No more selections can be made after closing."
        confirmLabel={closing ? "Closing..." : "Close Session"}
        onConfirm={handleClose}
        onCancel={() => setShowClose(false)}
        loading={closing}
      />
    </div>
  );
}
