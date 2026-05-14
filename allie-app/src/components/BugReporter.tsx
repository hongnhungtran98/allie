"use client";

import Script from "next/script";

declare global {
  interface Window {
    BugReporter?: {
      init: (config: { apiUrl: string; publicKey: string }) => void;
      on: () => void;
    };
  }
}

export default function BugReporter() {
  return (
    <Script
      src="https://pm.vegasoft.vn/bug-reporter.v6.js"
      strategy="afterInteractive"
      onLoad={() => {
        if (window.BugReporter != null) {
          window.BugReporter.init({
            apiUrl: "https://pm-api.vegasoft.vn/v1/bot-agents/create-bug",
            publicKey:
              "393fbcdda6f1d6b6ebed30d68337c1f3af3af0de9fbbba33214d7703ad6419dc",
          });
          window.BugReporter.on();
        }
      }}
    />
  );
}
