import products from "../../../data/products.json";
import { isLowValueBrandPage } from "../../../lib/quality";

export function generateMetadata({ params }) {
  const brandProducts = products.filter((p) => p.brandSlug === params.slug);
  const brandName = brandProducts.length > 0 ? brandProducts[0].brand : decodeURIComponent(params.slug);
  // 商品が少なすぎるブランドのハブページは薄いのでインデックスさせない
  const thin = isLowValueBrandPage(brandProducts);

  return {
    title: `${brandName}のガチャガチャ新作一覧【2026年最新】| ガチャなう`,
    description: `${brandName}のカプセルトイ・ガチャガチャ新作情報を一覧でチェック。価格・種類数・発売日つき。毎日更新。`,
    robots: thin ? { index: false, follow: true } : { index: true, follow: true },
    alternates: { canonical: `https://gacha-now.net/brand/${params.slug}` },
    openGraph: {
      title: `${brandName}のガチャガチャ新作一覧【2026年最新】`,
      description: `${brandName}のカプセルトイ新作情報を価格・発売日つきで一覧表示。`,
    },
  };
}

export default function BrandLayout({ children }) {
  return children;
}
