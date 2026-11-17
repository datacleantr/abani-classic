import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const appUrl = process.env.APP_URL ?? "https://abaniclassic.com";

// next/font dosyaları build sırasında indirip kendi sunucumuzdan servis eder (CSP font-src 'self').
// latin-ext: Türkçe karakterler (ğ, ş, ı, İ, ç, ö, ü).
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-playfair",
});

const title = "Abani Classic — Erkek iç giyim: boxer, slip, atlet, fanila ve çorap";
const description =
  "Abani Classic, erkek iç giyimde Tutku, Jiber, Seher Yıldızı, Çift Kaplan ve Abani Classic ürünlerini bir araya getirir. Boxer, slip, atlet, fanila, termal iç giyim, çorap ve çoklu paketler.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: title,
    template: "%s | Abani Classic",
  },
  description,
  keywords: [
    "erkek iç giyim",
    "erkek boxer",
    "erkek slip",
    "erkek atlet",
    "erkek fanila",
    "termal içlik",
    "erkek çorap",
    "Abani Classic",
  ],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Abani Classic",
    title,
    description,
    images: [{ url: "/images/hero.jpg", width: 1920, height: 1280, alt: "Abani Classic erkek iç giyim" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b1526",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-ivory text-charcoal antialiased">{children}</body>
    </html>
  );
}
