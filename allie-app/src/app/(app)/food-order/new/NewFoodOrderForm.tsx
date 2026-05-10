"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";

export default function NewFoodOrderForm() {
  const router = useRouter();
  const toast = useToast();

  const [sourceUrl, setSourceUrl] = useState("");
  const [countdownMinutes, setCountdownMinutes] = useState("");
  const [paymentMode, setPaymentMode] = useState<"orderer_pays" | "split">("split");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!sourceUrl.trim()) e.sourceUrl = "Source URL is required";
    else if (!sourceUrl.startsWith("http")) e.sourceUrl = "Enter a valid URL";
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
      // Create the food order
      const res = await fetch("/api/food-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: sourceUrl.trim(),
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

      // Fetch menu from the restaurant URL
      const menuRes = await fetch(`/api/food-orders/${order.id}/fetch-menu`, { method: "POST" });
      const menuData = await menuRes.json();

      if (menuRes.status === 422 || menuData.error) {
        toast("warning", menuData.error || "Menu could not be loaded automatically.");
      } else {
        toast("success", `Order session created! ${menuData.itemCount} items loaded.`);
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
      {/* Source URL */}
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Restaurant Link <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          onBlur={() => {
            if (!sourceUrl.trim()) setErrors((p) => ({ ...p, sourceUrl: "Source URL is required" }));
            else setErrors((p) => { const n = { ...p }; delete n.sourceUrl; return n; });
          }}
          placeholder="https://shopeefood.vn/... or https://food.grab.com/..."
          className={`w-full px-3 py-2 text-sm border rounded-xl bg-bg focus:outline-none focus:ring-2 focus:ring-lavender-500 ${
            errors.sourceUrl ? "border-red-400" : "border-border"
          }`}
        />
        {errors.sourceUrl && <p className="mt-1 text-xs text-red-500">{errors.sourceUrl}</p>}
      </div>

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
