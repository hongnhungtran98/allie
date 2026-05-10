"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

const initialState = { error: "" };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-border p-8">
      <h2 className="text-lg font-semibold text-ink mb-6">Sign in</h2>

      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Email
          </label>
          <input
            name="email"
            type="text"
            placeholder="you@company.com"
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Password
          </label>
          <input
            name="password"
            type="password"
            placeholder="••••••••"
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:border-transparent transition"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-500">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-lavender-500 hover:bg-lavender-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm mt-2"
        >
          {pending ? "Đang đăng nhập..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
