// 食玩（バンダイ キャンディ）の表示ロジック。
//
// ガチャ（data/products.json）とは別データにしている。理由:
//   1. ガチャの一覧・ブランド・シリーズに食玩が混ざると、「ガチャガチャ 最新」で
//      来た人にウエハースが出る
//   2. products.json の肥大化は過去に本番デプロイを落としている
//      （2026-09-01、opengraph-image が Edge Function の1MB上限を超過）
//   3. 退役サイクルが違う。ガチャは収集から3ヶ月で消すが、食玩は発売日基準
//
// 共通化しているのは lib/affiliate.js（計測ID）と lib/quality.js の考え方。

// 発売日の形は collect-shokugan.js が正規化済み:
//   releaseYm  "2026-10" / releaseDay 5 or null / releaseKind "sale" | "ship"
// 先の月ほど日が確定していない（実測: 10月は41件中39件が確定、11月は44件中6件）。

export function releaseLabel(item) {
  if (!item.releaseYm) return "発売時期未定";
  const [y, m] = item.releaseYm.split("-").map(Number);
  const suffix = item.releaseKind === "ship" ? "発送" : "発売";
  if (item.releaseDay) return `${y}年${m}月${item.releaseDay}日${suffix}`;
  return `${y}年${m}月${suffix}`;
}

export function shortReleaseLabel(item) {
  if (!item.releaseYm) return "時期未定";
  const [, m] = item.releaseYm.split("-").map(Number);
  if (item.releaseDay) return `${m}/${item.releaseDay}`;
  return `${m}月`;
}

/**
 * 発売済みか。日が未確定の月は、その月が終わるまで「発売前」とみなす。
 *
 * ガチャ側で「今月かつ週表記」を無条件に発売済みとして扱い、875件中138件を
 * 誤って「発売中」と表示していた前例がある（lib/release.js の releaseStartDay）。
 * 同じ失敗をしないよう、情報が無いときは発売前に倒す。
 */
export function isReleased(item, now = new Date()) {
  if (!item.releaseYm) return false;
  const [y, m] = item.releaseYm.split("-").map(Number);
  const relIndex = y * 12 + m;
  const nowIndex = now.getFullYear() * 12 + (now.getMonth() + 1);
  if (relIndex !== nowIndex) return relIndex < nowIndex;
  if (!item.releaseDay) return false;
  return item.releaseDay <= now.getDate();
}

export function upcoming(items, now = new Date()) {
  return items.filter((i) => !isReleased(i, now));
}

export function released(items, now = new Date()) {
  return items.filter((i) => isReleased(i, now));
}

/** 発売が近い順。時期未定は最後に送る。 */
export function byReleaseAsc(a, b) {
  const key = (x) =>
    `${x.releaseYm || "9999-99"}-${String(x.releaseDay || 99).padStart(2, "0")}`;
  const ka = key(a);
  const kb = key(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

/** 新着順（収集が新しい順）。トップの「新着」に使う。 */
export function byCollectedDesc(a, b) {
  return String(b.collectedAt || "").localeCompare(String(a.collectedAt || ""));
}

/**
 * 価格の表示文字列。公式サイトと同じ「160円（税込176円）」の形に揃える。
 *
 * 日本では総額表示が求められるので、税抜だけを出さない。
 * 生成済みの紹介文は税抜の数字で書かれているため、税抜も併記することで
 * 本文と仕様欄の数字が食い違わないようにしている。
 */
export function priceLabel(item) {
  if (typeof item.price !== "number") return null;
  if (typeof item.priceTaxIn === "number" && item.priceTaxIn !== item.price) {
    return `${item.price}円（税込${item.priceTaxIn}円）`;
  }
  return `${item.price}円`;
}

/** 一覧カードなど狭い場所用。総額表示を優先する。 */
export function shortPriceLabel(item) {
  const n = typeof item.priceTaxIn === "number" ? item.priceTaxIn : item.price;
  return typeof n === "number" ? `¥${n}` : null;
}

export function releaseMonths(items) {
  return [...new Set(items.map((i) => i.releaseYm).filter(Boolean))].sort();
}

/**
 * 一覧に出す件数の上限。
 *
 * もともとは「VercelのCDNリクエスト枠（1ページ40〜90枚の画像で月137万）」が理由だったが、
 * 2026-10-13にサムネイルをR2へ移してVercelの枠からは降りた。
 * 食玩の画像は楽天のCDN直リンクなので、こちらも自前の枠を使わない。
 *
 * それでも24件に抑えるのは、ページ重量とLCP、モバイルのデータ量のため。
 * 枠の話ではなくなったので、増やしたくなったらここを変えればよい。
 */
export const PAGE_SIZE = 24;

/**
 * 同じ作品のガチャを探す。相互リンク用。
 *
 * 食玩側にブランド判定は持たせていない（scripts/brand.js は商品名の表記に強く依存していて、
 * 食玩の命名規則では精度が出ない）。代わりに、ガチャ側で既に判定済みの
 * brand/brandSlug を使って、食玩の商品名に含まれているかで突き合わせる。
 * 判定の単一の情報源をガチャ側に寄せておくほうが、ズレが起きにくい。
 */
export function relatedGacha(item, products, limit = 4) {
  const name = String(item.name || "");
  const hits = [];
  const seen = new Set();
  for (const p of products) {
    if (!p.brand || !p.brandSlug) continue;
    if (seen.has(p.brandSlug)) continue;
    if (p.brand.length < 3) continue; // 「猫」等の短い語は誤爆する
    if (!name.includes(p.brand)) continue;
    seen.add(p.brandSlug);
    hits.push({ brand: p.brand, brandSlug: p.brandSlug });
    if (hits.length >= limit) break;
  }
  return hits;
}

/** あるブランドに対応する食玩（ブランドページからの逆引き）。 */
export function shokuganForBrand(brand, items, limit = 6) {
  if (!brand || brand.length < 3) return [];
  return items.filter((i) => String(i.name).includes(brand)).slice(0, limit);
}

/**
 * 掲載に足るか。薄いページを量産しないための判定で、
 * lib/quality.js の isLowValueProduct と同じ考え方。
 * 紹介文も画像も価格も無いものは、テンプレートだけのページになるので出さない。
 */
export function isPublishable(item) {
  const hasBody = Boolean(item.description && item.description.trim().length >= 40);
  const hasFacts = Boolean(item.price || item.releaseYm);
  return hasBody && hasFacts;
}
