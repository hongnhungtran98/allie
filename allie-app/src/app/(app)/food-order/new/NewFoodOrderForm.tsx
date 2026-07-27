"use client";

import { useState, useEffect, useRef } from "react";
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
  const [menuFiles, setMenuFiles] = useState<File[]>([]);
  const [menuPreviews, setMenuPreviews] = useState<string[]>([]);
  const menuFilesRef = useRef<File[]>([]);
  const menuPreviewsRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { menuFilesRef.current = menuFiles; }, [menuFiles]);
  useEffect(() => { menuPreviewsRef.current = menuPreviews; }, [menuPreviews]);
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

  function addFiles(added: File[]) {
    const current = menuFilesRef.current;
    const currentPreviews = menuPreviewsRef.current;
    const combined = [...current, ...added].slice(0, 5);
    const prevLen = current.length;
    const newPreviews = combined.map((f, i) =>
      i < prevLen ? currentPreviews[i] : URL.createObjectURL(f)
    );
    setMenuFiles(combined);
    setMenuPreviews(newPreviews);
    setErrors((p) => { const n = { ...p }; delete n.menuFile; return n; });
  }

  function onPickFiles(picked: FileList | null) {
    if (!picked) return;
    addFiles(Array.from(picked));
  }

  function onRemoveFile(idx: number) {
    URL.revokeObjectURL(menuPreviewsRef.current[idx]);
    setMenuFiles((prev) => prev.filter((_, i) => i !== idx));
    setMenuPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  useEffect(() => {
    if (orderType !== "manual") return;
    function handlePaste(e: ClipboardEvent) {
      if (menuFilesRef.current.length >= 5) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) imageFiles.push(f);
        }
      }
      if (imageFiles.length > 0) addFiles(imageFiles);
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [orderType]);

  function validate() {
    const e: Record<string, string> = {};
    if (orderType === "link") {
      const trimmed = sourceUrl.trim();
      if (!trimmed) e.sourceUrl = "Source URL is required";
      else if (!trimmed.startsWith("http")) e.sourceUrl = "Enter a valid URL";
      else if (!isSupportedFoodUrl(trimmed))
        e.sourceUrl = "Hiện tại chỉ hỗ trợ link từ GrabFood (food.grab.com, r.grab.com) hoặc ShopeeFood (shopeefood.vn).";
    } else {
      if (menuFiles.length === 0) {
        e.menuFile = "Vui lòng chọn ít nhất 1 ảnh menu";
      } else {
        for (const f of menuFiles) {
          if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
            e.menuFile = "Chỉ hỗ trợ ảnh JPG, PNG, hoặc WEBP";
            break;
          }
          if (f.size > 5 * 1024 * 1024) {
            e.menuFile = `${f.name}: ảnh tối đa 5MB`;
            break;
          }
        }
      }
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
      const menuImageUrls: string[] = [];

      if (orderType === "manual") {
        for (const file of menuFiles) {
          const fd = new FormData();
          fd.append("file", file);
          const upRes = await fetch("/api/food-orders/upload-menu-image", { method: "POST", body: fd });
          const upData = await upRes.json();
          if (!upRes.ok) {
            toast("error", upData.error || "Upload thất bại");
            return;
          }
          menuImageUrls.push(upData.url);
        }
      }

      const res = await fetch("/api/food-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          restaurantName: restaurantName.trim(),
          sourceUrl: orderType === "link" ? sourceUrl.trim() : "",
          menuImageUrls,
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
            Ảnh menu <span className="text-red-500">*</span>{" "}
            <span className="text-ink-soft font-normal">({menuFiles.length}/5)</span>
          </label>
          {menuFiles.length < 5 && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => { onPickFiles(e.target.files); e.target.value = ""; }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 text-sm border border-border rounded-xl bg-bg text-ink hover:bg-surface transition-colors"
              >
                Chọn ảnh
              </button>
              <div className="flex items-center justify-center border border-dashed border-border rounded-xl py-3 text-xs text-ink-soft select-none">
                Hoặc nhấn{" "}
                <kbd className="mx-1 px-1.5 py-0.5 rounded border border-border bg-bg font-mono text-ink">
                  Ctrl+V
                </kbd>{" "}
                để paste ảnh từ clipboard
              </div>
            </div>
          )}
          {errors.menuFile && <p className="mt-1 text-xs text-red-500">{errors.menuFile}</p>}
          {menuPreviews.length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {menuPreviews.map((preview, i) => (
                <div key={i} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt={`Menu ${i + 1}`}
                    className="w-full h-32 object-contain rounded-xl border border-border bg-bg"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-ink-soft">JPG/PNG/WEBP, tối đa 5MB mỗi ảnh, tối đa 5 ảnh. Member sẽ nhập tên món tay theo ảnh này.</p>
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
