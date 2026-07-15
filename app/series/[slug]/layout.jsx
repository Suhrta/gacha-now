import products from "../../../data/products.json";
import { SERIES, getSeriesBySlug, filterProductsBySeries } from "../../../data/series";
import { buildHubInfo, buildFaqLd } from "../../../lib/hub-info";

export function generateStaticParams() {
  return SERIES.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }) {
  const series = getSeriesBySlug(params.slug);
  if (!series) return { title: "シリーズが見つかりません | ガチャなう" };
  const count = filterProductsBySeries(products, series).length;

  return {
    title: `${series.name}の新作・全種一覧【2026年】| ガチャなう`,
    description: series.metaDescription || `${series.name}のカプセルトイ・ガチャガチャ${count}件を一覧でチェック。${series.intro.slice(0, 60)}`,
    alternates: { canonical: `https://gacha-now.net/series/${params.slug}` },
    openGraph: {
      title: `${series.name}の新作・全種一覧【2026年】`,
      description: `${series.name}のカプセルトイ新作情報を価格・発売日つきで一覧表示。`,
    },
  };
}

export default function SeriesLayout({ children, params }) {
  const series = getSeriesBySlug(params.slug);
  if (!series) return children;

  const items = filterProductsBySeries(products, series);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${series.name}の新作一覧`,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://gacha-now.net/item/${p.id}`,
      name: p.name,
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: "https://gacha-now.net" },
      { "@type": "ListItem", position: 2, name: "シリーズ特集", item: "https://gacha-now.net/series" },
      { "@type": "ListItem", position: 3, name: series.name, item: `https://gacha-now.net/series/${series.slug}` },
    ],
  };

  // ページに表示しているQ&Aと同じ文面を構造化データにする（lib/hub-info.js が共通の元）
  const info = buildHubInfo({ name: series.name, items });
  const faqLd = info ? buildFaqLd(info.faq) : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
      {children}
    </>
  );
}
