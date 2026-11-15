"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  inventory,
  productVariants,
  products,
  reviews,
  stockMovements,
} from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import {
  canIssueRefund,
  canManageCatalog,
  canManageImports,
  canManageInventory,
  canManageOrders,
  requireAdmin,
  type ActionResult,
} from "@/lib/auth";
import { slugifyTr } from "@/lib/format";
import {
  analyzeImport,
  applyImportBatch,
  linkImportItemToProduct,
  markImportItemAsNew,
} from "@/lib/imports";
import { transitionOrder } from "@/lib/orders";
import { productFormSchema } from "@/lib/schemas";

export type AdminActionResult = ActionResult & { productId?: string; batchId?: string };

function fail(message: string): AdminActionResult {
  return { ok: false, message };
}

export async function saveProductAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!canManageCatalog(admin.role)) {
    return fail("Bu işlem için katalog yetkiniz yok.");
  }

  const parsed = productFormSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug"),
    brandId: formData.get("brandId"),
    categoryId: formData.get("categoryId"),
    modelCode: formData.get("modelCode") ?? "",
    shortDescription: formData.get("shortDescription") ?? "",
    description: formData.get("description") ?? "",
    fabric: formData.get("fabric") ?? "",
    care: formData.get("care") ?? "",
    listPrice: formData.get("listPrice"),
    salePrice: formData.get("salePrice"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Form geçersiz.");
  }
  const data = parsed.data;

  let status = data.status;
  if (status === "published" && !["super_admin", "catalog_manager"].includes(admin.role)) {
    status = "review";
  }

  const listPrice = Math.round(data.listPrice * 100);
  const salePrice = Math.round(data.salePrice * 100);
  if (salePrice <= 0) return fail("Satış fiyatı sıfırdan büyük olmalı.");
  if (salePrice > listPrice * 1.5) return fail("Satış fiyatı liste fiyatıyla tutarsız.");

  const baseSlug = slugifyTr(data.slug || data.name) || `urun-${Date.now()}`;
  let slug = baseSlug;

  try {
    if (data.id) {
      const duplicate = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1);
      if (duplicate[0] && duplicate[0].id !== data.id) slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

      await db
        .update(products)
        .set({
          name: data.name,
          slug,
          brandId: data.brandId,
          categoryId: data.categoryId,
          modelCode: data.modelCode || null,
          shortDescription: data.shortDescription || null,
          description: data.description || null,
          fabric: data.fabric || null,
          care: data.care || null,
          listPrice,
          salePrice,
          status,
          updatedAt: new Date(),
          publishedAt: status === "published" ? new Date() : null,
        })
        .where(eq(products.id, data.id));

      await writeAudit({
        actorType: "admin",
        actorEmail: admin.email,
        action: "product.updated",
        entityType: "product",
        entityId: data.id,
        summary: `${data.name} güncellendi (${status}).`,
        metadata: { salePrice, listPrice },
      });
      revalidatePath("/admin/urunler");
      revalidatePath(`/admin/urunler/${data.id}`);
      revalidatePath("/");
      return { ok: true, message: "Ürün güncellendi.", productId: data.id };
    }

    const existing = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
    if (existing[0]) slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const [created] = await db
      .insert(products)
      .values({
        name: data.name,
        slug,
        brandId: data.brandId,
        categoryId: data.categoryId,
        modelCode: data.modelCode || null,
        shortDescription: data.shortDescription || null,
        description: data.description || null,
        fabric: data.fabric || null,
        care: data.care || null,
        listPrice,
        salePrice,
        status,
        sourceKey: "own",
        publishedAt: status === "published" ? new Date() : null,
      })
      .returning();

    const sizesRaw = String(formData.get("sizes") ?? "");
    const colorsRaw = String(formData.get("colors") ?? "");
    const sizes = sizesRaw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 8);
    const colors = colorsRaw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 6);

    const sizeList = sizes.length > 0 ? sizes : ["Standart"];
    const colorList = colors.length > 0 ? colors : ["Standart"];
    let counter = 0;
    for (const color of colorList) {
      for (const size of sizeList) {
        counter += 1;
        const [variant] = await db
          .insert(productVariants)
          .values({
            productId: created.id,
            sku: `AC-${created.id.slice(0, 4).toUpperCase()}-${color.slice(0, 3).toUpperCase()}-${size}-${counter}`,
            size,
            color,
          })
          .returning();
        await db.insert(inventory).values({ variantId: variant.id, onHand: 0, reserved: 0 });
      }
    }

    await writeAudit({
      actorType: "admin",
      actorEmail: admin.email,
      action: "product.created",
      entityType: "product",
      entityId: created.id,
      summary: `${data.name} oluşturuldu (${status}).`,
      metadata: { variants: counter },
    });

    revalidatePath("/admin/urunler");
    return {
      ok: true,
      message: `Ürün oluşturuldu. ${counter} varyant taslak olarak eklendi; stok girişi yapın.`,
      productId: created.id,
    };
  } catch {
    return fail("Ürün kaydedilemedi. Lütfen bilgileri kontrol edin.");
  }
}

