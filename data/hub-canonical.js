// 同じIPで /brand/ と /character/ の両方が存在するハブの正規化先。
//
// 【何が起きていたか】
// data/characters.js の25キャラのうち20キャラは、同名の /brand/ ページと
// 掲載商品がほぼ完全に一致している（例: たまごっち 14件 vs 14件、ちいかわ 5件 vs 5件）。
// 同じ「◯◯ ガチャガチャ 最新」で2ページが競合し、どちらも8〜10位から抜けられていない。
//
// GSC実測（2026-08-31・直近28日）:
//   /character/ 全23ページ  179clk / 11,031imp / CTR 1.6% / 平均9.9位
//   /brand/     全186ページ 1,073clk / 44,946imp / CTR 2.4% / 平均9.0位
//
// 【一括で寄せてはいけない】
// [[character-brand-duplication]] の通り、勝つ側はIPごとに違う。実測では約半々に割れた。
// そこでIP単位で「実際に勝っている方」を正規化先にし、負けている方から
// rel=canonical を張ってシグナルを1ページに集約する。
// noindex は使わない（ページごと落としてしまい、評価が移らないため）。
//
// 判定基準: 掲載商品がほぼ同一で、かつ片方のクリックが3倍以上あること。
// 差が小さいペア（sanrio 8対7、precure 14対13、conan 2対1 など）は動かさない。
// precure は brand が 6.9位・character が 9.8位と順位だけ逆転しているので保留。

// /character/{slug} → 正規化先URL（brandが勝っている）
export const CHARACTER_CANONICAL = {
  // char 3clk/85imp  vs  brand 107clk/3,448imp
  pokemon: "/brand/pokemon",
  // char 5clk/122imp  vs  brand 110clk/3,444imp
  disney: "/brand/disney",
  // char 23clk/684imp  vs  brand 69clk/5,458imp
  chiikawa: "/brand/chiikawa",
  // char 0clk/176imp  vs  brand 31clk/3,177imp
  spongebob: "/brand/spongebob",
  // char 0clk/148imp  vs  brand 20clk/1,802imp
  "crayon-shinchan": "/brand/shinchan",
  // char 2clk/274imp  vs  brand 15clk/1,573imp
  obungu: "/brand/obungu",
};

// /brand/{slug} → 正規化先URL（characterが勝っている）
export const BRAND_CANONICAL = {
  // brand 3clk/168imp  vs  char 21clk/1,887imp
  tamagotchi: "/character/tamagotchi",
  // brand 8clk/138imp  vs  char 18clk/1,123imp
  moomin: "/character/moomin",
  // brand 2clk/46imp  vs  char 22clk/1,331imp
  hololive: "/character/hololive",
  // brand 1clk/67imp  vs  char 6clk/557imp
  gundam: "/character/gundam",
  // brand 0clk/81imp  vs  char 10clk/653imp
  onepiece: "/character/one-piece",
  // brand 0clk/0imp  vs  char 6clk/479imp
  kirby: "/character/kirby",
};

const ORIGIN = "https://gacha-now.net";

/** ハブページの canonical URL。統合先が無ければ自分自身。 */
export function hubCanonical(kind, slug) {
  const map = kind === "character" ? CHARACTER_CANONICAL : BRAND_CANONICAL;
  const target = map[slug];
  return target ? `${ORIGIN}${target}` : `${ORIGIN}/${kind}/${slug}`;
}

/** 統合される側（自分が正規ページでない）かどうか */
export function isConsolidated(kind, slug) {
  const map = kind === "character" ? CHARACTER_CANONICAL : BRAND_CANONICAL;
  return Boolean(map[slug]);
}
