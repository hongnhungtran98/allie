"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import FoodOrderStatusBadge from "../../FoodOrderStatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface OptionChoice { label: string; price: number }
interface OptionGroup {
  group: string;
  choices: OptionChoice[];
  selectionType?: number;
  selectionRangeMax?: number;
  selectionRangeMin?: number;
}
interface MenuItem {
  id: string;
  name: string;
  imageUrl: string | null;
  originalPrice: number;
  discountedPrice: number | null;
  options: OptionGroup[];
  category: string | null;
}
interface MySelection {
  id: string;
  menuItemId: string | null;
  customName: string | null;
  quantity: number;
  selectedOptions: { group: string; choice: string; price: number }[];
  note: string | null;
  menuItem: MenuItem | null;
}
interface MemberSelection {
  id: string;
  userId: string;
  user: { id: string; name: string };
  menuItemId: string | null;
  customName: string | null;
  quantity: number;
  priceOverride: number | null;
  ordered: boolean;
  selectedOptions: { group: string; choice: string; price: number }[];
  note: string | null;
  menuItem: {
    id: string;
    name: string;
    originalPrice: number;
    discountedPrice: number | null;
  } | null;
}
interface Order {
  id: string;
  restaurantName: string;
  sourceUrl: string;
  orderType: string;
  menuImageUrls: string[];
  status: string;
  countdownEnd: string | null;
  paymentMode: string;
  shippingFee: number;
  discount: number;
  shareToken: string;
  extensionCount: number;
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

interface ManualCartItem {
  customName: string;
  quantity: number;
  note: string;
}

function groupByCategory(
  items: MenuItem[]
): { category: string | null; items: MenuItem[] }[] {
  const groups: { category: string | null; items: MenuItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.category === item.category) last.items.push(item);
    else groups.push({ category: item.category, items: [item] });
  }
  return groups;
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
  function pick(og: OptionGroup, choice: string, price: number) {
    const isMulti = og.selectionType === 1;
    if (isMulti) {
      const alreadySelected = selected.some((s) => s.group === og.group && s.choice === choice);
      if (alreadySelected) {
        onChange(selected.filter((s) => !(s.group === og.group && s.choice === choice)));
      } else {
        const groupCount = selected.filter((s) => s.group === og.group).length;
        if (og.selectionRangeMax && groupCount >= og.selectionRangeMax) return;
        onChange([...selected, { group: og.group, choice, price }]);
      }
    } else {
      const without = selected.filter((s) => s.group !== og.group);
      onChange([...without, { group: og.group, choice, price }]);
    }
  }

