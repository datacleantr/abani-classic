import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDate } from "@/lib/format";
import { getLegalDocument, legalDocuments } from "@/lib/legal";

export function generateStaticParams() {
  return Object.keys(legalDocuments).map((slug) => ({ slug }));
}

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  if (!document) return { title: "Sayfa bulunamadı" };
  return {
    title: document.title,
    description: document.description,
    alternates: { canonical: `/yasal/${slug}` },
  };
}

export default async function LegalPage({ params }: PageProps) {
  const { slug } = await params;
  const document = getLegalDocument(slug);
  if (!document) notFound();

  return (
    <div className="container-page max-w-3xl py-12">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.14em] text-muted">
        <Link href="/" className="hover:text-charcoal">Ana sayfa</Link>
        <span className="mx-2 text-line">/</span>
        <span className="text-charcoal">Yasal</span>
      </nav>
      <h1 className="mt-4 text-[32px] sm:text-[38px]">{document.title}</h1>
      <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted">
        Son güncelleme: {formatDate(document.updatedAt)}
      </p>
      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        Bu metin teknik olarak hazırlanmış bir taslaktır. Yayına almadan önce şirket bilgileri,
        ETBİS/İYS yükümlülükleri ve güncel tüketici mevzuatı kapsamında hukuk ve mali müşavir
        kontrolünden geçirilmelidir.
      </p>
      <div className="prose-legal mt-6">
        <p>{document.intro}</p>
        {document.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets?.length ? (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-line bg-white p-5 text-sm">
        <p className="font-medium">Diğer metinler</p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
          {Object.entries(legalDocuments)
            .filter(([key]) => key !== slug)
            .map(([key, doc]) => (
              <li key={key}>
                <Link href={`/yasal/${key}`} className="underline decoration-line underline-offset-2 hover:text-charcoal">
                  {doc.title}
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