export async function addVariantAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!canManageCatalog(admin.role)) return fail("Katalog yetkiniz yok.");

  const productId = String(formData.get("productId") ?? "");
  const size = String(formData.get("size") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const barcode = String(formData.get("barcode") ?? "").trim();
  const initialStock = Number.parseInt(String(formData.get("initialStock") ?? "0"), 10);

  if (!productId || !size || !color) return fail("Beden ve renk zorunludur.");

  try {
    const [variant] = await db
      .insert(productVariants)
      .values({
        productId,
        sku: `AC-${productId.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-6)}`,
        barcode: barcode || null,
        size,
        color,
      })
      .returning();

    const onHand = Number.isFinite(initialStock) && initialStock > 0 ? initialStock : 0;
    await db.insert(inventory).values({ variantId: variant.id, onHand, reserved: 0 });
    if (onHand > 0) {
      await db.insert(stockMovements).values({
        variantId: variant.id,
        type: "initial_stock",
        quantity: onHand,
        reference: "admin",
        actor: admin.email,
        note: "Yeni varyant açılış stoğu",
      });
    }

    await writeAudit({
      actorType: "admin",
      actorEmail: admin.email,
      action: "variant.created",
      entityType: "product",
      entityId: productId,
      summary: `${color} / ${size} varyantı eklendi.`,
    });
    revalidatePath(`/admin/urunler/${productId}`);
    return { ok: true, message: "Varyant eklendi." };
  } catch {
    return fail("Varyant eklenemedi (SKU veya barkod tekrar ediyor olabilir).");
  }
}

export async function adjustStockAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!canManageInventory(admin.role)) return fail("Stok yetkiniz yok.");

  const variantId = String(formData.get("variantId") ?? "");
  const quantity = Number.parseInt(String(formData.get("quantity") ?? "0"), 10);
  const note = String(formData.get("note") ?? "");
  if (!variantId || !Number.isFinite(quantity) || quantity === 0) {
    return fail("Geçerli bir miktar girin.");
  }

  const rows = await db
    .select({ id: inventory.id, onHand: inventory.onHand })
    .from(inventory)
    .where(eq(inventory.variantId, variantId))
    .limit(1);
  if (!rows[0]) return fail("Stok kaydı bulunamadı.");
  if (rows[0].onHand + quantity < 0) return fail("Stok negatife düşemez.");

  await db
    .update(inventory)
    .set({ onHand: sql`${inventory.onHand} + ${quantity}`, updatedAt: new Date() })
    .where(eq(inventory.variantId, variantId));
  await db.insert(stockMovements).values({
    variantId,
    type: quantity > 0 ? "adjustment_in" : "adjustment_out",
    quantity,
    reference: "admin-adjustment",
    actor: admin.email,
    note: note || "Manuel stok düzeltmesi",
  });

  await writeAudit({
    actorType: "admin",
    actorEmail: admin.email,
    action: "inventory.adjusted",
    entityType: "variant",
    entityId: variantId,
    summary: `Stok ${quantity > 0 ? "+" : ""}${quantity} olarak düzeltildi.`,
    metadata: { note },
  });

  revalidatePath("/admin/stok");
  revalidatePath("/admin");
  revalidatePath("/admin/urunler");
  return { ok: true, message: `Stok güncellendi (${quantity > 0 ? "+" : ""}${quantity}).` };
}

