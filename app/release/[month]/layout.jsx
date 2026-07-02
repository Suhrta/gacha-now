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
  // 掲載が少ない月（先の月など）は「【3件】」等がSERPで内容の薄さに見えCTRを下げる。
  // 十分な件数がある時だけ件数を出し、少数時は更新性を訴求する。
  const countTag = count >= 10 ? `【${count}件】` : "【毎日更新】";
  const descText =
    count >= 10
      ? `${label}発売のカプセルトイ・ガチャガチャ新作${count}件を一覧でチェック。価格・種類数・発売週つき。毎日更新。`
      : `${label}発売のカプセルトイ・ガチャガチャ新作情報を毎日更新でお届け。価格・種類数・発売週つきで随時追加中。`;

  return {
    title: `${label}発売のガチャガチャ新作一覧${countTag}| ガチャなう`,
    description: descText,
    alternates: { canonical: `https://gacha-now.net/release/${params.month}` },
    openGraph: {
      title: `${label}発売のガチャガチャ新作一覧${countTag}`,
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
