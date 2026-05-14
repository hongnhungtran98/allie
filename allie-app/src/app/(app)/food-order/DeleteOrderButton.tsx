"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function DeleteOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Xoá order này? Hành động không thể hoàn tác.")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/food-orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast("error", data.error || "Failed to delete");
        return;
      }
      toast("success", "Order deleted");
      router.refresh();
    } catch {
      toast("error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="ml-3 text-red-500 hover:text-red-600 disabled:opacity-50 text-xs font-medium"
    >
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}
