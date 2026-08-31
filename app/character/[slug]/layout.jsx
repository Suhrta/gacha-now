import products from "../../../data/products.json";
import { CHARACTERS, getCharacterBySlug, filterProductsByCharacter } from "../../../data/characters";
import { buildHubInfo, buildFaqLd, buildHubMeta } from "../../../lib/hub-info";
import { getCharacterIntro } from "../../../data/character-intros";
import { hubCanonical } from "../../../data/hub-canonical";

export function generateStaticParams() {
  return CHARACTERS.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }) {
  const character = getCharacterBySlug(params.slug);
  if (!character) return { title: "キャラクターが見つかりません | ガチャなう" };
  const items = filterProductsByCharacter(products, character);
  const count = items.length;
  // 件数・最新の発売月・代表商品を入れた具体的なスニペットにする（lib/hub-info.js に理由）
  const meta = buildHubMeta({ name: character.name, items, kind: "character" });

  return {
    title: meta ? meta.title : `${character.name}のガチャガチャ新作・最新情報【2026年】| ガチャなう`,
    description: meta
      ? meta.description
      : `${character.name}のカプセルトイ・ガチャガチャ新作${count}件を一覧でチェック。価格・種類数・発売日つき。毎日更新。`,
    // 同名の /brand/ ページと商品が重複していて、そちらが勝っているIPは
    // brand 側を正規ページにする（data/hub-canonical.js に実測値と判断理由）
    alternates: { canonical: hubCanonical("character", params.slug) },
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

  // ページに表示しているQ&Aと同じ文面を構造化データにする（lib/hub-info.js が共通の元）
  const info = buildHubInfo({ name: character.name, items, intro: getCharacterIntro(character.slug) });
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
