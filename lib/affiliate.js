// 楽天アフィリエイトのリンク生成。ID はサイト既存のもの（ReceiptPaper と同一）。
const RAKUTEN_AFFILIATE_BASE =
  "https://hb.afl.rakuten.co.jp/ichiba/5419daa8.c81c3582.5419daa9.cef22a14/";

// 指定キーワードの楽天市場 検索結果へのアフィリエイトリンクを返す
export function rakutenSearchUrl(keyword) {
  const dest = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`;
  return `${RAKUTEN_AFFILIATE_BASE}?pc=${encodeURIComponent(dest)}&link_type=text`;
}
