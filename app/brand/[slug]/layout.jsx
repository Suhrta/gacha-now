export function generateMetadata({ params }) {
  const brandName = decodeURIComponent(params.slug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  return {
    title: `${brandName}のガチャガチャ新作一覧【2026年最新】| ガチャなう`,
    description: `${brandName}のカプセルトイ・ガチャガチャ新作情報を一覧でチェック。価格・種類数・発売日つき。毎日自動更新。`,
    openGraph: {
      title: `${brandName}のガチャガチャ新作一覧【2026年最新】`,
      description: `${brandName}のカプセルトイ新作情報を価格・発売日つきで一覧表示。`,
    },
  };
}

export default function BrandLayout({ children }) {
  return children;
}
