import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn  = !!auth?.user;
      const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
      if (!isLoggedIn && !isAuthRoute) return false;
      if (isLoggedIn  &&  isAuthRoute) return Response.redirect(new URL("/dashboard", request.nextUrl));
      return true;
    },
  },
} satisfies NextAuthConfig;
