"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

const DEFAULT_TEMPLATE =
  "Đã có món ở {tên_quán}, mời mọi người nhận món. Danh sách đặt hàng như sau:\n{danh_sách}";
const DEFAULT_ROW = "- {tên_người}: {tên_món}";

export default function WebhookSettingsForm({ isAdmin }: { isAdmin: boolean }) {
  const toast = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_TEMPLATE);
  const [listRowTemplate, setListRowTemplate] = useState(DEFAULT_ROW);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/integrations/webhook")
      .then((r) => r.json())
      .then((data) => {
        setWebhookUrl(data.webhookUrl ?? "");
        setMessageTemplate(data.messageTemplate || DEFAULT_TEMPLATE);
        setListRowTemplate(data.listRowTemplate || DEFAULT_ROW);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!webhookUrl.trim()) {
      toast("error", "Vui lòng nhập Webhook URL");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/webhook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl, messageTemplate, listRowTemplate }),
      });
      if (res.ok) {
        toast("success", "Đã lưu cài đặt Webhook");
      } else {
        const err = await res.json().catch(() => ({}));
        toast("error", err.error ?? "Không lưu được");
      }
    } catch {
      toast("error", "Không lưu được");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Integrations</h1>
        <p className="text-sm text-ink-soft mt-1">Kết nối với các dịch vụ bên ngoài</p>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-ink">Webhook</h2>
          <p className="text-sm text-ink-soft mt-1">
            Gửi thông báo đến Google Chat, Slack hoặc bất kỳ webhook URL nào khi bấm &quot;Đã có món&quot;.
            Cài đặt này áp dụng cho toàn hệ thống.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-ink-soft">Đang tải...</p>
        ) : isAdmin ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Webhook URL
              </label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://chat.googleapis.com/v1/spaces/..."
                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-bg text-ink placeholder:text-ink-soft focus:outline-none focus:border-lavender-400"
              />
              <p className="text-xs text-ink-soft mt-1">
                Ví dụ: Google Chat Incoming Webhook URL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Nội dung tin nhắn mẫu
              </label>
              <textarea
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-bg text-ink font-mono resize-y focus:outline-none focus:border-lavender-400"
              />
              <p className="text-xs text-ink-soft mt-1">
                Placeholder:{" "}
                <code className="bg-bg border border-border px-1 rounded text-xs">{"{tên_quán}"}</code>{" "}
                — tên quán;{" "}
                <code className="bg-bg border border-border px-1 rounded text-xs">{"{danh_sách}"}</code>{" "}
                — danh sách người đặt.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Định dạng mỗi dòng danh sách
              </label>
              <input
                type="text"
                value={listRowTemplate}
                onChange={(e) => setListRowTemplate(e.target.value)}
                placeholder="- {tên_người}: {tên_món}"
                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-bg text-ink font-mono placeholder:text-ink-soft focus:outline-none focus:border-lavender-400"
              />
              <p className="text-xs text-ink-soft mt-1">
                Placeholder:{" "}
                <code className="bg-bg border border-border px-1 rounded text-xs">{"{tên_người}"}</code>{" "}
                — tên người đặt;{" "}
                <code className="bg-bg border border-border px-1 rounded text-xs">{"{tên_món}"}</code>{" "}
                — tên món.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-lavender-500 hover:bg-lavender-600 rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu cài đặt"}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-ink-soft mb-1">Webhook URL</p>
              <p className="text-sm text-ink font-mono break-all">
                {webhookUrl || <span className="text-ink-soft italic">Chưa cấu hình</span>}
              </p>
            </div>
            <p className="text-xs text-ink-soft">Chỉ Admin mới có thể thay đổi cài đặt này.</p>
          </div>
        )}
      </div>
    </div>
  );
}
