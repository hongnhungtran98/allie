"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import FoodOrderStatusBadge from "../../FoodOrderStatusBadge";

interface OptionChoice { label: string; price: number }
interface OptionGroup { group: string; choices: OptionChoice[] }
interface MenuItem {
  id: string;
  name: string;
  imageUrl: string | null;
  originalPrice: number;
  discountedPrice: number | null;
  options: OptionGroup[];
}
interface MySelection {
  id: string;
  menuItemId: string;
  quantity: number;
  selectedOptions: { group: string; choice: string; price: number }[];
  note: string | null;
  menuItem: MenuItem;
}
interface MemberSelection {
  id: string;
  userId: string;
  user: { id: string; name: string };
  menuItemId: string;
  quantity: number;
  selectedOptions: { group: string; choice: string; price: number }[];
  note: string | null;
  menuItem: {
    id: string;
    name: string;
    originalPrice: number;
    discountedPrice: number | null;
  };
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
  creator: { id: string; name: string };
  menuItems: MenuItem[];
  mySelections: MySelection[];
  allSelections: MemberSelection[];
}

interface CartItem {
  menuItemId: string;
  quantity: number;
  selectedOptions: { group: string; choice: string; price: number }[];
  note: string;
}

function Countdown({ end }: { end: string }) {
  const calc = useCallback(() => {
    const diff = Math.max(0, Math.floor((new Date(end).getTime() - Date.now()) / 1000));
    return { m: Math.floor(diff / 60), s: diff % 60, done: diff === 0 };
  }, [end]);

  const [time, setTime] = useState<{ m: number; s: number; done: boolean } | null>(null);

  useEffect(() => {
    setTime(calc());
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);

  if (!time) return <span className="font-mono text-amber-600 font-medium">--:--</span>;
  if (time.done) return <span className="text-red-500 font-medium">Time&apos;s up!</span>;
  return (
    <span className="font-mono text-amber-600 font-medium">
      {String(time.m).padStart(2, "0")}:{String(time.s).padStart(2, "0")}
    </span>
  );
}

function OptionSelector({
  options,
  selected,
  onChange,
}: {
  options: OptionGroup[];
  selected: { group: string; choice: string; price: number }[];
  onChange: (sel: { group: string; choice: string; price: number }[]) => void;
}) {
  function pick(group: string, choice: string, price: number) {
    const without = selected.filter((s) => s.group !== group);
    onChange([...without, { group, choice, price }]);
  }

  return (
    <div className="space-y-2 mt-2">
      {options.map((og) => (
        <div key={og.group}>
          <p className="text-xs font-medium text-ink-soft mb-1">{og.group}</p>
          <div className="flex flex-wrap gap-1.5">
            {og.choices.map((c) => {
              const active = selected.some((s) => s.group === og.group && s.choice === c.label);
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => pick(og.group, c.label, c.price)}
                  className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                    active
                      ? "border-lavender-500 bg-lavender-50 text-lavender-700"
                      : "border-border text-ink hover:bg-bg"
                  }`}
                >
                  {c.label}{c.price > 0 && <span className="ml-1 text-ink-soft">+{c.price.toLocaleString("vi-VN")}₫</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

interface MyBill {
  mySubtotal: number;
  myAmount: number;
  itemsSubtotal: number;
  grandTotal: number;
}

export default function FoodOrderJoin({
  order,
  currentUserId,
  shareToken,
  myBill,
}: {
  order: Order;
  currentUserId: string;
  shareToken: string;
  myBill: MyBill | null;
}) {
  const toast = useToast();

  // Initialize cart from existing selections
  const [cart, setCart] = useState<CartItem[]>(() =>
    order.mySelections.map((s) => ({
      menuItemId: s.menuItemId,
      quantity: s.quantity,
      selectedOptions: s.selectedOptions,
      note: s.note ?? "",
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(order.mySelections.length > 0);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const MAX_ITEMS = 3;
  const isOpen = order.status === "open";

  function cartQty(menuItemId: string) {
    return cart.find((c) => c.menuItemId === menuItemId)?.quantity ?? 0;
  }

  function addToCart(item: MenuItem) {
    if (cart.length >= MAX_ITEMS) {
      toast("warning", `You can select at most ${MAX_ITEMS} items`);
      return;
    }
    if (cart.some((c) => c.menuItemId === item.id)) {
      // increment
      setCart((prev) =>
        prev.map((c) => (c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c))
      );
    } else {
      setCart((prev) => [
        ...prev,
        { menuItemId: item.id, quantity: 1, selectedOptions: [], note: "" },
      ]);
      if (item.options.length > 0) setExpandedItem(item.id);
    }
    setSubmitted(false);
  }

  function removeFromCart(menuItemId: string) {
    setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId));
    setSubmitted(false);
  }

  function updateOptions(menuItemId: string, opts: { group: string; choice: string; price: number }[]) {
    setCart((prev) =>
      prev.map((c) => (c.menuItemId === menuItemId ? { ...c, selectedOptions: opts } : c))
    );
    setSubmitted(false);
  }

  function updateNote(menuItemId: string, note: string) {
    setCart((prev) =>
      prev.map((c) => (c.menuItemId === menuItemId ? { ...c, note } : c))
    );
    setSubmitted(false);
  }

  async function handleSubmit() {
    if (cart.length === 0) {
      toast("warning", "Please select at least one item");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/food-orders/join/${shareToken}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections: cart.map((c) => ({ ...c, quantity: c.quantity })) }),
      });
      if (res.ok) {
        toast("success", "Your order has been submitted!");
        setSubmitted(true);
      } else {
        const d = await res.json();
        toast("error", d.error || "Failed to submit");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const cartTotal = cart.reduce((sum, c) => {
    const item = order.menuItems.find((m) => m.id === c.menuItemId);
    if (!item) return sum;
    const base = item.discountedPrice ?? item.originalPrice;
    const optExtra = c.selectedOptions.reduce((s, o) => s + o.price, 0);
    return sum + (base + optExtra) * c.quantity;
  }, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">
          {order.restaurantName || "Food Order"}
        </h1>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          <FoodOrderStatusBadge status={order.status} />
          {isOpen && order.countdownEnd && (
            <span className="text-sm text-ink-soft">
              Closes in <Countdown end={order.countdownEnd} />
            </span>
          )}
          <span className="text-sm text-ink-soft">
            Organized by <strong>{order.creator.name}</strong>
          </span>
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

      {!isOpen && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-600">
          This order session is closed. You can no longer make selections.
        </div>
      )}

      {!isOpen && myBill && (
        <div className="bg-lavender-50 border border-lavender-200 rounded-2xl p-5">
          <p className="text-sm font-medium text-ink-soft">You need to pay</p>
          <p className="text-3xl font-bold text-lavender-700 mt-1">
            {myBill.myAmount.toLocaleString("vi-VN")}₫
          </p>
        </div>
      )}

      {submitted && isOpen && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-700">
          ✓ Your selections have been submitted. You can update them until the session closes.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold text-ink mb-3">
            Menu — select up to {MAX_ITEMS} items
          </h2>
          <div className="space-y-3">
            {order.menuItems.map((item) => {
              const qty = cartQty(item.id);
              const inCart = cart.find((c) => c.menuItemId === item.id);
              const isExpanded = expandedItem === item.id;

              return (
                <div
                  key={item.id}
                  className={`bg-surface border rounded-xl p-4 transition-colors ${
                    qty > 0 ? "border-lavender-300" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
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
                    </div>

                    {isOpen && (
                      <div className="flex items-center gap-2 shrink-0">
                        {qty > 0 && (
                          <>
                            <button
                              onClick={() => {
                                if (qty <= 1) removeFromCart(item.id);
                                else setCart((p) => p.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity - 1 } : c));
                                setSubmitted(false);
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-bg text-ink font-bold"
                            >
                              −
                            </button>
                            <span className="text-sm font-medium w-4 text-center">{qty}</span>
                          </>
                        )}
                        <button
                          onClick={() => addToCart(item)}
                          disabled={cart.length >= MAX_ITEMS && qty === 0}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-lavender-500 text-white hover:bg-lavender-600 disabled:opacity-40 font-bold"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Options & note (if in cart) */}
                  {inCart && item.options.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                        className="mt-2 text-xs text-lavender-600 hover:underline"
                      >
                        {isExpanded ? "Hide options ▲" : "Customize ▼"}
                      </button>
                      {isExpanded && (
                        <OptionSelector
                          options={item.options}
                          selected={inCart.selectedOptions}
                          onChange={(opts) => updateOptions(item.id, opts)}
                        />
                      )}
                    </div>
                  )}
                  {inCart && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={inCart.note}
                        onChange={(e) => updateNote(item.id, e.target.value)}
                        placeholder="Note (e.g. no spice)..."
                        className="w-full px-2 py-1 text-xs border border-border rounded-lg bg-bg focus:outline-none focus:ring-1 focus:ring-lavender-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cart + Members' submissions */}
        <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-ink mb-3">Your Order</h2>
          <div className="bg-surface border border-border rounded-xl p-4">
            {cart.length === 0 ? (
              <p className="text-sm text-ink-soft text-center py-4">No items selected</p>
            ) : (
              <div className="space-y-2">
                {cart.map((c) => {
                  const item = order.menuItems.find((m) => m.id === c.menuItemId);
                  if (!item) return null;
                  const base = item.discountedPrice ?? item.originalPrice;
                  const optExtra = c.selectedOptions.reduce((s, o) => s + o.price, 0);
                  const lineTotal = (base + optExtra) * c.quantity;
                  return (
                    <div key={c.menuItemId} className="text-sm">
                      <div className="flex justify-between">
                        <span className="text-ink flex-1 min-w-0 truncate">{item.name}</span>
                        <span className="text-ink-soft ml-2 shrink-0">
                          ×{c.quantity} = {lineTotal.toLocaleString("vi-VN")}₫
                        </span>
                      </div>
                      {c.selectedOptions.length > 0 && (
                        <p className="text-xs text-ink-soft mt-0.5">
                          {c.selectedOptions.map((o) => o.choice).join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border flex justify-between text-sm font-semibold text-ink">
                  <span>Subtotal</span>
                  <span>{cartTotal.toLocaleString("vi-VN")}₫</span>
                </div>
              </div>
            )}

            {isOpen && (
              <button
                onClick={handleSubmit}
                disabled={submitting || cart.length === 0}
                className="mt-4 w-full py-2 text-sm font-medium text-white bg-lavender-500 hover:bg-lavender-600 disabled:opacity-50 rounded-xl transition-colors"
              >
                {submitting ? "Submitting..." : submitted ? "Update Order" : "Submit Order"}
              </button>
            )}
          </div>
        </div>

      {/* Other members' submissions */}
      {(() => {
        const byUser: Record<string, { userName: string; isMe: boolean; items: MemberSelection[] }> = {};
        for (const sel of order.allSelections) {
          if (!byUser[sel.userId]) {
            byUser[sel.userId] = {
              userName: sel.user.name,
              isMe: sel.userId === currentUserId,
              items: [],
            };
          }
          byUser[sel.userId].items.push(sel);
        }
        const groups = Object.entries(byUser);
        if (groups.length === 0) return null;
        return (
          <div>
            <h2 className="text-base font-semibold text-ink mb-3">
              Members&apos; submissions ({groups.length} {groups.length === 1 ? "person" : "people"})
            </h2>
            <div className="space-y-3">
              {groups.map(([uid, { userName, isMe, items }]) => (
                <div key={uid} className="bg-surface border border-border rounded-xl p-3">
                  <p className="text-sm font-semibold text-ink mb-2">
                    {userName}
                    {isMe && <span className="ml-2 text-xs font-normal text-lavender-600">(you)</span>}
                  </p>
                  <div className="space-y-1">
                    {items.map((sel) => {
                      const basePrice = sel.menuItem.discountedPrice ?? sel.menuItem.originalPrice;
                      const addOns = sel.selectedOptions.reduce((a, o) => a + (o.price ?? 0), 0);
                      const lineTotal = (basePrice + addOns) * sel.quantity;
                      return (
                        <div key={sel.id} className="flex items-start justify-between text-sm gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-ink truncate block">
                              {sel.menuItem.name}
                              {sel.quantity > 1 && <span className="text-ink-soft"> ×{sel.quantity}</span>}
                            </span>
                            {sel.selectedOptions.length > 0 && (
                              <span className="text-xs text-ink-soft block truncate">
                                + {sel.selectedOptions.map((o) => o.choice).join(", ")}
                              </span>
                            )}
                            {sel.note && (
                              <span className="text-xs text-ink-soft block truncate italic">
                                Note: {sel.note}
                              </span>
                            )}
                          </div>
                          <span className="text-ink-soft shrink-0">
                            {lineTotal.toLocaleString("vi-VN")}₫
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
        </div>
      </div>
    </div>
  );
}
