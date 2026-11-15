import type { MetadataRoute } from "next";

const baseUrl = process.env.APP_URL ?? "https://abaniclassic.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/sepet", "/odeme", "/hesabim", "/siparis/", "/giris"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
