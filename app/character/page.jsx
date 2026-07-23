import Link from "next/link";
import products from "../../data/products.json";
import { CHARACTERS, filterProductsByCharacter } from "../../data/characters";

export const metadata = {
  title: "ガチャガチャ キャラクター・テーマ一覧｜サンリオ・ポケモン・ちいかわ ほか | ガチャなう",
  description:
    "サンリオ・ポケモン・ディズニー・ちいかわ・ねこなど、ガチャガチャ（カプセルトイ）をキャラクターやテーマから探せる一覧です。推しキャラの新作・発売中の商品をまとめてチェックできます。",
  alternates: { canonical: "https://gacha-now.net/character" },
};

export default function CharacterIndexPage() {
  const list = CHARACTERS.map((c) => ({
    ...c,
    count: filterProductsByCharacter(products, c).length,
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <Link href="/" className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
        ← トップにもどる
      </Link>

      <div className="mt-6 text-center">
        <h1 className="font-pixel text-[14px] text-brand-accent">🔎 キャラ・テーマから探す</h1>
        <p className="font-pixel text-[10px] text-brand-sub mt-2 tracking-[1px]">
          ぜんぶで {list.length} テーマ
        </p>
      </div>

      <p className="text-xs text-brand-text leading-relaxed mt-6 mb-5">
        ガチャガチャは<strong className="font-bold">推しキャラで探すのが一番の近道</strong>です。サンリオやポケモンのような定番から、「ねこ」「食べ物」といったテーマまで、気になるものから最新作を確認できます。
      </p>

      <div className="flex flex-wrap gap-2">
        {list.map((c) => (
          <Link
            key={c.slug}
            href={`/character/${c.slug}`}
            className="px-3 py-2 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
          >
            #{c.name}
            <span className="text-[10px] text-brand-sub ml-1.5">{c.count}</span>
          </Link>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-brand-accent text-white font-pixel text-[11px] rounded-lg no-underline"
          style={{ boxShadow: "0 3px 0 #C5534D, 0 4px 12px #E8756D33" }}
        >
          ← トップにもどる
        </Link>
      </div>
    </div>
  );
}
