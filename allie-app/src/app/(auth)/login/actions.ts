"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export async function loginAction(_prev: unknown, formData: FormData) {
  try {
    await signIn("credentials", {
      email:    formData.get("email"),
      password: formData.get("password"),
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
