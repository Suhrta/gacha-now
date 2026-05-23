import products from "../../../data/products.json";

export function generateMetadata({ params }) {
  const brandProduct = products.find((p) => p.brandSlug === params.slug);
  const brandName = brandProduct ? brandProduct.brand : decodeURIComponent(params.slug);

  return {
    title: `${brandName}のガチャガチャ新作一覧【2026年最新】| ガチャなう`,
    description: `${brandName}のカプセルトイ・ガチャガチャ新作情報を一覧でチェック。価格・種類数・発売日つき。毎日自動更新。`,
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
