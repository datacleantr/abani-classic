import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const appUrl = process.env.APP_URL ?? "https://abaniclassic.com";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Abani Classic — İç giyim, atlet ve çorap",
    template: "%s | Abani Classic",
  },
  description:
    "Uzun elyaf pamuk, ölçülü kalıplar ve sade renkler. Abani Classic erkek iç giyim koleksiyonunu keşfedin.",
  keywords: ["erkek boxer", "erkek slip", "erkek atlet", "erkek çorap", "termal içlik", "Abani Classic"],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Abani Classic",
    title: "Abani Classic — İç giyim, atlet ve çorap",
    description: "Uzun elyaf pamuk, ölçülü kalıplar ve sade renkler.",
    images: [{ url: "/images/hero.jpg", width: 1200, height: 630, alt: "Abani Classic koleksiyonu" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#171717",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-ivory text-charcoal antialiased">{children}</body>
    </html>
  );
}
