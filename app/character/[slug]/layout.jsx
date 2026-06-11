import products from "../../../data/products.json";
import { CHARACTERS, getCharacterBySlug, filterProductsByCharacter } from "../../../data/characters";

export function generateStaticParams() {
  return CHARACTERS.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }) {
  const character = getCharacterBySlug(params.slug);
  if (!character) return { title: "キャラクターが見つかりません | ガチャなう" };
  const count = filterProductsByCharacter(products, character).length;

  return {
    title: `${character.name}のガチャガチャ新作・最新情報【2026年】| ガチャなう`,
    description: `${character.name}のカプセルトイ・ガチャガチャ新作${count}件を一覧でチェック。価格・種類数・発売日つき。毎日自動更新。`,
    alternates: { canonical: `https://gacha-now.net/character/${params.slug}` },
    openGraph: {
      title: `${character.name}のガチャガチャ新作・最新情報【2026年】`,
      description: `${character.name}のカプセルトイ新作情報を価格・発売日つきで一覧表示。`,
    },
  };
}

export default function CharacterLayout({ children, params }) {
  const character = getCharacterBySlug(params.slug);
  if (!character) return children;

  const items = filterProductsByCharacter(products, character);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${character.name}のガチャガチャ新作一覧`,
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
      { "@type": "ListItem", position: 2, name: character.name, item: `https://gacha-now.net/character/${character.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {children}
    </>
  );
}
