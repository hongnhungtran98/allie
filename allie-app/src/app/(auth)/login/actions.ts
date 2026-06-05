"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export async function logoutAction() {
  await signOut({ redirect: false });
  redirect("/login");
}

export async function loginAction(_prev: unknown, formData: FormData) {
  try {
    await signIn("credentials", {
      identifier: formData.get("identifier"),
      password:   formData.get("password"),
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Email hoặc mật khẩu không đúng." };
    }
    throw e;
  }
  redirect("/dashboard");
}
