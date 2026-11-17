"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { customerLoginAction, customerRegisterAction } from "@/app/actions/auth";
import type { ActionResult } from "@/lib/auth";

export function AuthPanel() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginAction, loginPending] = useActionState<ActionResult | null, FormData>(
    customerLoginAction,
    null,
  );
  const [registerState, registerAction, registerPending] = useActionState<ActionResult | null, FormData>(
    customerRegisterAction,
    null,
  );
  const state = mode === "login" ? loginState : registerState;

  return (
    <div className="mx-auto max-w-md">
      <div className="flex rounded-full border border-line bg-white p-1 text-xs">
        <button
          type="button"
          onClick={() => setMode("login")}
          aria-pressed={mode === "login"}
          className={`flex-1 rounded-full px-4 py-2 uppercase tracking-[0.12em] ${
            mode === "login" ? "bg-charcoal text-ivory" : "text-muted"
          }`}
        >
          Giriş yap
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          aria-pressed={mode === "register"}
          className={`flex-1 rounded-full px-4 py-2 uppercase tracking-[0.12em] ${
            mode === "register" ? "bg-charcoal text-ivory" : "text-muted"
          }`}
        >
          Hesap oluştur
        </button>
      </div>

      {mode === "login" ? (
        <form action={loginAction} className="mt-6 space-y-3 rounded-2xl border border-line bg-white p-6">
          <div>
            <label htmlFor="login-email" className="field-label">E-posta</label>
            <input id="login-email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <div>
            <label htmlFor="login-password" className="field-label">Parola</label>
            <input id="login-password" name="password" type="password" autoComplete="current-password" required className="input" />
          </div>
          <button type="submit" disabled={loginPending} className="btn-dark w-full">
            {loginPending ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
          {state && !state.ok ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {state.message}
            </p>
          ) : null}
        </form>
      ) : (
        <form action={registerAction} className="mt-6 space-y-3 rounded-2xl border border-line bg-white p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="register-first" className="field-label">Ad</label>
              <input id="register-first" name="firstName" autoComplete="given-name" required className="input" />
            </div>
            <div>
              <label htmlFor="register-last" className="field-label">Soyad</label>
              <input id="register-last" name="lastName" autoComplete="family-name" required className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="register-email" className="field-label">E-posta</label>
            <input id="register-email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <div>
            <label htmlFor="register-phone" className="field-label">Telefon</label>
            <input id="register-phone" name="phone" type="tel" autoComplete="tel" className="input" />
          </div>
          <div>
            <label htmlFor="register-password" className="field-label">Parola</label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="input"
            />
            <p className="mt-1 text-[11px] text-muted">En az 8 karakter. Parolalar scrypt ile hashlenir.</p>
          </div>
          <label className="flex items-start gap-2 text-[11px] text-muted">
            <input type="checkbox" name="marketingConsent" className="mt-0.5 h-4 w-4 rounded border-line" />
            Kampanya ve yeni seçki bildirimleri almak istiyorum. (Opsiyonel, sipariş için gerekli değildir.)
          </label>
          <button type="submit" disabled={registerPending} className="btn-dark w-full">
            {registerPending ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
          </button>
          {state && !state.ok ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {state.message}
            </p>
          ) : null}
        </form>
      )}

      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
        Üyelik için{" "}
        <Link href="/yasal/kvkk" className="underline decoration-line underline-offset-2">KVKK aydınlatma metnini</Link>{" "}
        inceleyebilirsiniz. Pazarlama izni sipariş işleminden ayrı tutulur.
      </p>
    </div>
  );
}
