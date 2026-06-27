// 商品ページの品質判定ロジック（AdSense「低品質コンテンツ」対策・ハイブリッド方針）
//
// 方針: 主要ブランドに紐づく商品ページは検索インデックス対象として残し、
// ブランド未分類（その他 等）の長尾ページや、内容が極端に薄いページは
// noindex にしてサイト全体の「薄いページの山」を整理する。
//
// この閾値はここ一箇所で管理する。調整する場合はこのファイルだけ直せばよい。

// ブランドが特定できていない＝個別の検索需要が乏しい長尾ページ
const GENERIC_BRANDS = new Set(["その他", "New", "キャラクター"]);

function imageCount(p) {
  if (p.images && p.images.length) return p.images.length;
  return p.img ? 1 : 0;
}

function descLength(p) {
  return (p.description || "").trim().length;
}

// 低品質（noindex対象）と判定する商品
export function isLowValueProduct(p) {
  // 主要ブランドに紐づかない長尾ページ
  if (GENERIC_BRANDS.has(p.brand)) return true;
  // ブランドはあるが画像も説明もほぼ無い極端に薄いページ
  if (imageCount(p) === 0 && descLength(p) < 40) return true;
  return false;
}

// インデックス対象（検索に載せる）商品だけを返す
export function indexableProducts(products) {
  return products.filter((p) => !isLowValueProduct(p));
}

// ── ブログ記事の鮮度判定 ───────────────────────────────────────
// 「○月の新作まとめ」など日付ベースの自動生成記事は、時間が経つと内容が陳腐化し
// クリック0の死蔵ページになる（GSC実測でも古いまとめ記事はクリック0）。
// 一定日数を過ぎた非常緑記事は noindex してサイト全体の品質を保つ。
// evergreen: true を付けた手書きガイドは常にインデックス対象。
const BLOG_FRESH_DAYS = 45;

export function isStaleBlogPost(post, now = new Date()) {
  if (post.evergreen) return false;
  const published = new Date(post.publishedAt);
  if (Number.isNaN(published.getTime())) return false;
  const ageDays = (now.getTime() - published.getTime()) / 86400000;
  return ageDays > BLOG_FRESH_DAYS;
}

// インデックス対象（検索に載せる）ブログ記事だけを返す
export function indexableBlogPosts(posts, now = new Date()) {
  return posts.filter((p) => !isStaleBlogPost(p, now));
}
