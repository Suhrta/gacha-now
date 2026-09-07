import products from "../../../data/products.json";
import retired from "../../../data/retired-items.json";
import { getSeriesBySlug, filterProductsBySeries } from "../../../data/series";
import { buildHubInfo, buildFaqLd } from "../../../lib/hub-info";
import { buildSeriesHistory } from "../../../lib/series-history";
import SeriesDetail from "../../../components/SeriesDetail";

// 構造化データはここ（サーバー側）で出す。
// layout.jsx に置くと /series/[slug]/history にも同じものが付いてしまい、
// 歴代ページが「掲載中商品のItemList」と「シリーズページを現在地とするパンくず」を
// 申告することになる。パンくずは components/Breadcrumb が表示と同時に出すので
// ここでは重複させない（layout にあった breadcrumbLd はそれと二重だった）。
export default function SeriesPage({ params }) {
  const series = getSeriesBySlug(params.slug);
  if (!series) return <SeriesDetail />;

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

  // ページに表示しているQ&Aと同じ文面を構造化データにする（lib/hub-info.js が共通の元）
  const info = buildHubInfo({ name: series.name, items, intro: series.intro });
  const faqLd = info ? buildFaqLd(info.faq) : null;

  const history = series.history
    ? buildSeriesHistory({ series, products, retired })
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
      <SeriesDetail historyTotal={history ? history.total : null} />
    </>
  );
}
