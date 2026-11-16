/**
 * Ödeme yöntemi çözümleyici.
 *
 * - `sandbox`: yalnızca geliştirme/önizleme. Üretimde ASLA etkinleşmez; aksi halde
 *   ödeme alınmadan sipariş "ödendi" yapılabilirdi.
 * - `bank_transfer`: havale/EFT. Sipariş "ödeme bekleniyor" kalır, yetkili yönetici
 *   tahsilatı banka hesabında doğruladıktan sonra panelden onaylar.
 * - Kart sağlayıcıları (iyzico / PayTR / Param): sözleşme ve resmi API dokümanı
 *   gelmeden adapter yazılmaz; seçilirse checkout açıkça "yapılandırılmadı" der.
 */
export type PaymentMethod = "sandbox" | "bank_transfer";

export type PaymentConfig =
  | { ok: true; method: PaymentMethod; reservationMinutes: number }
  | { ok: false; message: string };

const SANDBOX_RESERVATION_MINUTES = 30;
const BANK_TRANSFER_RESERVATION_MINUTES = 3 * 24 * 60;

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview";
}

export function getPaymentConfig(): PaymentConfig {
  const configured = (process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();

  if (configured === "bank_transfer") {
    if (!getBankTransferDetails()) {
      return { ok: false, message: "Havale/EFT hesap bilgileri tanımlı değil." };
    }
    return { ok: true, method: "bank_transfer", reservationMinutes: BANK_TRANSFER_RESERVATION_MINUTES };
  }

  if (configured === "" || configured === "sandbox") {
    if (isProduction()) {
      return {
        ok: false,
        message: "Çevrimiçi ödeme henüz etkin değil. Lütfen daha sonra tekrar deneyin.",
      };
    }
    return { ok: true, method: "sandbox", reservationMinutes: SANDBOX_RESERVATION_MINUTES };
  }

  return {
    ok: false,
    message: "Seçilen ödeme sağlayıcısı için entegrasyon henüz tamamlanmadı.",
  };
}

export function isSandboxEnabled(): boolean {
  const config = getPaymentConfig();
  return config.ok && config.method === "sandbox";
}

export type BankTransferDetails = { accountName: string; iban: string; bankName: string | null };

export function getBankTransferDetails(): BankTransferDetails | null {
  const accountName = process.env.BANK_TRANSFER_ACCOUNT_NAME?.trim();
  const iban = process.env.BANK_TRANSFER_IBAN?.replace(/\s+/g, "").toUpperCase();
  if (!accountName || !iban || !/^TR\d{24}$/.test(iban)) return null;
  return { accountName, iban, bankName: process.env.BANK_TRANSFER_BANK_NAME?.trim() || null };
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  sandbox: "Test ödemesi (sandbox)",
  bank_transfer: "Havale / EFT",
  mockpay: "Test ödemesi (sandbox)",
};
