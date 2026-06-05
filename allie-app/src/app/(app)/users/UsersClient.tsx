"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, RefreshCw, Plus, Pencil, Trash2, KeyRound, Eye, EyeOff, Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Role = "ADMIN" | "USER";

interface UserItem {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: Role;
  notificationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

function nameToUsername(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 30);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export default function UsersClient({ currentUserId }: { currentUserId: string }) {
  const toast = useToast();
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserItem | null>(null);
  const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    const res = await fetch(`/api/admin/users?${sp.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
    } else {
      toast("error", "Không tải được danh sách user");
    }
    setLoading(false);
  }, [q, toast]);

  useEffect(() => { load(); }, [load]);

  const applyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Users size={22} className="text-lavender-500" />
          <div>
            <h1 className="text-2xl font-bold text-ink">Người dùng</h1>
            <p className="text-sm text-ink-soft mt-1">Quản lý tài khoản: thêm, sửa, xoá, reset mật khẩu</p>
          </div>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lavender-500 hover:bg-lavender-600 text-white text-sm font-semibold transition-colors cursor-pointer"
        >
          <Plus size={16} /> Thêm user
        </button>
      </div>

      <form
        onSubmit={applyFilter}
        className="bg-surface rounded-2xl border border-border p-4 flex flex-col md:flex-row gap-3"
      >
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo tên hoặc email"
          className="flex-1 px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:border-lavender-500"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-lavender-500 hover:bg-lavender-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Lọc
          </button>
          <button
            type="button"
            onClick={() => { setQ(""); }}
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
                <th className="text-left px-4 py-3 font-medium">Tên</th>
                <th className="text-left px-4 py-3 font-medium">Username</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Vai trò</th>
                <th className="text-left px-4 py-3 font-medium">Tạo lúc</th>
                <th className="text-right px-4 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">Đang tải…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-soft">Không có user nào</td></tr>
              ) : (
                items.map((u) => (
                  <tr key={u.id} className="hover:bg-lavender-50/40">
                    <td className="px-4 py-2.5 text-ink font-medium">
                      {u.name}
                      {u.id === currentUserId && (
                        <span className="ml-2 text-xs text-lavender-600">(bạn)</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">
                      {u.username ?? <span className="italic">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === "ADMIN"
                          ? "bg-lavender-500 text-white"
                          : "bg-lavender-100 text-lavender-600"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft font-mono text-xs whitespace-nowrap">{formatTime(u.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setResetTarget(u)}
                          className="p-1.5 rounded-lg text-ink-soft hover:bg-lavender-100 hover:text-lavender-600 transition-colors cursor-pointer"
                          title="Reset mật khẩu"
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          onClick={() => setEditTarget(u)}
                          className="p-1.5 rounded-lg text-ink-soft hover:bg-lavender-100 hover:text-lavender-600 transition-colors cursor-pointer"
                          title="Sửa"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          disabled={u.id === currentUserId}
                          className="p-1.5 rounded-lg text-ink-soft hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title={u.id === currentUserId ? "Không thể tự xoá" : "Xoá"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-ink-soft">
          <div>Tổng: <span className="font-semibold text-ink">{items.length}</span></div>
        </div>
      </div>

      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); load(); }}
        />
      )}

      {editTarget && (
        <EditModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load(); }}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); load(); }}
        />
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl border border-border w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!usernameTouched) setUsername(nameToUsername(v));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, username: username.trim() || undefined }),
    });
    setSubmitting(false);
    if (res.ok) {
      toast("success", "Đã thêm user");
      onCreated();
    } else {
      const data = await res.json().catch(() => ({}));
      toast("error", data.error || "Không tạo được user");
    }
  };

  return (
    <Modal title="Thêm user" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Tên">
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:border-lavender-500"
          />
        </Field>
        <Field label="Username (dùng để đăng nhập)">
          <input
            value={username}
            onChange={(e) => { setUsername(e.target.value); setUsernameTouched(true); }}
            placeholder="vd: nguyen.van.a"
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink font-mono focus:outline-none focus:border-lavender-500"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:border-lavender-500"
          />
        </Field>
        <Field label="Mật khẩu">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 pr-10 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:border-lavender-500"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-soft hover:text-ink"
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <Field label="Vai trò">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:border-lavender-500"
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </Field>
        <FormActions onCancel={onClose} submitting={submitting} submitLabel="Tạo" />
      </form>
    </Modal>
  );
}

function EditModal({ user, onClose, onSaved }: { user: UserItem; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username ?? nameToUsername(user.name));
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role, username: username.trim() || null }),
    });
    setSubmitting(false);
    if (res.ok) {
      toast("success", "Đã cập nhật");
      onSaved();
    } else {
      const data = await res.json().catch(() => ({}));
      toast("error", data.error || "Không cập nhật được");
    }
  };

  return (
    <Modal title={`Sửa user — ${user.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Tên">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:border-lavender-500"
          />
        </Field>
        <Field label="Username (dùng để đăng nhập)">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="vd: nguyen.van.a"
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink font-mono focus:outline-none focus:border-lavender-500"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:border-lavender-500"
          />
        </Field>
        <Field label="Vai trò">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:border-lavender-500"
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </Field>
        <FormActions onCancel={onClose} submitting={submitting} submitLabel="Lưu" />
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: UserItem; onClose: () => void }) {
  const toast = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    let out = "";
    const arr = new Uint32Array(12);
    crypto.getRandomValues(arr);
    for (let i = 0; i < arr.length; i++) out += chars[arr[i]! % chars.length];
    setNewPassword(out);
    setShowPw(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("error", "Không copy được");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    setSubmitting(false);
    if (res.ok) {
      toast("success", "Đã reset mật khẩu");
      onClose();
    } else {
      const data = await res.json().catch(() => ({}));
      toast("error", data.error || "Không reset được");
    }
  };

  return (
    <Modal title={`Reset mật khẩu — ${user.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-ink-soft">
          Email: <span className="text-ink font-medium">{user.email}</span>
        </p>
        <Field label="Mật khẩu mới">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 pr-20 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:border-lavender-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {newPassword && (
                <button
                  type="button"
                  onClick={copy}
                  className="p-1 text-ink-soft hover:text-ink"
                  title="Copy"
                  tabIndex={-1}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="p-1 text-ink-soft hover:text-ink"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </Field>
        <button
          type="button"
          onClick={generate}
          className="text-xs text-lavender-600 hover:underline cursor-pointer"
        >
          Tạo mật khẩu ngẫu nhiên 12 ký tự
        </button>
        <FormActions onCancel={onClose} submitting={submitting} submitLabel="Reset" />
      </form>
    </Modal>
  );
}

function DeleteModal({ user, onClose, onDeleted }: { user: UserItem; onClose: () => void; onDeleted: () => void }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    setSubmitting(false);
    if (res.ok) {
      toast("success", "Đã xoá user");
      onDeleted();
    } else {
      const data = await res.json().catch(() => ({}));
      toast("error", data.error || "Không xoá được");
    }
  };

  return (
    <Modal title="Xoá user" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-ink">
          Sẽ xoá <span className="font-semibold">{user.name}</span> ({user.email}) cùng toàn bộ dữ liệu cá nhân (bookmarks, notes, timeline, …). Hành động này không thể hoàn tác.
        </p>
        <Field label={`Gõ "${user.email}" để xác nhận`}>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:outline-none focus:border-red-500"
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-sm text-ink hover:bg-lavender-50 transition-colors cursor-pointer"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || confirm !== user.email}
            className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Xoá
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-ink-soft uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function FormActions({ onCancel, submitting, submitLabel }: { onCancel: () => void; submitting: boolean; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-xl border border-border text-sm text-ink hover:bg-lavender-50 transition-colors cursor-pointer"
      >
        Huỷ
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 rounded-xl bg-lavender-500 hover:bg-lavender-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
      >
        {submitting ? "Đang lưu…" : submitLabel}
      </button>
    </div>
  );
}
