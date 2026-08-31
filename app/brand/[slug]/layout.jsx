import { notFound } from "next/navigation";
import products from "../../../data/products.json";
import { isLowValueBrandPage } from "../../../lib/quality";
import { buildHubInfo, buildFaqLd, buildHubMeta } from "../../../lib/hub-info";
import { getBrandIntro } from "../../../data/character-intros";
import { hubCanonical } from "../../../data/hub-canonical";

export function generateMetadata({ params }) {
  const brandProducts = products.filter((p) => p.brandSlug === params.slug);
  const brandName = brandProducts.length > 0 ? brandProducts[0].brand : decodeURIComponent(params.slug);
  // 商品が少なすぎるブランドのハブページは薄いのでインデックスさせない
  const thin = isLowValueBrandPage(brandProducts);

  // 件数・最新の発売月・代表商品を入れた具体的なスニペットにする（lib/hub-info.js に理由）
  const meta = buildHubMeta({ name: brandName, items: brandProducts, kind: "brand" });

  return {
    title: meta ? meta.title : `${brandName}のガチャガチャ新作一覧【2026年最新】| ガチャなう`,
    description: meta
      ? meta.description
      : `${brandName}のカプセルトイ・ガチャガチャ新作情報を一覧でチェック。価格・種類数・発売日つき。毎日更新。`,
    robots: thin ? { index: false, follow: true } : { index: true, follow: true },
    // 同名の /character/ ページと商品が重複していて、そちらが勝っているIPは
    // character 側を正規ページにする（data/hub-canonical.js に実測値と判断理由）
    alternates: { canonical: hubCanonical("brand", params.slug) },
    openGraph: {
      title: `${brandName}のガチャガチャ新作一覧【2026年最新】`,
      description: `${brandName}のカプセルトイ新作情報を価格・発売日つきで一覧表示。`,
    },
  };
}

// キャラ/シリーズのハブページには専用の ItemList・BreadcrumbList があるのに
// ブランドだけ無く、ルートlayoutのサイト全体ItemList（全商品）が出ているだけだった。
// 「サンリオの一覧」ページなのに全628件を申告している状態なので、他のハブと揃える。
export default function BrandLayout({ children, params }) {
  const items = products.filter((p) => p.brandSlug === params.slug);
  // 商品0件のslugは200で「しんさくは まだ ないよ」を返しており、実質ソフト404だった。
  // /brand/[slug] は generateStaticParams を持たない＝任意の文字列でページが出るため、
  // 収集ミスで生まれたブランド（例: wp-emoji-settings… 2026-09-01）も
  // 200のまま index されていた。存在しないブランドは素直に404を返す。
  if (items.length === 0) notFound();

  const brandName = items[0].brand;

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${brandName}のガチャガチャ新作一覧`,
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
      { "@type": "ListItem", position: 2, name: brandName, item: `https://gacha-now.net/brand/${params.slug}` },
    ],
  };

  // ページに表示しているQ&Aと同じ文面を構造化データにする（lib/hub-info.js が共通の元）
  const info = buildHubInfo({ name: brandName, items, intro: getBrandIntro(params.slug) });
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
