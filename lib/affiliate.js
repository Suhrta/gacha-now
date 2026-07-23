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

// 商品名をAmazon検索向けに正規化するときの上限文字数。
// これを超えたら商品名を捨ててブランド名ベースのクエリに切り替える。
// 「クレヨンしんちゃん ふわふわフロッキードール」(22文字)は残り、
// 「アニメ「ぼっち・ざ・ろっく！」　ぼっちちゃんがいっぱいフィギュアvol.3」は落ちる想定。
const AMAZON_QUERY_MAX = 24;

// 商品名の先頭に付く作品種別の接頭辞。Amazonの商品タイトルには通常入らないため落とす。
const AMAZON_TITLE_PREFIX = /^(TVアニメ|テレビアニメ|アニメ|劇場版|映画|新作|公式)\s*/;

// ブランド名が未分類のときの値（data/products.json の brand）。クエリに使えない。
const BRAND_UNCLASSIFIED = "その他";

// 検索語の端に残っても意味を持たない装飾記号。
const EDGE_SYMBOLS = /^[\s！!♪★☆・\-–—]+|[\s！!♪★☆・\-–—]+$/g;

// 商品名から括弧・全角スペース等を落として検索語として使える形にする。
// 中黒（・）は「ぼっち・ざ・ろっく」のように語の一部なので内部では残す。
function normalizeTitle(name) {
  return String(name || "")
    .replace(AMAZON_TITLE_PREFIX, "")
    .replace(/[「」『』【】〔〕（）()"'”’]/g, " ")
    .replace(/[\s　]+/g, " ")
    .trim()
    .replace(EDGE_SYMBOLS, "");
}

// 長すぎる商品名を語の切れ目で切り詰める。区切りが見つからない（=最初の語が
// すでに長すぎる）場合は "" を返し、呼び出し側でブランド名に退避させる。
function truncateAtBoundary(title, max) {
  if (title.length <= max) return title;
  const head = title.slice(0, max);
  const cut = head.lastIndexOf(" ");
  return cut >= 6 ? head.slice(0, cut).replace(EDGE_SYMBOLS, "") : "";
}

// 商品名・ブランド名から Amazon検索でヒットしやすいクエリを組み立てる。
//
// 楽天は店舗が商品名をそのまま長く載せるため生の商品名でも当たるが、
// Amazonは商品タイトルの書式が違うので、記号や冗長な商品名をそのまま投げると
// 0件ページに着地してしまう（＝クリックしても成果につながらない）。
// intent "compset" のときは全種まとめ買いを狙って「セット」を添える。
export function amazonQuery(name, brand, intent) {
  const title = normalizeTitle(name);
  if (!title) return "";

  // 長い商品名は先頭（作品名・シリーズ名が来る位置）だけ残す。
  // brand は「トミカ」のようなメーカー系ブランドを含み、退避先にすると
  // 商品の主題（例: きかんしゃトーマス）が消えるため、切り詰めを優先する。
  let base = title;
  if (title.length > AMAZON_QUERY_MAX) {
    const usableBrand =
      brand && brand !== BRAND_UNCLASSIFIED ? normalizeTitle(brand) : "";
    // ブランド名だけだと原作の漫画や円盤が並ぶので「ガチャ」でカプセルトイに寄せる
    base =
      truncateAtBoundary(title, AMAZON_QUERY_MAX) ||
      (usableBrand ? `${usableBrand} ガチャ` : title.slice(0, AMAZON_QUERY_MAX));
  }

  return intent === "compset" ? `${base} セット` : base;
}

// 指定キーワードの Amazon.co.jp 検索結果へのアフィリエイトリンクを返す。
// タグ未設定時・キーワード空時は null（呼び出し側はボタンを描画しない）。
export function amazonSearchUrl(keyword) {
  if (!AMAZON_ASSOCIATE_TAG || !keyword) return null;
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${AMAZON_ASSOCIATE_TAG}`;
}
