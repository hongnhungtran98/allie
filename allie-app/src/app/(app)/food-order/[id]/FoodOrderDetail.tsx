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
  category: string | null;
}
interface SelectionItem {
  id: string;
  userId: string;
  menuItemId: string | null;
  customName: string | null;
  quantity: number;
  selectedOptions: { group: string; choice: string; price: number }[];
  note: string | null;
  ordered: boolean;
  priceOverride: number | null;
  user: { id: string; name: string; email: string };
  menuItem: MenuItem | null;
}
interface Order {
  id: string;
  restaurantName: string;
  sourceUrl: string;
  orderType: string;
  menuImageUrl: string | null;
  status: string;
  countdownEnd: string | null;
  paymentMode: string;
  shippingFee: number;
  discount: number;
  shareToken: string;
  extensionCount: number;
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
  const [exported, setExported] = useState(false);
  const [orderedMap, setOrderedMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(order.selections.map((s) => [s.id, s.ordered ?? false])),
  );
  const [pendingOrdered, setPendingOrdered] = useState<Record<string, boolean>>({});
  const [priceOverrideMap, setPriceOverrideMap] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(order.selections.map((s) => [s.id, s.priceOverride ?? null])),
  );
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  const isOrderer = order.creator.id === currentUserId;

  const [refetchingMenu, setRefetchingMenu] = useState(false);
  async function refetchMenu() {
    if (refetchingMenu) return;
    const ok = window.confirm(
      "Tải lại menu sẽ xóa các món hiện có. Các lựa chọn đã đặt cũng sẽ bị xóa theo. Tiếp tục?"
    );
    if (!ok) return;
    setRefetchingMenu(true);
    try {
      const res = await fetch(`/api/food-orders/${order.id}/fetch-menu?force=true`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast("error", data.error ?? "Failed to refetch menu");
        return;
      }
      toast("success", `Menu refreshed: ${data.itemCount ?? 0} items`);
      router.refresh();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to refetch menu");
    } finally {
      setRefetchingMenu(false);
    }
  }

  async function toggleOrdered(selectionId: string) {
    const next = !orderedMap[selectionId];
    setOrderedMap((m) => ({ ...m, [selectionId]: next }));
    setPendingOrdered((p) => ({ ...p, [selectionId]: true }));
    try {
      const res = await fetch(`/api/food-orders/${order.id}/selections/${selectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordered: next }),
      });
      if (!res.ok) {
        setOrderedMap((m) => ({ ...m, [selectionId]: !next }));
        toast("error", "Không cập nhật được trạng thái");
      }
    } catch {
      setOrderedMap((m) => ({ ...m, [selectionId]: !next }));
      toast("error", "Không cập nhật được trạng thái");
    } finally {
      setPendingOrdered((p) => {
        const rest = { ...p };
        delete rest[selectionId];
        return rest;
      });
    }
  }
  function defaultUnitPrice(sel: SelectionItem) {
    if (!sel.menuItem) return 0;
    const base = sel.menuItem.discountedPrice ?? sel.menuItem.originalPrice;
    const addOns = sel.selectedOptions.reduce((a, o) => a + (o.price ?? 0), 0);
    return base + addOns;
  }

  function selectionName(sel: SelectionItem) {
    return sel.menuItem?.name ?? sel.customName ?? "(chưa đặt tên)";
  }

  const isManual = order.orderType === "manual";

  function startEditPrice(sel: SelectionItem) {
    const current = priceOverrideMap[sel.id] ?? defaultUnitPrice(sel);
    setEditingPrice(sel.id);
    setPriceDraft(String(current));
  }

  async function savePrice(sel: SelectionItem) {
    const value = Number(priceDraft);
    if (!Number.isFinite(value) || value < 0) {
      toast("error", "Enter a non-negative number");
      return;
    }
    setSavingPrice(true);
    try {
      const res = await fetch(`/api/food-orders/${order.id}/selections/${sel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceOverride: Math.round(value) }),
      });
      if (res.ok) {
        setPriceOverrideMap((m) => ({ ...m, [sel.id]: Math.round(value) }));
        setEditingPrice(null);
        toast("success", "Updated");
        if (status === "closed") loadBill();
      } else {
        const err = await res.json().catch(() => ({}));
        toast("error", err.error ?? "Failed to update");
      }
    } finally {
      setSavingPrice(false);
    }
  }

  async function resetPrice(sel: SelectionItem) {
    setSavingPrice(true);
    try {
      const res = await fetch(`/api/food-orders/${order.id}/selections/${sel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceOverride: null }),
      });
      if (res.ok) {
        setPriceOverrideMap((m) => ({ ...m, [sel.id]: null }));
        setEditingPrice(null);
        toast("success", "Reset to menu price");
        if (status === "closed") loadBill();
      } else {
        toast("error", "Failed to reset");
      }
    } finally {
      setSavingPrice(false);
    }
  }

  const [notifying, setNotifying] = useState(false);

  async function handleNotify() {
    setNotifying(true);
    try {
      const res = await fetch(`/api/food-orders/${order.id}/notify`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && data.error === "no_webhook") {
        toast("error", data.message ?? "Chưa cấu hình Webhook. Vào Integrations để cài đặt.");
      } else if (res.ok) {
        toast("success", "Đã gửi thông báo");
      } else {
        toast("error", data.error ?? "Gửi thất bại");
      }
    } catch {
      toast("error", "Gửi thất bại");
    } finally {
      setNotifying(false);
    }
  }

  const [menuExpanded, setMenuExpanded] = useState(false);
  const [countdownEnd, setCountdownEnd] = useState(order.countdownEnd);
  const [extensionCount, setExtensionCount] = useState(order.extensionCount ?? 0);
  const [extending, setExtending] = useState(false);
  const [shippingFee, setShippingFee] = useState(order.shippingFee);
  const [discount, setDiscount] = useState(order.discount);
  const [editingFee, setEditingFee] = useState<"shipping" | "discount" | null>(null);
  const [feeDraft, setFeeDraft] = useState("");
  const [savingFee, setSavingFee] = useState(false);

  const canEditFees = order.creator.id === currentUserId;

  function startEdit(kind: "shipping" | "discount") {
    setEditingFee(kind);
    setFeeDraft(String(kind === "shipping" ? shippingFee : discount));
  }

  async function saveFee() {
    if (!editingFee) return;
    const value = Number(feeDraft);
    if (!Number.isFinite(value) || value < 0) {
      toast("error", "Enter a non-negative number");
      return;
    }
    setSavingFee(true);
    try {
      const body = editingFee === "shipping" ? { shippingFee: value } : { discount: value };
      const res = await fetch(`/api/food-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        if (editingFee === "shipping") setShippingFee(Math.round(value));
        else setDiscount(Math.round(value));
        setEditingFee(null);
        toast("success", "Updated");
        if (status === "closed") loadBill();
      } else {
        const err = await res.json().catch(() => ({}));
        toast("error", err.error ?? "Failed to update");
      }
    } finally {
      setSavingFee(false);
    }
  }

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/food-order/join/${order.shareToken}`
    : `/food-order/join/${order.shareToken}`;

  const MAX_EXTENSIONS = 3;

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

  function exportBillData() {
    const items: [string, number, string][] = [];
    for (const sel of order.selections) {
      const unitPrice = priceOverrideMap[sel.id] ?? defaultUnitPrice(sel);
      for (let i = 0; i < sel.quantity; i++) {
        items.push([sel.user.email, unitPrice, selectionName(sel)]);
      }
    }
    const data = {
      bill_name: order.restaurantName,
      bill_link: order.sourceUrl,
      bill_ship: shippingFee,
      bill_discount: discount,
      items,
    };
    const json = JSON.stringify(data);
    navigator.clipboard.writeText(json).then(
      () => {
        setExported(true);
        toast("success", "Bill data copied to clipboard");
        setTimeout(() => setExported(false), 2000);
      },
      () => toast("error", "Failed to copy"),
    );
  }

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

  // Live bill calculation (mirrors docs/formular/Tính tiền Bill.xlsx).
  // Per-person item subtotal includes base price + selectedOptions add-ons.
  const userSubtotals = Object.entries(byUser).map(([uid, { userName, items }]) => {
    const subtotal = items.reduce((sum, sel) => {
      const unit = priceOverrideMap[sel.id] ?? defaultUnitPrice(sel);
      return sum + unit * sel.quantity;
    }, 0);
    return { uid, userName, subtotal };
  });
  const itemsSubtotal = userSubtotals.reduce((s, p) => s + p.subtotal, 0);
  const grandTotal = itemsSubtotal + shippingFee - discount;
  // Excel: ROUND( subtotal_person * grandTotal / itemsSubtotal , -3 )
  const splitPerPerson = userSubtotals.map((p) => ({
    ...p,
    amount: itemsSubtotal > 0
      ? Math.round((p.subtotal * grandTotal) / itemsSubtotal / 1000) * 1000
      : 0,
  }));

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
            {status === "open" && countdownEnd && (
              <span className="text-sm text-ink-soft">
                Closes in <Countdown end={countdownEnd} />
                {extensionCount > 0 && (
                  <span className="ml-1 text-xs">
                    (đã gia hạn {extensionCount}/{MAX_EXTENSIONS})
                  </span>
                )}
              </span>
            )}
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
        <div className="flex gap-2 shrink-0">
          {status === "open" && order.creator.id === currentUserId && (
            <button
              onClick={handleExtend}
              disabled={extending || extensionCount >= MAX_EXTENSIONS}
              title={extensionCount >= MAX_EXTENSIONS ? "Đã đạt giới hạn 3 lần" : "Thêm 10 phút"}
              className="px-3 py-1.5 text-sm font-medium text-lavender-600 border border-lavender-200 hover:bg-lavender-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {extending
                ? "..."
                : `+10 phút (${extensionCount}/${MAX_EXTENSIONS})`}
            </button>
          )}
          {status === "open" && (
            <button
              onClick={() => setShowClose(true)}
              className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-xl transition-colors"
            >
              Close Session
            </button>
          )}
          {status === "closed" && isOrderer && (
            <button
              onClick={handleNotify}
              disabled={notifying}
              className="px-3 py-1.5 text-sm font-medium text-white bg-lavender-500 hover:bg-lavender-600 rounded-xl transition-colors disabled:opacity-50"
            >
              {notifying ? "Đang gửi..." : "Đã có món 🔔"}
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
        <div className="bg-surface border border-border rounded-xl p-3">
          <p className="text-xs text-ink-soft mb-1">Payment</p>
          <p className="text-sm font-medium text-ink">
            {order.paymentMode === "orderer_pays" ? "Orderer pays" : "Split bill"}
          </p>
        </div>

        {(["shipping", "discount"] as const).map((kind) => {
          const value = kind === "shipping" ? shippingFee : discount;
          const label = kind === "shipping" ? "Shipping" : "Discount";
          const isEditing = editingFee === kind;
          const display =
            kind === "shipping"
              ? value > 0 ? value.toLocaleString("vi-VN") + "₫" : "Free"
              : value > 0 ? "-" + value.toLocaleString("vi-VN") + "₫" : "None";
          return (
            <div key={kind} className="bg-surface border border-border rounded-xl p-3">
              <p className="text-xs text-ink-soft mb-1">{label}</p>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    autoFocus
                    value={feeDraft}
                    onChange={(e) => setFeeDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveFee();
                      else if (e.key === "Escape") setEditingFee(null);
                    }}
                    disabled={savingFee}
                    className="w-full min-w-0 px-2 py-1 text-sm border border-border rounded-lg bg-bg text-ink focus:outline-none focus:border-lavender-400"
                  />
                  <button
                    onClick={saveFee}
                    disabled={savingFee}
                    className="px-2 py-1 text-xs font-medium text-white bg-lavender-500 hover:bg-lavender-600 rounded-lg disabled:opacity-50"
                  >
                    {savingFee ? "..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingFee(null)}
                    disabled={savingFee}
                    className="px-2 py-1 text-xs text-ink-soft hover:text-ink"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{display}</p>
                  {canEditFees && (
                    <button
                      onClick={() => startEdit(kind)}
                      className="text-xs text-lavender-600 hover:underline shrink-0"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left column: Menu + Selections */}
        <div className="space-y-6">
        {isManual && order.menuImageUrl ? (
          <div>
            <h2 className="text-base font-semibold text-ink mb-3">Ảnh menu</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <a
              href={order.menuImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={order.menuImageUrl}
                alt="Menu"
                className="w-full max-h-[50vh] object-contain bg-bg border border-border rounded-xl cursor-zoom-in"
              />
            </a>
            <p className="mt-1 text-xs text-ink-soft">
              Member nhập món tay theo ảnh này. Bạn nhập giá từng món bên dưới.
            </p>
          </div>
        ) : (
        /* Menu (link mode) */
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-ink">
              Menu ({order.menuItems.length} items)
            </h2>
            <div className="flex items-center gap-3">
              {isOrderer && order.menuItems.length > 0 && (
                <button
                  onClick={refetchMenu}
                  disabled={refetchingMenu}
                  className="text-xs font-medium text-lavender-600 hover:underline disabled:opacity-50"
                >
                  {refetchingMenu ? "Refetching…" : "Refetch ↻"}
                </button>
              )}
              {order.menuItems.length > 0 && (
                <button
                  onClick={() => setMenuExpanded((v) => !v)}
                  className="text-xs font-medium text-lavender-600 hover:underline"
                  aria-expanded={menuExpanded}
                >
                  {menuExpanded ? "Collapse ▲" : "Expand ▼"}
                </button>
              )}
            </div>
          </div>
          {order.menuItems.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-8 text-center text-ink-soft text-sm">
              Menu is being fetched...
            </div>
          ) : !menuExpanded ? (
            <button
              onClick={() => setMenuExpanded(true)}
              className="w-full bg-surface border border-border rounded-2xl p-4 text-center text-ink-soft text-sm hover:bg-bg transition-colors"
            >
              Menu collapsed — click to view {order.menuItems.length} item{order.menuItems.length === 1 ? "" : "s"}
            </button>
          ) : (
            <div className="space-y-4">
              {groupByCategory(order.menuItems).map(({ category, items }) => (
                <div key={category ?? "_uncategorized"} className="space-y-2">
                  {category && (
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft px-1">
                      {category}
                    </h3>
                  )}
                  {items.map((item) => (
                <div key={`${category ?? ""}-${item.id}`} className="bg-surface border border-border rounded-xl p-3 flex gap-3 items-start">
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
                    {item.options.length > 0 && (
                      <p className="text-xs text-ink-soft mt-1">
                        Options: {item.options.map((o) => o.group).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        )}

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
                      const defaultUnit = defaultUnitPrice(sel);
                      const override = priceOverrideMap[sel.id] ?? null;
                      const unit = override ?? defaultUnit;
                      const lineTotal = unit * sel.quantity;
                      const isOrdered = orderedMap[sel.id] ?? false;
                      const isEditingThis = editingPrice === sel.id;
                      const isOverridden = override !== null;
                      return (
                        <div key={sel.id} className="flex items-start justify-between text-sm gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-ink block break-words">
                              {selectionName(sel)}
                              {sel.quantity > 1 && <span className="text-ink-soft"> ×{sel.quantity}</span>}
                            </span>
                            {!sel.menuItem && override == null && (
                              <span className="text-[10px] text-red-500 block">
                                Chưa nhập giá
                              </span>
                            )}
                            {sel.selectedOptions.length > 0 && (
                              <div className="text-xs text-ink-soft">
                                {sel.selectedOptions.map((o, i) => (
                                  <span key={i} className="block">+ {o.choice}</span>
                                ))}
                              </div>
                            )}
                            {sel.note && (
                              <span className="text-xs text-amber-700 italic block break-words">
                                📝 {sel.note}
                              </span>
                            )}
                            {isOverridden && (
                              <span className="text-[10px] text-amber-600 block">
                                Edited (menu: {defaultUnit.toLocaleString("vi-VN")}₫)
                              </span>
                            )}
                          </div>
                          {isOrderer && isEditingThis ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                min={0}
                                autoFocus
                                value={priceDraft}
                                onChange={(e) => setPriceDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") savePrice(sel);
                                  else if (e.key === "Escape") setEditingPrice(null);
                                }}
                                disabled={savingPrice}
                                className="w-20 px-2 py-1 text-xs border border-border rounded-lg bg-bg text-ink focus:outline-none focus:border-lavender-400"
                              />
                              <button
                                onClick={() => savePrice(sel)}
                                disabled={savingPrice}
                                className="px-1.5 py-1 text-[10px] font-medium text-white bg-lavender-500 hover:bg-lavender-600 rounded-md disabled:opacity-50"
                              >
                                Save
                              </button>
                              {isOverridden && (
                                <button
                                  onClick={() => resetPrice(sel)}
                                  disabled={savingPrice}
                                  className="px-1.5 py-1 text-[10px] text-ink-soft hover:text-ink"
                                  title="Reset to menu price"
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
                            <button
                              type="button"
                              onClick={() => isOrderer && startEditPrice(sel)}
                              disabled={!isOrderer}
                              className={`shrink-0 ${
                                isOverridden ? "text-amber-600 font-medium" : "text-ink-soft"
                              } ${isOrderer ? "hover:underline cursor-pointer" : "cursor-default"}`}
                              title={isOrderer ? "Click to edit price" : undefined}
                            >
                              {lineTotal.toLocaleString("vi-VN")}₫
                            </button>
                          )}
                          {isOrderer && (
                            <input
                              type="checkbox"
                              checked={isOrdered}
                              disabled={pendingOrdered[sel.id]}
                              onChange={() => toggleOrdered(sel.id)}
                              title={isOrdered ? "Đã đặt — bỏ đánh dấu" : "Đánh dấu đã đặt trên app"}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-lavender-500 cursor-pointer disabled:opacity-50"
                            />
                          )}
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

        {/* Right column: Bill Calculation + Bill Summary */}
        <div className="space-y-6">
      {/* Live Bill Calculation (visible khi có ít nhất 1 selection) */}
      {userSubtotals.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-base font-semibold text-ink">
              Bill Calculation
              <span className="ml-2 text-xs font-normal text-ink-soft">
                ({order.paymentMode === "orderer_pays" ? "Orderer pays" : "Split bill"})
              </span>
            </h2>
            {status === "open" && (
              <span className="text-xs text-ink-soft">Live preview</span>
            )}
          </div>

          <div className="space-y-1.5">
            {order.paymentMode === "orderer_pays" ? (
              userSubtotals.map((p) => (
                <div key={p.uid} className="flex justify-between text-sm">
                  <span className="text-ink">{p.userName}</span>
                  <span className="text-ink-soft">{p.subtotal.toLocaleString("vi-VN")}₫</span>
                </div>
              ))
            ) : (
              splitPerPerson.map((p) => (
                <div key={p.uid} className="flex justify-between text-sm">
                  <span className="text-ink font-medium">{p.userName}</span>
                  <span className="text-ink font-semibold">
                    {p.amount.toLocaleString("vi-VN")}₫
                    <span className="ml-2 text-xs font-normal text-ink-soft">
                      (món: {p.subtotal.toLocaleString("vi-VN")}₫)
                    </span>
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-border space-y-1">
            <div className="flex justify-between text-sm text-ink-soft">
              <span>Subtotal</span>
              <span>{itemsSubtotal.toLocaleString("vi-VN")}₫</span>
            </div>
            {shippingFee > 0 && (
              <div className="flex justify-between text-sm text-ink-soft">
                <span>Shipping</span>
                <span>+{shippingFee.toLocaleString("vi-VN")}₫</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{discount.toLocaleString("vi-VN")}₫</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-ink pt-1">
              <span>Grand total</span>
              <span>{grandTotal.toLocaleString("vi-VN")}₫</span>
            </div>
            {order.paymentMode === "split" && (
              <p className="text-xs text-ink-soft pt-1">
                Mỗi người = làm tròn 1.000₫ của (tiền món × tổng bill / tổng tiền món).
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bill summary */}
      {status === "closed" && (
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-ink">Bill Summary</h2>
            <button
              onClick={exportBillData}
              className="px-3 py-1.5 text-xs font-medium text-lavender-600 border border-lavender-200 hover:bg-lavender-50 rounded-xl transition-colors"
            >
              {exported ? "Copied!" : "Export bill data"}
            </button>
          </div>
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
