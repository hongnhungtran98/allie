"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/(auth)/login/actions";
import { LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard",      label: "Home",          icon: "🏠" },
  { href: "/bookmarks",      label: "Bookmarks",     icon: "🔖" },
  { href: "/notes",          label: "Notes",         icon: "📝" },
  { href: "/timeline",       label: "Timeline",      icon: "📅" },
  { href: "/random",         label: "Random",        icon: "🎲" },
  { href: "/food-order",     label: "Food Order",    icon: "🍱" },
  { href: "/notifications",  label: "Inbox",         icon: "🔔" },
  { href: "/settings",       label: "Settings",      icon: "⚙️" },
];

const adminNavItems = [
  { href: "/users",          label: "Users",         icon: "👥" },
  { href: "/access-logs",    label: "Access Log",    icon: "🛡️" },
];

interface SidebarProps {
  userName: string;
  userRole: string;
}

export default function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const initial = userName.charAt(0).toUpperCase();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = () =>
      fetch("/api/notifications")
        .then((r) => r.ok ? r.json() : null)
        .then((d) => d && setUnreadCount(d.unreadCount ?? 0))
        .catch(() => {});

    fetchUnread();
    const id = setInterval(fetchUnread, 60_000);
    return () => clearInterval(id);
  }, []);

  // Reset badge when user visits notifications page
  useEffect(() => {
    if (pathname.startsWith("/notifications")) setUnreadCount(0);
  }, [pathname]);

  return (
    <aside className="w-56 shrink-0 bg-lavender-50 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-6">
        <span className="text-lg font-bold text-lavender-600 tracking-tight">
          🌸 Allie
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {[...navItems, ...(userRole === "ADMIN" ? adminNavItems : [])].map((item) => {
          const active = pathname.startsWith(item.href);
          const isInbox = item.href === "/notifications";
          const badge = isInbox && unreadCount > 0 ? unreadCount : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-lavender-500 text-white"
                  : "text-ink hover:bg-lavender-100"
              }`}
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                  active ? "bg-white/30 text-white" : "bg-lavender-500 text-white"
                }`}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-5 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-lavender-500 flex items-center justify-center text-white text-xs font-bold">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{userName}</p>
            <p className="text-xs text-ink-soft truncate capitalize">{userRole.toLowerCase()}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="p-1.5 rounded-lg text-ink-soft hover:bg-lavender-100 hover:text-lavender-600 transition-colors"
            >
              <LogOut size={18} strokeWidth={2} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
