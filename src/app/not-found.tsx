import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-6 text-center">
      <p className="font-display text-6xl tracking-[0.2em]">ABANI</p>
      <p className="mt-2 text-[9px] uppercase tracking-[0.42em] text-muted">Classic</p>
      <h1 className="mt-8 text-3xl">Aradığınız sayfayı bulamadık</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Bağlantı taşınmış veya ürün yayından kaldırılmış olabilir. Koleksiyona dönerek devam
        edebilirsiniz.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn-dark">Ana sayfa</Link>
        <Link href="/arama" className="btn-outline">Tüm ürünler</Link>
      </div>
    </div>
  );
}