export async function transitionOrderAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!canManageOrders(admin.role)) return fail("Sipariş yetkiniz yok.");

  const orderId = String(formData.get("orderId") ?? "");
  const toStatus = String(formData.get("toStatus") ?? "");
  const note = String(formData.get("note") ?? "");
  const trackingNumber = String(formData.get("trackingNumber") ?? "");
  const carrier = String(formData.get("carrier") ?? "");

  if (!orderId || !toStatus) return fail("Durum seçin.");
  if (["refunded", "partially_refunded"].includes(toStatus) && !canIssueRefund(admin.role)) {
    return fail("İade işlemi için yetkiniz yok.");
  }

  const result = await transitionOrder({
    orderId,
    toStatus,
    actorEmail: admin.email,
    note,
    trackingNumber: trackingNumber || undefined,
    carrier: carrier || undefined,
  });

  if (result.ok) {
    revalidatePath("/admin/siparisler");
    revalidatePath("/admin");
    revalidatePath("/hesabim");
  }
  return { ok: result.ok, message: result.message };
}

export async function resolveImportItemAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!canManageImports(admin.role)) return fail("İçe aktarım yetkiniz yok.");

  const itemId = String(formData.get("itemId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!itemId) return fail("Satır bulunamadı.");

  if (decision === "new") {
    const result = await markImportItemAsNew({ itemId, actorEmail: admin.email });
    revalidatePath(`/admin/ice-aktarim/${String(formData.get("batchId") ?? "")}`);
    return { ok: result.ok, message: result.message };
  }

  const productId = String(formData.get("productId") ?? "");
  if (!productId) return fail("Eşleştirilecek ürünü seçin.");
  const result = await linkImportItemToProduct({ itemId, productId, actorEmail: admin.email });
  revalidatePath(`/admin/ice-aktarim/${String(formData.get("batchId") ?? "")}`);
  return { ok: result.ok, message: result.message };
}

export async function uploadImportAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!canManageImports(admin.role)) return fail("İçe aktarım yetkiniz yok.");

  const file = formData.get("file");
  const sourceKey = String(formData.get("sourceKey") ?? "own");

  if (!(file instanceof File) || file.size === 0) return fail("CSV dosyası seçin.");
  if (file.size > 2 * 1024 * 1024) return fail("Dosya 2 MB sınırını aşıyor.");
  if (!/\.(csv|txt)$/i.test(file.name)) {
    return fail("Yalnızca CSV dosyaları işlenir. XLSX dosyalarını CSV olarak dışa aktarın.");
  }

  const content = await file.text();
  const result = await analyzeImport({
    sourceKey,
    fileName: file.name,
    content,
    createdBy: admin.email,
  });

  if (!result.ok) return fail(result.message);

  revalidatePath("/admin/ice-aktarim");
  return {
    ok: true,
    message: `Dry-run tamamlandı: ${result.analysis.validRows} geçerli, ${result.analysis.errorRows} hatalı satır.${
      result.analysis.duplicateFile ? " Bu dosya daha önce yüklenmiş." : ""
    }`,
    batchId: result.analysis.batchId,
  };
}

export async function applyImportAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!canManageImports(admin.role)) return fail("İçe aktarım yetkiniz yok.");

  const batchId = String(formData.get("batchId") ?? "");
  if (!batchId) return fail("Paket bulunamadı.");

  const result = await applyImportBatch(batchId, admin.email);
  revalidatePath(`/admin/ice-aktarim/${batchId}`);
  revalidatePath("/admin/ice-aktarim");
  revalidatePath("/admin/urunler");
  return { ok: result.ok, message: result.message };
}

export async function toggleReviewAction(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!canManageCatalog(admin.role)) return fail("Yorum moderasyonu için yetkiniz yok.");

  const reviewId = String(formData.get("reviewId") ?? "");
  const nextState = formData.get("nextState") === "1";

  await db.update(reviews).set({ isApproved: nextState }).where(eq(reviews.id, reviewId));
  await writeAudit({
    actorType: "admin",
    actorEmail: admin.email,
    action: nextState ? "review.approved" : "review.unpublished",
    entityType: "review",
    entityId: reviewId,
    summary: nextState ? "Yorum yayınlandı." : "Yorum yayından kaldırıldı.",
  });
  revalidatePath("/admin/yorumlar");
  revalidatePath("/");
  return { ok: true, message: nextState ? "Yorum yayınlandı." : "Yorum yayından kaldırıldı." };
}
