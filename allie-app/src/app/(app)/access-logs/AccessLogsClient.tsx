"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface AccessLogItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  path: string;
  ipAddress: string | null;
  createdAt: string;
}

const SCREEN_LABELS: Record<string, string> = {
  "/dashboard": "Home",
  "/bookmarks": "Bookmarks",
  "/notes": "Notes",
  "/timeline": "Timeline",
  "/random": "Random",
  "/food-order": "Food Order",
  "/notifications": "Inbox",
  "/settings": "Settings",
  "/users": "Users",
  "/access-logs": "Access Log",
};

function labelFor(path: string): string {
  if (SCREEN_LABELS[path]) return SCREEN_LABELS[path];
  for (const prefix of Object.keys(SCREEN_LABELS)) {
    if (path.startsWith(prefix + "/")) return SCREEN_LABELS[prefix]!;
  }
  return path;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

export default function AccessLogsClient({ users }: { users: UserOption[] }) {
  const [items, setItems] = useState<AccessLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(false);

  const [userId, setUserId] = useState("");
  const [path, setPath] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const sp = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
    if (userId) sp.set("userId", userId);
    if (path) sp.set("path", path);
    if (dateFrom) sp.set("dateFrom", dateFrom);
    if (dateTo) sp.set("dateTo", dateTo);
    const res = await fetch(`/api/access-logs?${sp.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
    }
    setLoading(false);
  }, [userId, path, dateFrom, dateTo, pageSize]);

  useEffect(() => { load(1); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    load(1);
  };

  const resetFilters = () => {
    setUserId("");
    setPath("");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={22} className="text-lavender-500" />
        <div>
          <h1 className="text-2xl font-bold text-ink">Access Log</h1>
          <p className="text-sm text-ink-soft mt-1">Theo dõi user nào truy cập màn hình nào, lúc nào</p>
        </div>
      </div>

      <form
        onSubmit={applyFilters}
        className="bg-surface rounded-2xl border border-border p-4 grid grid-cols-1 md:grid-cols-5 gap-3"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink-soft uppercase tracking-wide">User</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:border-lavender-500"
          >
            <option value="">Tất cả</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink-soft uppercase tracking-wide">Màn hình (path)</label>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/dashboard"
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:border-lavender-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink-soft uppercase tracking-wide">Từ ngày</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:border-lavender-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink-soft uppercase tracking-wide">Đến ngày</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:border-lavender-500"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl bg-lavender-500 hover:bg-lavender-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Lọc
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 rounded-xl border border-border text-sm text-ink-soft hover:bg-lavender-50 transition-colors cursor-pointer"
            title="Xoá bộ lọc"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </form>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-lavender-50 text-ink-soft">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Thời gian</th>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Màn hình</th>
                <th className="text-left px-4 py-3 font-medium">Path</th>
                <th className="text-left px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">Đang tải…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">Không có dữ liệu</td></tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="hover:bg-lavender-50/40">
                    <td className="px-4 py-2.5 text-ink whitespace-nowrap font-mono text-xs">{formatTime(it.createdAt)}</td>
                    <td className="px-4 py-2.5 text-ink">{it.userName}</td>
                    <td className="px-4 py-2.5 text-ink-soft text-xs">{it.userEmail}</td>
                    <td className="px-4 py-2.5 text-ink">{labelFor(it.path)}</td>
                    <td className="px-4 py-2.5 text-ink-soft font-mono text-xs">{it.path}</td>
                    <td className="px-4 py-2.5 text-ink-soft font-mono text-xs">{it.ipAddress ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-ink-soft">
          <div>
            Tổng: <span className="font-semibold text-ink">{total}</span>
            {total > 0 && (
              <> · Trang <span className="font-semibold text-ink">{page}</span>/{totalPages}</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(page - 1)}
              disabled={loading || page <= 1}
              className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-lavender-50 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => load(page + 1)}
              disabled={loading || page >= totalPages}
              className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-lavender-50 transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
