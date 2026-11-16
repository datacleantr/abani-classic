/**
 * Görsel kullanım hakkı durumları (ADR-010).
 * - authorized: kullanım hakkı doğrulanmış (kendi çekim / lisanslı).
 * - seller_listing: satıcının kendi pazaryeri ilanından alınmış; marka sahibi kullanım
 *   hakkını beyan etmiştir (docs/OPEN_DECISIONS.md #11 kapsamında teyit edilmelidir).
 * - unknown / restricted: vitrinde ASLA gösterilmez.
 */
export const DISPLAYABLE_IMAGE_RIGHTS = ["authorized", "seller_listing"] as const;

export const IMAGE_RIGHTS_LABELS: Record<string, string> = {
  authorized: "Doğrulandı",
  seller_listing: "Satıcı ilanı",
  unknown: "Bilinmiyor",
  restricted: "Kısıtlı",
};