  return (
    <div className="space-y-2 mt-2">
      {options.map((og) => {
        const isMulti = og.selectionType === 1;
        const groupCount = selected.filter((s) => s.group === og.group).length;
        const atMax = isMulti && og.selectionRangeMax != null && groupCount >= og.selectionRangeMax;
        return (
          <div key={og.group}>
            <div className="flex items-baseline gap-1.5 mb-1">
              <p className="text-xs font-medium text-ink-soft">{og.group}</p>
              {isMulti && (
                <span className="text-[10px] text-ink-soft">
                  {og.selectionRangeMin != null && og.selectionRangeMin > 0
                    ? `chọn ${og.selectionRangeMin}${og.selectionRangeMax != null && og.selectionRangeMax !== og.selectionRangeMin ? `–${og.selectionRangeMax}` : ""}`
                    : og.selectionRangeMax != null
                    ? `tối đa ${og.selectionRangeMax}`
                    : ""}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {og.choices.map((c) => {
                const active = selected.some((s) => s.group === og.group && s.choice === c.label);
                const disabled = !active && atMax;
                return (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => pick(og, c.label, c.price)}
                    disabled={disabled}
                    className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                      active
                        ? "border-lavender-500 bg-lavender-50 text-lavender-700"
                        : disabled
                        ? "border-border text-ink-soft opacity-40 cursor-not-allowed"
                        : "border-border text-ink hover:bg-bg"
                    }`}
                  >
                    {c.label}{c.price > 0 && <span className="ml-1 text-ink-soft">+{c.price.toLocaleString("vi-VN")}₫</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
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
  const router = useRouter();

  const isManual = order.orderType === "manual";
  const MAX_ITEMS = 3;
  const MAX_EXTENSIONS = 3;
  const isCreator = currentUserId === order.creator.id;

  const [status, setStatus] = useState(order.status);
  const [countdownEnd, setCountdownEnd] = useState(order.countdownEnd);
  const [extensionCount, setExtensionCount] = useState(order.extensionCount ?? 0);
  const [extending, setExtending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showClose, setShowClose] = useState(false);

  const isOpen = status === "open";

  async function handleExtend() {
    setExtending(true);
    try {
      const res = await fetch(`/api/food-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extend" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCountdownEnd(updated.countdownEnd);
        setExtensionCount(updated.extensionCount);
        toast("success", "Đã gia hạn thêm 10 phút");
      } else {
        const err = await res.json().catch(() => ({}));
        toast("error", err.error ?? "Không thể gia hạn");
      }
    } finally {
      setExtending(false);
    }
  }

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
        router.refresh();
      } else {
        toast("error", "Failed to close session");
      }
    } finally {
      setClosing(false);
    }
  }

  // Cart state for link-mode
  const [cart, setCart] = useState<CartItem[]>(() =>
    order.mySelections
      .filter((s) => s.menuItemId)
      .map((s) => ({
        menuItemId: s.menuItemId!,
        quantity: s.quantity,
        selectedOptions: s.selectedOptions,
        note: s.note ?? "",
      }))
  );
  // Cart state for manual-mode
  const [manualCart, setManualCart] = useState<ManualCartItem[]>(() =>
    isManual && order.mySelections.length > 0
      ? order.mySelections.map((s) => ({
          customName: s.customName ?? "",
          quantity: s.quantity,
          note: s.note ?? "",
        }))
      : isManual
      ? [{ customName: "", quantity: 1, note: "" }]
      : []
  );

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(order.mySelections.length > 0);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [imgZoom, setImgZoom] = useState<number | null>(null);

  const [priceOverrideMap, setPriceOverrideMap] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(order.allSelections.map((s) => [s.id, s.priceOverride ?? null]))
  );
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  function startEditPrice(selId: string, currentPrice: number | null) {
    setEditingPrice(selId);
    setPriceDraft(String(currentPrice ?? ""));
  }

  async function savePrice(selId: string, quantity: number) {
    const value = Number(priceDraft);
    if (!Number.isFinite(value) || value < 0) {
      toast("error", "Nhập số không âm");
      return;
    }
    setSavingPrice(true);
    try {
      const res = await fetch(`/api/food-orders/${order.id}/selections/${selId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceOverride: Math.round(value) }),
      });
      if (res.ok) {
        setPriceOverrideMap((m) => ({ ...m, [selId]: Math.round(value) }));
        setEditingPrice(null);
        toast("success", "Đã cập nhật giá");
      } else {
        const err = await res.json().catch(() => ({}));
        toast("error", err.error ?? "Không cập nhật được");
      }
    } finally {
      setSavingPrice(false);
    }
  }

  async function resetPrice(selId: string) {
    setSavingPrice(true);
    try {
      const res = await fetch(`/api/food-orders/${order.id}/selections/${selId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceOverride: null }),
      });
      if (res.ok) {
        setPriceOverrideMap((m) => ({ ...m, [selId]: null }));
        setEditingPrice(null);
        toast("success", "Đã xóa giá");
      } else {
        toast("error", "Không xóa được");
      }
    } finally {
      setSavingPrice(false);
    }
  }

  function cartQty(menuItemId: string) {
    return cart.find((c) => c.menuItemId === menuItemId)?.quantity ?? 0;
  }

