// アフィリエイトリンク生成の一元管理（楽天 + Amazon）。

// 楽天アフィリエイトID はサイト既存のもの（ReceiptPaper と同一）。
const RAKUTEN_AFFILIATE_ID = "5419daa8.c81c3582.5419daa9.cef22a14";

// 計測ID（楽天管理画面「ツール > リンク成果計測機能」で発行される _RTLinkXXXXX）。
// レポートの「計測ID別」で設置箇所ごとの成果を分析するために付与する。
// 発行後にここへ設定する。未設定("")の設置箇所は計測IDなしの通常リンクになる。
export const RAKUTEN_MEASUREMENT_IDS = {
  item_compset: "_RTLink138794",  // 商品ページ: コンプセット導線（RakutenLinks）
  item_preorder: "_RTLink138795", // 商品ページ: 予約導線（RakutenLinks）
  receipt_page: "_RTLink138796",  // 商品ページ: レシート内「楽天市場で探す」
  receipt_modal: "_RTLink138797", // 一覧系ページのポップアップレシート内「楽天市場で探す」
  character: "_RTLink138798",     // キャラページ: 検索導線CTA
  blog: "_RTLink138799",          // ブログ記事内ボタン
};

// 指定キーワードの楽天市場 検索結果へのアフィリエイトリンクを返す。
// placement（RAKUTEN_MEASUREMENT_IDS のキー）を渡すと計測IDをリンクに埋め込む。
// 形式: https://hb.afl.rakuten.co.jp/ichiba/{アフィリエイトID}/{計測ID}?pc=...
export function rakutenSearchUrl(keyword, placement) {
  const mid = RAKUTEN_MEASUREMENT_IDS[placement] || "";
  const dest = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`;
  return `https://hb.afl.rakuten.co.jp/ichiba/${RAKUTEN_AFFILIATE_ID}/${mid}?pc=${encodeURIComponent(dest)}&link_type=text`;
}

// Amazonアソシエイトのトラッキングタグ（gacha-now専用・erabook-22と同一アカウント）。
// 設定すると各コンポーネントのAmazon導線が自動で表示される。空にすると非表示。
export const AMAZON_ASSOCIATE_TAG = "gachanow-22";

// 指定キーワードの Amazon.co.jp 検索結果へのアフィリエイトリンクを返す。
// タグ未設定時は null（呼び出し側はボタンを描画しない）。
export function amazonSearchUrl(keyword) {
  if (!AMAZON_ASSOCIATE_TAG) return null;
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${AMAZON_ASSOCIATE_TAG}`;
}
