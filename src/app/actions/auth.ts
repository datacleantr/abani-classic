"use server";

import { redirect } from "next/navigation";

import type { ActionResult } from "@/lib/auth";
import {
  loginAdmin,
  loginCustomer,
  logout,
  registerCustomer,
} from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/schemas";

export async function customerLoginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Form geçersiz." };
  }
  const result = await loginCustomer(parsed.data.email, parsed.data.password);
  if (!result.ok) return result;
  redirect("/hesabim");
}

export async function customerRegisterAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") ?? "",
    marketingConsent: formData.get("marketingConsent") === "on",
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Form geçersiz." };
  }
  if (parsed.data.password.length < 8) {
    return { ok: false, message: "Parola en az 8 karakter olmalı." };
  }
  const result = await registerCustomer({
    email: parsed.data.email,
    password: parsed.data.password,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    phone: parsed.data.phone || undefined,
    marketingConsent: parsed.data.marketingConsent,
  });
  if (!result.ok) return result;
  redirect("/hesabim");
}

export async function customerLogoutAction(): Promise<void> {
  await logout();
  redirect("/");
}

export async function adminLoginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Form geçersiz." };
  }
  const result = await loginAdmin(parsed.data.email, parsed.data.password);
  if (!result.ok) return result;
  redirect("/admin");
}

export async function adminLogoutAction(): Promise<void> {
  await logout();
  redirect("/admin/giris");
}
