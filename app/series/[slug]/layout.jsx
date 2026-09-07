import products from "../../../data/products.json";
import { SERIES, getSeriesBySlug, filterProductsBySeries } from "../../../data/series";
import { buildHubMeta } from "../../../lib/hub-info";
import { hubCanonical } from "../../../data/hub-canonical";

export function generateStaticParams() {
  return SERIES.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }) {
  const series = getSeriesBySlug(params.slug);
  if (!series) return { title: "シリーズが見つかりません | ガチャなう" };
  const items = filterProductsBySeries(products, series);
  const count = items.length;
  // 件数・最新の発売月・代表商品を入れた具体的なスニペットにする（lib/hub-info.js に理由）。
  // description は手書きの metaDescription があればそちらを優先する（シリーズ個別に書いてある）。
  const meta = buildHubMeta({ name: series.name, items, kind: "series" });

  return {
    title: meta ? meta.title : `${series.name}の新作・全種一覧【2026年】| ガチャなう`,
    description:
      series.metaDescription ||
      (meta
        ? meta.description
        : `${series.name}のカプセルトイ・ガチャガチャ${count}件を一覧でチェック。${series.intro.slice(0, 60)}`),
    // 統合された側は正規ページを指す（data/hub-canonical.js）
    alternates: { canonical: hubCanonical("series", params.slug) },
    openGraph: {
      title: `${series.name}の新作・全種一覧【2026年】`,
      description: `${series.name}のカプセルトイ新作情報を価格・発売日つきで一覧表示。`,
    },
  };
}

// 構造化データ（ItemList / FAQPage）は page.jsx が出す。
// layout は /series/[slug]/history にも適用されるため、ここに置くと
// 歴代ページにシリーズ側の申告が混入する。
export default function SeriesLayout({ children }) {
  return children;
}
