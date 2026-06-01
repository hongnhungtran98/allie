"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

type OrderType = "link" | "manual";

export default function NewFoodOrderForm() {
  const router = useRouter();
  const toast = useToast();

  const [orderType, setOrderType] = useState<OrderType>("link");
  const [restaurantName, setRestaurantName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [menuPreview, setMenuPreview] = useState<string | null>(null);
  const [countdownMinutes, setCountdownMinutes] = useState("");
  const [paymentMode, setPaymentMode] = useState<"orderer_pays" | "split">("split");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function isSupportedFoodUrl(url: string) {
    try {
      const u = new URL(url);
      return (
        /(^|\.)food\.grab\.com$/i.test(u.hostname) ||
        /^r\.grab\.com$/i.test(u.hostname) ||
        /(^|\.)shopeefood\.vn$/i.test(u.hostname)
      );
    } catch {
      return false;
    }
  }

  function onPickFile(f: File | null) {
    setMenuFile(f);
    if (menuPreview) URL.revokeObjectURL(menuPreview);
    setMenuPreview(f ? URL.createObjectURL(f) : null);
    setErrors((p) => { const n = { ...p }; delete n.menuFile; return n; });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (orderType === "link") {
      const trimmed = sourceUrl.trim();
      if (!trimmed) e.sourceUrl = "Source URL is required";
      else if (!trimmed.startsWith("http")) e.sourceUrl = "Enter a valid URL";
      else if (!isSupportedFoodUrl(trimmed))
        e.sourceUrl = "Hiện tại chỉ hỗ trợ link từ GrabFood (food.grab.com, r.grab.com) hoặc ShopeeFood (shopeefood.vn).";
    } else {
      if (!menuFile) e.menuFile = "Vui lòng chọn ảnh menu";
      else if (!["image/jpeg", "image/png", "image/webp"].includes(menuFile.type))
        e.menuFile = "Chỉ hỗ trợ ảnh JPG, PNG, hoặc WEBP";
      else if (menuFile.size > 5 * 1024 * 1024)
        e.menuFile = "Ảnh tối đa 5MB";
    }
    if (countdownMinutes && parseInt(countdownMinutes) <= 0)
      e.countdownMinutes = "Countdown must be a positive number";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      let menuImageUrl: string | null = null;

      if (orderType === "manual" && menuFile) {
        const fd = new FormData();
        fd.append("file", menuFile);
        const upRes = await fetch("/api/food-orders/upload-menu-image", { method: "POST", body: fd });
        const upData = await upRes.json();
        if (!upRes.ok) {
          toast("error", upData.error || "Upload thất bại");
          return;
        }
        menuImageUrl = upData.url;
      }

      const res = await fetch("/api/food-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          restaurantName: restaurantName.trim(),
          sourceUrl: orderType === "link" ? sourceUrl.trim() : "",
          menuImageUrl,
          countdownMinutes: countdownMinutes ? parseInt(countdownMinutes) : 0,
          paymentMode,
          shippingFee: 0,
          discount: 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast("error", data.error || "Failed to create order");
        return;
      }

      const order = await res.json();

      if (orderType === "link") {
        const menuRes = await fetch(`/api/food-orders/${order.id}/fetch-menu`, { method: "POST" });
        const menuData = await menuRes.json();
        if (menuRes.status === 422 || menuData.error) {
          toast("warning", menuData.error || "Menu could not be loaded automatically.");
        } else {
          toast("success", `Order session created! ${menuData.itemCount} items loaded.`);
        }
      } else {
        toast("success", "Đã tạo order với menu ảnh!");
      }
      router.push(`/food-order/${order.id}`);
    } catch {
      toast("error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 space-y-5">
      {/* Order Type */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">Order Type</label>
        <div className="flex gap-3">
          {(["link", "manual"] as const).map((t) => (
            <label
              key={t}
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                orderType === t
                  ? "border-lavender-500 bg-lavender-50 text-lavender-700"
                  : "border-border text-ink hover:bg-bg"
              }`}
            >
              <input
                type="radio"
                name="orderType"
                value={t}
                checked={orderType === t}
                onChange={() => setOrderType(t)}
                className="accent-lavender-500"
              />
              <span className="text-sm font-medium">
                {t === "link" ? "Link nhà hàng" : "Upload ảnh menu"}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Restaurant name */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Tên nhà hàng
          {orderType === "link" && (
            <span className="text-ink-soft font-normal"> — optional, tự điền từ link</span>
          )}
        </label>
        <input
          type="text"
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
          placeholder="Ví dụ: Phở Hà Nội, KFC Lê Lợi..."
          className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-bg focus:outline-none focus:ring-2 focus:ring-lavender-500"
        />
      </div>

      {/* Source URL */}
      {orderType === "link" && (
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Restaurant Link <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            onBlur={() => {
              const trimmed = sourceUrl.trim();
              if (!trimmed) setErrors((p) => ({ ...p, sourceUrl: "Source URL is required" }));
              else if (!isSupportedFoodUrl(trimmed))
                setErrors((p) => ({
                  ...p,
                  sourceUrl:
                    "Hiện tại chỉ hỗ trợ link từ GrabFood (food.grab.com, r.grab.com) hoặc ShopeeFood (shopeefood.vn).",
                }));
              else setErrors((p) => { const n = { ...p }; delete n.sourceUrl; return n; });
            }}
            placeholder="https://food.grab.com/... hoặc https://shopeefood.vn/..."
            className={`w-full px-3 py-2 text-sm border rounded-xl bg-bg focus:outline-none focus:ring-2 focus:ring-lavender-500 ${
              errors.sourceUrl ? "border-red-400" : "border-border"
            }`}
          />
          {errors.sourceUrl && <p className="mt-1 text-xs text-red-500">{errors.sourceUrl}</p>}
        </div>
      )}

      {/* Menu image */}
      {orderType === "manual" && (
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Ảnh menu <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            className={`block w-full text-sm text-ink file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border file:border-border file:bg-bg file:text-ink hover:file:bg-surface ${
              errors.menuFile ? "" : ""
            }`}
          />
          {errors.menuFile && <p className="mt-1 text-xs text-red-500">{errors.menuFile}</p>}
          {menuPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={menuPreview}
              alt="Menu preview"
              className="mt-3 max-h-64 rounded-xl border border-border object-contain bg-bg"
            />
          )}
          <p className="mt-1 text-xs text-ink-soft">JPG/PNG/WEBP, tối đa 5MB. Member sẽ nhập tên món tay theo ảnh này.</p>
        </div>
      )}

      {/* Countdown */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Countdown (minutes) <span className="text-ink-soft font-normal">— optional</span>
        </label>
        <input
          type="number"
          min="1"
          value={countdownMinutes}
          onChange={(e) => setCountdownMinutes(e.target.value)}
          placeholder="e.g. 15"
          className={`w-full px-3 py-2 text-sm border rounded-xl bg-bg focus:outline-none focus:ring-2 focus:ring-lavender-500 ${
            errors.countdownMinutes ? "border-red-400" : "border-border"
          }`}
        />
        {errors.countdownMinutes && <p className="mt-1 text-xs text-red-500">{errors.countdownMinutes}</p>}
        <p className="mt-1 text-xs text-ink-soft">Leave empty for no time limit</p>
      </div>

      {/* Payment mode */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">Payment Mode</label>
        <div className="flex gap-3">
          {(["orderer_pays", "split"] as const).map((mode) => (
            <label
              key={mode}
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                paymentMode === mode
                  ? "border-lavender-500 bg-lavender-50 text-lavender-700"
                  : "border-border text-ink hover:bg-bg"
              }`}
            >
              <input
                type="radio"
                name="paymentMode"
                value={mode}
                checked={paymentMode === mode}
                onChange={() => setPaymentMode(mode)}
                className="accent-lavender-500"
              />
              <span className="text-sm font-medium">
                {mode === "orderer_pays" ? "Orderer pays all" : "Split bill"}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Link
          href="/food-order"
          className="px-4 py-2 text-sm font-medium text-ink border border-border rounded-xl hover:bg-bg transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-sm font-medium text-white bg-lavender-500 hover:bg-lavender-600 disabled:opacity-60 rounded-xl transition-colors"
        >
          {loading ? "Creating..." : "Create Order"}
        </button>
      </div>
    </form>
  );
}
