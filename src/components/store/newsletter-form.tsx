"use client";

import { useActionState } from "react";

import { subscribeNewsletterAction } from "@/app/actions/store";
import type { ActionResult } from "@/lib/auth";

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    subscribeNewsletterAction,
    null,
  );

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
      <label htmlFor="newsletter-email" className="sr-only">
        E-posta adresi
      </label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        required
        placeholder="E-posta adresiniz"
        className="input border-white/20 bg-white/10 text-ivory placeholder:text-ivory/50 focus:border-brand-red-light"
      />
      <button type="submit" disabled={pending} className="btn-accent shrink-0">
        {pending ? "Kaydediliyor" : "Katıl"}
      </button>
      <p aria-live="polite" className="text-[11px] text-ivory/80 sm:sr-only">
        {state?.message ?? ""}
      </p>
      {state ? (
        <p
          role="status"
          className={`text-xs sm:hidden ${state.ok ? "text-ivory/80" : "text-brand-red-light"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
