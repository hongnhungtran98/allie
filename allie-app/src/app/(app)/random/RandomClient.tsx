"use client";

import { useState } from "react";
import { Trash2, Plus, Shuffle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface RandomItem {
  id: string;
  name: string;
  isSystem: boolean;
}

interface Props {
  initialItems: RandomItem[];
  isAdmin: boolean;
}

export default function RandomClient({ initialItems, isAdmin }: Props) {
  const [items, setItems] = useState<RandomItem[]>(initialItems);
  const [result, setResult] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [systemInput, setSystemInput] = useState("");
  const [personalInput, setPersonalInput] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const handleRandom = () => {
    if (items.length === 0) return;
    setSpinning(true);
    setResult(null);

    let count = 0;
    const total = 18;
    const id = setInterval(() => {
      setResult(items[Math.floor(Math.random() * items.length)].name);
      count++;
      if (count >= total) {
        clearInterval(id);
        setSpinning(false);
      }
    }, 80);
  };

  const addItem = async (name: string, isSystem: boolean) => {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/random", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), isSystem }),
    });
    setSaving(false);
    if (res.ok) {
      const item = await res.json();
      setItems((prev) => [...prev, { id: item.id, name: item.name, isSystem: item.userId === null }]);
      if (isSystem) setSystemInput(""); else setPersonalInput("");
      toast("success", "Item added");
    } else {
      toast("error", "Something went wrong. Please try again.");
    }
  };

  const handleDelete = async (item: RandomItem) => {
    const res = await fetch(`/api/random/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast("success", "Item removed");
    } else {
      toast("error", "Something went wrong. Please try again.");
    }
  };

  const systemItems = items.filter((i) => i.isSystem);
  const personalItems = items.filter((i) => !i.isSystem);

  return (
    <div className="space-y-6">
      {/* Random button + result */}
      <div className="bg-surface rounded-2xl border border-border p-8 flex flex-col items-center gap-6">
        <button
          onClick={handleRandom}
          disabled={items.length === 0 || spinning}
          className="flex items-center gap-2 bg-lavender-500 hover:bg-lavender-600 disabled:opacity-50 text-white font-bold text-lg px-10 py-4 rounded-2xl transition-colors cursor-pointer shadow-sm"
        >
          <Shuffle size={22} />
          Random!
        </button>

        {result && (
          <div className="text-center">
            <p className="text-xs text-ink-soft uppercase tracking-wide mb-1">Today&apos;s pick</p>
            <p className={`text-3xl font-bold text-ink transition-all duration-75 ${spinning ? "opacity-50 scale-95" : "opacity-100 scale-100"}`}>
              {result}
            </p>
          </div>
        )}

        {items.length === 0 && (
          <p className="text-sm text-ink-soft">Add some items below to get started</p>
        )}
      </div>

      {/* Item lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System items */}
        <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink text-sm">🏪 System items</h2>
            <span className="text-xs text-ink-soft">{systemItems.length} items</span>
          </div>

          <ul className="space-y-1">
            {systemItems.map((item) => (
              <li key={item.id} className="group flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted transition-colors">
                <span className="flex-1 text-sm text-ink">{item.name}</span>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(item)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-ink-soft hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </li>
            ))}
            {systemItems.length === 0 && (
              <p className="text-xs text-ink-soft/60 italic px-3 py-1">No system items yet</p>
            )}
          </ul>

          {isAdmin && (
            <div className="flex gap-2">
              <input
                value={systemInput}
                onChange={(e) => setSystemInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addItem(systemInput, true); }}
                placeholder="Add system item…"
                className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-muted text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-lavender-300"
              />
              <button
                onClick={() => addItem(systemInput, true)}
                disabled={saving || !systemInput.trim()}
                className="p-1.5 rounded-xl bg-lavender-500 hover:bg-lavender-600 disabled:opacity-50 text-white transition-colors cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Personal items */}
        <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink text-sm">👤 My items</h2>
            <span className="text-xs text-ink-soft">{personalItems.length} items</span>
          </div>

          <ul className="space-y-1">
            {personalItems.map((item) => (
              <li key={item.id} className="group flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted transition-colors">
                <span className="flex-1 text-sm text-ink">{item.name}</span>
                <button
                  onClick={() => handleDelete(item)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-ink-soft hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
            {personalItems.length === 0 && (
              <p className="text-xs text-ink-soft/60 italic px-3 py-1">No personal items yet</p>
            )}
          </ul>

          <div className="flex gap-2">
            <input
              value={personalInput}
              onChange={(e) => setPersonalInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addItem(personalInput, false); }}
              placeholder="Add my item…"
              className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-muted text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-lavender-300"
            />
            <button
              onClick={() => addItem(personalInput, false)}
              disabled={saving || !personalInput.trim()}
              className="p-1.5 rounded-xl bg-lavender-500 hover:bg-lavender-600 disabled:opacity-50 text-white transition-colors cursor-pointer"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
