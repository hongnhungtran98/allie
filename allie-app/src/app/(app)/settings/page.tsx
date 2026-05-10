"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from "lucide-react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function getPermissionState(): PermissionState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as PermissionState;
}

export default function SettingsPage() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setPermission(getPermissionState());
    fetch("/api/settings/notifications")
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((d) => setNotificationEnabled(d.notificationEnabled ?? true))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const requestPermission = async () => {
    setRequesting(true);
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
    setRequesting(false);
  };

  const toggleEnabled = async () => {
    const next = !notificationEnabled;
    setNotificationEnabled(next);
    setSaving(true);
    await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationEnabled: next }),
    });
    setSaving(false);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
        <p className="text-sm text-ink-soft mt-1">Manage your notification preferences</p>
      </div>

      <div className="bg-surface rounded-2xl border border-border divide-y divide-border">
        {/* Section header */}
        <div className="px-6 py-4 flex items-center gap-3">
          <Bell size={18} className="text-lavender-500 shrink-0" />
          <h2 className="font-semibold text-ink">Reminder Notifications</h2>
        </div>

        {/* Browser permission */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs font-medium text-ink-soft uppercase tracking-wide">Browser Permission</p>

          {permission === "granted" && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={16} />
              <span className="text-sm font-medium">Permission granted</span>
            </div>
          )}

          {permission === "default" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-ink-soft">
                <AlertCircle size={16} />
                <span className="text-sm">Permission not yet granted</span>
              </div>
              <button
                onClick={requestPermission}
                disabled={requesting}
                className="px-4 py-2 rounded-xl bg-lavender-500 hover:bg-lavender-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {requesting ? "Requesting…" : "Enable notifications"}
              </button>
            </div>
          )}

          {permission === "denied" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-500">
                <XCircle size={16} />
                <span className="text-sm font-medium">Permission denied</span>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700 space-y-1">
                <p className="font-medium">How to re-enable manually:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-red-600">
                  <li>Click the lock icon in your browser's address bar</li>
                  <li>Find <strong>Notifications</strong> and set it to <strong>Allow</strong></li>
                  <li>Reload the page</li>
                </ol>
              </div>
            </div>
          )}

          {permission === "unsupported" && (
            <div className="flex items-center gap-2 text-ink-soft">
              <BellOff size={16} />
              <span className="text-sm">Browser notifications not supported</span>
            </div>
          )}
        </div>

        {/* Toggle */}
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">Enable notifications</p>
            <p className="text-xs text-ink-soft mt-0.5">
              {notificationEnabled ? "Reminders will notify you when due" : "All reminder notifications are muted"}
            </p>
          </div>
          {loading ? (
            <div className="w-10 h-6 rounded-full bg-border animate-pulse" />
          ) : (
            <button
              onClick={toggleEnabled}
              disabled={saving}
              className={`w-10 h-6 rounded-full transition-colors cursor-pointer flex items-center px-0.5 shrink-0 ${
                notificationEnabled ? "bg-lavender-500" : "bg-border"
              } disabled:opacity-60`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${notificationEnabled ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          )}
        </div>

        {/* Info note */}
        <div className="px-6 py-4">
          <p className="text-xs text-ink-soft">
            Notifications only fire while this page is open in the browser. Background (push) notifications are not supported in this version.
          </p>
        </div>
      </div>
    </div>
  );
}
