import { z } from "zod";

/**
 * Ortam değişkeni şeması. Sunucu açılışında (instrumentation.ts) bir kez doğrulanır;
 * eksik/hatalı zorunlu değer varsa uygulama anlaşılır bir hata ile durur.
 * Gizli değerler hiçbir zaman loglanmaz — yalnızca anahtar adı raporlanır.
 */
const optional = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: optional,
    DATABASE_URL: z.string().trim().min(1, "DATABASE_URL zorunludur."),
    SESSION_COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).optional(),
    PAYMENT_PROVIDER: optional,
    PAYMENT_WEBHOOK_SECRET: optional,
    BANK_TRANSFER_ACCOUNT_NAME: optional,
    BANK_TRANSFER_IBAN: optional,
    BANK_TRANSFER_BANK_NAME: optional,
    CRON_SECRET: optional,
    SHIPPING_PROVIDER: optional,
    SHIPPING_API_KEY: optional,
    RESEND_API_KEY: optional,
    EMAIL_FROM: optional,
    GOOGLE_ANALYTICS_ID: optional,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    if (!env.APP_URL || !/^https:\/\//.test(env.APP_URL)) {
      ctx.addIssue({ code: "custom", path: ["APP_URL"], message: "Üretimde https:// ile başlamalıdır." });
    }
    if (!env.CRON_SECRET || env.CRON_SECRET.length < 24) {
      ctx.addIssue({ code: "custom", path: ["CRON_SECRET"], message: "Üretimde en az 24 karakter olmalıdır." });
    }
    if (env.PAYMENT_WEBHOOK_SECRET && env.PAYMENT_WEBHOOK_SECRET.length < 24) {
      ctx.addIssue({
        code: "custom",
        path: ["PAYMENT_WEBHOOK_SECRET"],
        message: "En az 24 karakter olmalıdır.",
      });
    }
  });

export type AppEnv = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>):
  | { ok: true; env: AppEnv }
  | { ok: false; problems: string[] } {
  const result = schema.safeParse(source);
  if (result.success) return { ok: true, env: result.data };
  return {
    ok: false,
    problems: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
  };
}

export function assertEnv(): AppEnv {
  const result = parseEnv(process.env);
  if (!result.ok) {
    throw new Error(`Ortam değişkenleri geçersiz:\n- ${result.problems.join("\n- ")}`);
  }
  return result.env;
}
