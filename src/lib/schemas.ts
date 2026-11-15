import { z } from "zod";

export const cartItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
});

export const checkoutSchema = z.object({
  firstName: z.string().trim().min(2, "Ad en az 2 karakter olmalı.").max(80),
  lastName: z.string().trim().min(2, "Soyad en az 2 karakter olmalı.").max(80),
  email: z.string().trim().email("Geçerli bir e-posta adresi girin.").max(200),
  phone: z
    .string()
    .trim()
    .min(10, "Telefon numarası eksik.")
    .max(20)
    .regex(/^[0-9+()\s]+$/, "Geçerli bir telefon numarası girin."),
  addressLine: z.string().trim().min(10, "Adres en az 10 karakter olmalı.").max(400),
  district: z.string().trim().min(2, "İlçe girin.").max(80),
  city: z.string().trim().min(2, "Şehir girin.").max(80),
  postalCode: z.string().trim().max(10).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  couponCode: z.string().trim().max(40).optional().or(z.literal("")),
  marketingConsent: z.boolean().default(false),
  paymentMode: z.enum(["success", "failure"]).default("success"),
  items: z.array(cartItemSchema).min(1, "Sepetiniz boş."),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin."),
  password: z.string().min(6, "Parola en az 6 karakter olmalı."),
});

export const registerSchema = loginSchema.extend({
  firstName: z.string().trim().min(2, "Ad girin.").max(80),
  lastName: z.string().trim().min(2, "Soyad girin.").max(80),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  marketingConsent: z.boolean().default(false),
});

export const productFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(3, "Ürün adı en az 3 karakter olmalı.").max(240),
  slug: z.string().trim().min(3, "Slug gerekli.").max(260),
  brandId: z.string().uuid("Marka seçin."),
  categoryId: z.string().uuid("Kategori seçin."),
  modelCode: z.string().trim().max(80).optional().or(z.literal("")),
  shortDescription: z.string().trim().max(400).optional().or(z.literal("")),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  fabric: z.string().trim().max(200).optional().or(z.literal("")),
  care: z.string().trim().max(600).optional().or(z.literal("")),
  listPrice: z.coerce.number().min(0).max(1000000),
  salePrice: z.coerce.number().min(0).max(1000000),
  status: z.enum(["draft", "review", "published", "archived"]),
});

export const stockAdjustSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(-500).max(500),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

export const returnRequestSchema = z.object({
  orderNumber: z.string().trim().min(3).max(32),
  orderItemId: z.string().uuid().optional().or(z.literal("")),
  reason: z.string().trim().min(10, "Lütfen iade nedeninizi yazın.").max(1000),
});

export const newsletterSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin."),
});
