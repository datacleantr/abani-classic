import Link from "next/link";

/**
 * Kampanya bannerı: lacivert + marka kırmızısı vurgu, tipografik. İndirim yüzdesi, geri sayım veya onaysız vaat yok.
 * Sağdaki rakamlar dekoratiftir ve mağazadaki gerçek paket adetlerinden gelir.
 */
export function CampaignBanner({ packQuantities }: { packQuantities: number[] }) {
  return (
    <section aria-labelledby="kampanya-baslik" className="pt-16 sm:pt-20">
      <div className="container-page">
        <div className="surface-dark relative isolate overflow-hidden bg-navy-deep">
          {/* İnce kırmızı çerçeve (dekoratif) */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-3 border border-brand-red-light/30 sm:inset-4" />

          <div className="relative grid items-center gap-10 px-7 py-12 sm:px-12 sm:py-16 lg:grid-cols-[1.3fr_1fr] lg:px-16 lg:py-20">
            <div>
              <p className="eyebrow-light">Kampanyalar</p>
              <h2
                id="kampanya-baslik"
                className="mt-4 text-[32px] font-medium uppercase leading-[1.08] tracking-[0.01em] text-ivory sm:text-[44px]"
              >
                İç giyimde <span className="text-brand-red-bright">akıllı seçimler</span>
              </h2>
              <p className="mt-5 max-w-md text-[16px] leading-relaxed text-ivory/80">
                İhtiyacına uygun ürünleri ve avantajlı paketleri keşfet.
              </p>
              <Link href="/kampanyalar" className="btn-accent mt-8 min-h-12 w-full sm:w-auto">
                Alışverişe Başla
              </Link>
            </div>

            {packQuantities.length > 0 ? (
              <div aria-hidden="true" className="hidden select-none items-end justify-end gap-5 lg:flex">
                {packQuantities.map((quantity, index) => (
                  <span
                    key={quantity}
                    className={`font-display leading-none text-ivory/10 ${
                      index === packQuantities.length - 1 ? "text-[150px]" : index === 0 ? "text-[88px]" : "text-[118px]"
                    }`}
                  >
                    {quantity}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