  function addToCart(item: MenuItem) {
    if (cart.length >= MAX_ITEMS) {
      toast("warning", `You can select at most ${MAX_ITEMS} items`);
      return;
    }
    if (cart.some((c) => c.menuItemId === item.id)) {
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

  function updateManual(idx: number, patch: Partial<ManualCartItem>) {
    setManualCart((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
    setSubmitted(false);
  }
  function addManualRow() {
    if (manualCart.length >= MAX_ITEMS) {
      toast("warning", `You can select at most ${MAX_ITEMS} items`);
      return;
    }
    setManualCart((prev) => [...prev, { customName: "", quantity: 1, note: "" }]);
    setSubmitted(false);
  }
  function removeManualRow(idx: number) {
    setManualCart((prev) => prev.filter((_, i) => i !== idx));
    setSubmitted(false);
  }

  async function handleSubmit() {
    if (isManual) {
      const items = manualCart
        .map((m) => ({ ...m, customName: m.customName.trim() }))
        .filter((m) => m.customName.length > 0);
      if (items.length === 0) {
        toast("warning", "Vui lòng nhập ít nhất 1 món");
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch(`/api/food-orders/join/${shareToken}/select`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selections: items.map((m) => ({
              customName: m.customName,
              quantity: Math.max(1, m.quantity || 1),
              note: m.note,
            })),
          }),
        });
        if (res.ok) {
          toast("success", "Đã gửi danh sách món!");
          setSubmitted(true);
        } else {
          const d = await res.json();
          toast("error", d.error || "Failed to submit");
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {order.restaurantName || "Food Order"}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <FoodOrderStatusBadge status={status} />
            {isOpen && countdownEnd && (
              <span className="text-sm text-ink-soft">
                Closes in <Countdown end={countdownEnd} />
                {extensionCount > 0 && (
                  <span className="ml-1 text-xs">
                    (đã gia hạn {extensionCount}/{MAX_EXTENSIONS})
                  </span>
                )}
              </span>
            )}
            <span className="text-sm text-ink-soft">
              Organized by <strong>{order.creator.name}</strong>
            </span>
            {!isManual && order.sourceUrl && (
              <a
                href={order.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-lavender-600 hover:underline"
              >
                View source ↗
              </a>
            )}
          </div>
        </div>
        {isCreator && isOpen && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleExtend}
              disabled={extending || extensionCount >= MAX_EXTENSIONS}
              title={extensionCount >= MAX_EXTENSIONS ? "Đã đạt giới hạn 3 lần" : "Thêm 10 phút"}
              className="px-3 py-1.5 text-sm font-medium text-lavender-600 border border-lavender-200 hover:bg-lavender-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {extending ? "..." : `+10 phút (${extensionCount}/${MAX_EXTENSIONS})`}
            </button>
            <button
              onClick={() => setShowClose(true)}
              className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-xl transition-colors"
            >
              Close Session
            </button>
          </div>
        )}
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

      {/* Manual: menu image */}
      {isManual && order.menuImageUrls.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-ink mb-2">Ảnh menu</h2>
          <div className="space-y-3">
            {order.menuImageUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`Menu ${i + 1}`}
                onClick={() => setImgZoom(i)}
                className="w-full max-h-[60vh] object-contain bg-bg border border-border rounded-xl cursor-zoom-in"
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-soft">Click ảnh để xem to. Gõ tên món vào bên dưới.</p>
        </div>
      )}

      {isManual && imgZoom !== null && order.menuImageUrls[imgZoom] && (
        <div
          onClick={() => setImgZoom(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={order.menuImageUrls[imgZoom]} alt="Menu fullsize" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: menu or manual form */}
        <div className="lg:col-span-7">
          {isManual ? (
            <>
              <h2 className="text-base font-semibold text-ink mb-3">
                Món bạn chọn (tối đa {MAX_ITEMS})
              </h2>
              <div className="space-y-3">
                {manualCart.map((m, idx) => (
                  <div key={idx} className="bg-surface border border-border rounded-xl p-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={m.customName}
                        onChange={(e) => updateManual(idx, { customName: e.target.value })}
                        disabled={!isOpen}
                        placeholder="Tên món (ví dụ: Phở bò)"
                        className="flex-1 px-3 py-2 text-sm border border-border rounded-xl bg-bg focus:outline-none focus:ring-2 focus:ring-lavender-500"
                      />
                      <input
                        type="number"
                        min={1}
                        value={m.quantity}
                        onChange={(e) => updateManual(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        disabled={!isOpen}
                        className="w-16 px-2 py-2 text-sm border border-border rounded-xl bg-bg text-center focus:outline-none focus:ring-2 focus:ring-lavender-500"
                      />
                      {isOpen && manualCart.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeManualRow(idx)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-ink-soft hover:bg-bg"
                          title="Remove"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={m.note}
                      onChange={(e) => updateManual(idx, { note: e.target.value })}
                      disabled={!isOpen}
                      placeholder="Ghi chú (không bắt buộc)"
                      className="w-full px-2 py-1.5 text-xs border border-border rounded-lg bg-bg focus:outline-none focus:ring-1 focus:ring-lavender-500"
                    />
                  </div>
                ))}
                {isOpen && manualCart.length < MAX_ITEMS && (
                  <button
                    type="button"
                    onClick={addManualRow}
                    className="w-full py-2 text-sm font-medium text-lavender-600 border border-dashed border-lavender-300 rounded-xl hover:bg-lavender-50"
                  >
                    + Thêm món
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-ink mb-3">
                Menu — select up to {MAX_ITEMS} items
              </h2>
              <div className="space-y-5">
                {groupByCategory(order.menuItems).map(({ category, items }) => (
                  <div key={category ?? "_uncategorized"} className="space-y-3">
                    {category && (
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft px-1">
                        {category}
                      </h3>
                    )}
                    {items.map((item) => {
                      const qty = cartQty(item.id);
                      const inCart = cart.find((c) => c.menuItemId === item.id);
                      const isExpanded = expandedItem === item.id;

                      return (
                        <div
                          key={`${category ?? ""}-${item.id}`}
                          id={`menu-item-${item.id}`}
                          className={`bg-surface border rounded-xl p-4 transition-colors scroll-mt-4 ${
                            qty > 0 ? "border-lavender-300" : "border-border"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            {item.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                loading="lazy"
                                className="w-14 h-14 rounded-lg object-cover shrink-0 bg-bg"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              />
                            )}
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
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: cart + members */}
        <div className="space-y-6 lg:col-span-5">
          <div>
            <h2 className="text-base font-semibold text-ink mb-3">Your Order</h2>
            <div className="bg-surface border border-border rounded-xl p-4">
              {isManual ? (
                manualCart.every((m) => !m.customName.trim()) ? (
                  <p className="text-sm text-ink-soft text-center py-4">Chưa nhập món nào</p>
                ) : (
                  <div className="space-y-2">
                    {manualCart
                      .filter((m) => m.customName.trim())
                      .map((m, idx) => (
                        <div key={idx} className="text-sm">
                          <div className="flex justify-between">
                            <span className="text-ink flex-1 min-w-0 truncate" title={m.customName}>
                              {m.customName}
                            </span>
                            <span className="text-ink-soft ml-2 shrink-0">×{m.quantity}</span>
                          </div>
                          {m.note && (
                            <p className="text-xs text-ink-soft mt-0.5 truncate italic" title={m.note}>
                              Note: {m.note}
                            </p>
                          )}
                        </div>
                      ))}
                    <p className="pt-2 border-t border-border text-xs text-ink-soft italic">
                      Giá sẽ do host nhập sau khi đóng đơn.
                    </p>
                  </div>
                )
              ) : cart.length === 0 ? (
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
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById(`menu-item-${item.id}`);
                              if (el) {
                                el.scrollIntoView({ behavior: "smooth", block: "start" });
                                el.classList.add("ring-2", "ring-lavender-400");
                                window.setTimeout(() => el.classList.remove("ring-2", "ring-lavender-400"), 1500);
                              }
                            }}
                            className="text-ink flex-1 min-w-0 truncate text-left hover:underline cursor-pointer"
                            title={item.name}
                          >
                            {item.name}
                          </button>
                          <span className="text-ink-soft ml-2 shrink-0">
                            ×{c.quantity} = {lineTotal.toLocaleString("vi-VN")}₫
                          </span>
                        </div>
                        {c.selectedOptions.length > 0 && (
                          <p
                            className="text-xs text-ink-soft mt-0.5 truncate"
                            title={c.selectedOptions.map((o) => o.choice).join(", ")}
                          >
                            {c.selectedOptions.map((o) => o.choice).join(", ")}
                          </p>
                        )}
                        {c.note && (
                          <p
                            className="text-xs text-ink-soft mt-0.5 truncate italic"
                            title={c.note}
                          >
                            Note: {c.note}
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
                  disabled={submitting}
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
                          const name = sel.menuItem?.name ?? sel.customName ?? "(chưa đặt tên)";
                          const override = priceOverrideMap[sel.id] ?? null;
                          let lineDisplay: string;
                          if (sel.menuItem) {
                            const basePrice = sel.menuItem.discountedPrice ?? sel.menuItem.originalPrice;
                            const addOns = sel.selectedOptions.reduce((a, o) => a + (o.price ?? 0), 0);
                            const unit = override ?? basePrice + addOns;
                            lineDisplay = `${(unit * sel.quantity).toLocaleString("vi-VN")}₫`;
                          } else {
                            lineDisplay = override != null
                              ? `${(override * sel.quantity).toLocaleString("vi-VN")}₫`
                              : "Chưa có giá";
                          }
                          const isEditingThis = editingPrice === sel.id;
                          const canEditPrice = isCreator && !isOpen;
                          return (
                            <div key={sel.id} className="flex items-start justify-between text-sm gap-2">
                              <div className="flex-1 min-w-0">
                                <span className="block break-words text-ink">
                                  {name}
                                  {sel.quantity > 1 && <span className="text-ink-soft"> ×{sel.quantity}</span>}
                                </span>
                                {sel.selectedOptions.length > 0 && (
                                  <div className="text-xs text-ink-soft">
                                    {sel.selectedOptions.map((o, i) => (
                                      <span key={i} className="block">+ {o.choice}</span>
                                    ))}
                                  </div>
                                )}
                                {sel.note && (
                                  <span className="text-xs text-ink-soft block break-words italic">
                                    Note: {sel.note}
                                  </span>
                                )}
                                {canEditPrice && !sel.menuItem && override == null && (
                                  <span className="text-[10px] text-red-500 block">Chưa nhập giá</span>
                                )}
                              </div>
                              {canEditPrice && isEditingThis ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <input
                                    type="number"
                                    min={0}
                                    autoFocus
                                    value={priceDraft}
                                    onChange={(e) => setPriceDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") savePrice(sel.id, sel.quantity);
                                      else if (e.key === "Escape") setEditingPrice(null);
                                    }}
                                    disabled={savingPrice}
                                    className="w-20 px-2 py-1 text-xs border border-border rounded-lg bg-bg text-ink focus:outline-none focus:border-lavender-400"
                                  />
                                  <button
                                    onClick={() => savePrice(sel.id, sel.quantity)}
                                    disabled={savingPrice}
                                    className="px-1.5 py-1 text-[10px] font-medium text-white bg-lavender-500 hover:bg-lavender-600 rounded-md disabled:opacity-50"
                                  >
                                    {savingPrice ? "..." : "Lưu"}
                                  </button>
                                  {override != null && (
                                    <button
                                      onClick={() => resetPrice(sel.id)}
                                      disabled={savingPrice}
                                      className="px-1.5 py-1 text-[10px] text-ink-soft hover:text-ink"
                                      title="Xóa giá"
                                    >
                                      ↺
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setEditingPrice(null)}
                                    disabled={savingPrice}
                                    className="px-1 py-1 text-[10px] text-ink-soft hover:text-ink"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => canEditPrice && startEditPrice(sel.id, override)}
                                    disabled={!canEditPrice}
                                    className={`${override == null && !sel.menuItem && !sel.ordered ? "text-red-400" : "text-ink-soft"} ${canEditPrice ? "hover:underline cursor-pointer" : "cursor-default"}`}
                                    title={canEditPrice ? "Click để nhập giá" : undefined}
                                  >
                                    {lineDisplay}
                                  </button>
                                  {sel.ordered && (
                                    <span
                                      title="Đã được host đặt"
                                      className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-100 text-green-600 text-[11px] font-bold shrink-0"
                                    >
                                      ✓
                                    </span>
                                  )}
                                </div>
                              )}
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

          {/* Aggregated list for host to send to restaurant */}
          {isManual && (() => {
            const agg: Record<string, number> = {};
            for (const sel of order.allSelections) {
              const name = (sel.menuItem?.name ?? sel.customName ?? "").trim();
              if (!name) continue;
              agg[name] = (agg[name] ?? 0) + sel.quantity;
            }
            const rows = Object.entries(agg).sort((a, b) => b[1] - a[1]);
            if (rows.length === 0) return null;
            const summaryText = rows.map(([name, qty]) => `${name} x${qty}`).join("\n");
            return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-ink">Tổng hợp món cần đặt</h2>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(summaryText);
                      toast("success", "Đã copy danh sách món");
                    }}
                    className="text-xs text-lavender-600 hover:underline"
                  >
                    Copy
                  </button>
                </div>
                <div className="bg-surface border border-border rounded-xl p-3">
                  <div className="space-y-1">
                    {rows.map(([name, qty]) => (
                      <div key={name} className="flex justify-between text-sm gap-2">
                        <span className="text-ink break-words flex-1 min-w-0">{name}</span>
                        <span className="text-ink-soft shrink-0">×{qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

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
