import products from "../../../data/products.json";
import { getAllReleaseMonths, getReleaseYearMonth, formatYearMonth } from "../../../lib/release";

export function generateStaticParams() {
  return getAllReleaseMonths(products).map((ym) => ({ month: ym }));
}

export function generateMetadata({ params }) {
  if (!/^\d{4}-\d{2}$/.test(params.month)) {
    return { title: "ページが見つかりません | ガチャなう" };
  }
  const label = formatYearMonth(params.month);
  const count = products.filter((p) => getReleaseYearMonth(p) === params.month).length;

  return {
    title: `${label}発売のガチャガチャ新作一覧【${count}件】| ガチャなう`,
    description: `${label}発売のカプセルトイ・ガチャガチャ新作${count}件を一覧でチェック。価格・種類数・発売週つき。毎日自動更新。`,
    alternates: { canonical: `https://gacha-now.net/release/${params.month}` },
    openGraph: {
      title: `${label}発売のガチャガチャ新作一覧【${count}件】`,
      description: `${label}発売のカプセルトイ新作情報を価格・発売週つきで一覧表示。`,
    },
  };
}

export default function ReleaseLayout({ children, params }) {
  if (!/^\d{4}-\d{2}$/.test(params.month)) return children;

  const items = products.filter((p) => getReleaseYearMonth(p) === params.month);
  const label = formatYearMonth(params.month);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${label}発売のガチャガチャ新作一覧`,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://gacha-now.net/item/${p.id}`,
      name: p.name,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      {children}
    </>
  );
}
