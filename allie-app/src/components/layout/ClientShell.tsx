"use client";

import { useState, useRef, useEffect } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

interface ClientShellProps {
  userName: string;
  userRole: string;
  children: React.ReactNode;
}

export default function ClientShell({ userName, userRole, children }: ClientShellProps) {
  const [open, setOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 200);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

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

      <main ref={mainRef} className="flex-1 overflow-y-auto p-4 pt-16 md:p-8">
        {children}
      </main>

      {showScrollTop && (
        <button
          onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-lavender-500 text-white shadow-lg hover:bg-lavender-600 transition-all duration-200"
          aria-label="Scroll lên đầu trang"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
