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

// ── ブランド一覧ページの品質判定 ─────────────────────────────
//
// 【掲載件数で足切りしてはいけない】
// 一度「商品3件未満のブランドページは薄いので noindex」を入れたが、Search Console の
// 実データがこの前提を否定した（2026-07-15・直近28日）:
//   /brand/tensura  商品2件 → 32クリック / 996表示（サイト3位）
//   /brand/pokemon  商品26件 →  8クリック / 577表示
// 掲載件数はページの価値を予測しない。検索需要はIPの人気で決まるためで、
// この足切りはサイト全体のクリックの11%・表示回数の9%を捨てるものだった。
//
// Google自身がこれらのページを評価して上位に出している以上、
// 件数という代理指標で二重に判断しない。判定は入れず全ブランドページをインデックス対象にする。
export function isLowValueBrandPage() {
  return false;
}

// ── ブログ記事の品質判定 ───────────────────────────────────────
//
// 自動生成の「○月の新作まとめ」は、日数に関係なく最初からインデックスさせない。
//
// 【なぜ45日ルールをやめたか】
// 元は「45日を過ぎたら陳腐化するので noindex」だったが、問題は鮮度ではなく
// 同工異曲の量産そのものだった。2026年6月だけで23本が公開され、中身は同じブランドを
// 入れ替えただけになっている:
//   6/04 サンリオ・ムーミン・キタンクラブ！かわいいガチャガチャ2026年6月最新おすすめ
//   6/05 キタンクラブ・サンリオ・ムーミン！2026年6月ガチャガチャ新作まとめ
//   6/10 キタンクラブ・サンリオ・ディズニー！2026年6月ガチャガチャ新作おすすめ厳選
// これはGoogleが「スケールされたコンテンツの不正使用」として禁止している形で、
// AdSenseの「低品質コンテンツ」不承認の主因である可能性が高い。
//
// 【失うものは小さい】
// GSC実測（2026-07-15・直近28日）ではブログ24本の合計が6クリック。
// サイト全体329クリックの1.8%しかなく、審査上のリスクに全く見合っていない。
//
// evergreen: true を付けた手書きガイドだけをインデックス対象にする。
// この方針に合わせて .github/workflows/generate-blog.yml の定期実行も停止した。
export function isStaleBlogPost(post) {
  return !post.evergreen;
}

// インデックス対象（検索に載せる）ブログ記事だけを返す
export function indexableBlogPosts(posts, now = new Date()) {
  return posts.filter((p) => !isStaleBlogPost(p, now));
}
