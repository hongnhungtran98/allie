"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function AccessLogger() {
  const pathname = usePathname();
  const lastLogged = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastLogged.current === pathname) return;
    lastLogged.current = pathname;

    fetch("/api/access-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
