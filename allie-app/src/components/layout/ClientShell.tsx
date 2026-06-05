"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

interface ClientShellProps {
  userName: string;
  userRole: string;
  children: React.ReactNode;
}

export default function ClientShell({ userName, userRole, children }: ClientShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Hamburger button — mobile only */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-xl bg-surface border border-border shadow-sm text-ink"
        onClick={() => setOpen(true)}
        aria-label="Mở menu"
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <Sidebar
        userName={userName}
        userRole={userRole}
        isOpen={open}
        onClose={() => setOpen(false)}
      />

      <main className="flex-1 overflow-y-auto p-4 pt-16 md:p-8">
        {children}
      </main>
    </div>
  );
}
