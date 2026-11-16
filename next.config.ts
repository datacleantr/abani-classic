import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Next.js çalışma zamanı satır içi betik kullandığı için script-src 'unsafe-inline' içerir.
// Nonce tabanlı sıkı CSP, analitik/ödeme betikleri netleşince ele alınmalıdır (docs/GAP_REPORT.md).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // img.pzrmcdn.com: Pazarama ilan görselleri geçici olarak kaynak adresinden gösterilir
  // (docs/OPEN_DECISIONS.md #11). Kendi görselleriniz yüklendiğinde bu kaynak kaldırılmalıdır.
  "img-src 'self' data: blob: https://img.pzrmcdn.com",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
