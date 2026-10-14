// 商品画像の表示元を決める。
//
// サムネイルは scripts/build-thumbs.js が仕入れ元CDNから取得・縮小して
// public/thumb/<id>.webp に置いてある（幅480px・平均37KB）。
// これを素の <img> で配信することで、Vercelの画像最適化（Hobbyは変換5,000回・
// キャッシュリード30万ユニット/月）を一切使わずに済ませている。
// 2026-08にこの枠を使い切り、新規の画像変換が402で止まったのが発端。
//
// 生成が間に合っていない新商品や、仕入れ元が落ちていて取得できなかった商品は
// thumb を持たないので、その場合だけ仕入れ元CDNの元画像に倒す。
// 元画像は最大1.5MBあるため常用はしない（LCPが悪化する）。

// バンダイのCDNはパスの /model/{コード}/ が解像度を表す（s=100 / m=200 / b=560 / xl=1200）。
// 収集時は b（560px）で保存しているので、大きく使う箇所だけ差し替える。
// 他社は元から十分な解像度がある（タカラトミーアーツ1200 / キタン800 / ブシロード1200）。

// 厳格IPの自前コピーを出すかの切り替えに使う。キーワード配列だけの小さなモジュールで
// data JSON を読まないので、Edgeの1MB上限には影響しない。
import { SHOW_STRICT_IP_COPIES, isStrictIp } from "./strict-ip.js";

const BANDAI_HOST = "bandai-a.akamaihd.net";

export function bandaiSize(url, code) {
  if (!url || !url.includes(BANDAI_HOST)) return url;
  return url.replace("/model/b/", `/model/${code}/`);
}

// 1200px版を返す。Instagram投稿カードは1080pxで書き出すので、
// 560pxのままだと拡大されてボヤける（scripts/generate-post.js が使う）。
// サイト表示側はこれを使わない（自前サムネイルがあるため）。
export function mainImageUrl(url) {
  return bandaiSize(url, "xl");
}

export function isBandaiImage(url) {
  return Boolean(url) && url.includes(BANDAI_HOST);
}

/**
 * バンダイ商品の srcset。m(200px) と b(560px) を並べ、表示幅に応じてブラウザに選ばせる。
 *
 * 実測サイズ（2026-10-13）: s=3.4KB / m=11KB / b=65KB / xl=346KB。
 * 一覧カードの実表示は150〜200px程度なので多くの環境で m が選ばれ、
 * R2に置いていた自前サムネイル（480px webp・32KB）より軽くなる。
 * 高DPR端末や商品詳細の大きい表示では b が選ばれる。
 */
export function bandaiSrcSet(url) {
  if (!isBandaiImage(url)) return null;
  return `${bandaiSize(url, "m")} 200w, ${bandaiSize(url, "b")} 560w`;
}

// サムネイルに使うURLを優先順に返す。表示側は先頭から試し、
// 読み込みに失敗したら次へ、尽きたらプレースホルダを出す。
//
// 【2026-10-13】バンダイ593件は自前サムネイル（R2）を持たせず、
// 仕入れ元CDNへ直リンクする方針に変えた。
// バンダイの「著作権・商標について」が画像の複製・転載を明確に断っているため、
// 自サーバーにコピーを置く構成をやめた。直リンクは複製に当たらない。
//
// 8月に自前ホストへ移した理由はVercelの画像最適化枠（402）だったが、
// 現在は unoptimized: true で素の <img> 配信なので、直リンクにしても
// Vercelの画像枠もR2も使わない。移した理由自体が消えている。
// 一覧のサムネイルに元画像を使ってよい仕入れ元かどうか。
//
// バンダイ … 可。/model/{s|m|b|xl}/ で解像度を選べる（m=200px/8.9KB）。
// それ以外 … 不可。解像度バリアントが無く、原寸をそのまま出すことになる。
//   実測の平均: タカラトミーアーツ 714KB / キタンクラブ 564KB / ブシロード 529KB。
//   1ページ40〜90枚なので、一覧で出すと数十MBになる。
//
// ここを緩めると一覧が一気に重くなる。元画像は商品詳細（ReceiptPaper）でだけ使う。
function canUseSourceImageAsThumb(url) {
  return isBandaiImage(url);
}

export function thumbSources(product) {
  if (!product) return [];
  const sources = [];
  // 楽天由来の画像（AI判定でバナー無しを選んだもの）があれば最優先。
  // 自前コピー（thumb）より先に見るのは、コピーに依存する商品を増やさないため。
  if (product.rakutenThumb) sources.push(product.rakutenThumb);
  // 厳格IPの自前コピーは SHOW_STRICT_IP_COPIES で止められる（lib/strict-ip.js）。
  // **生成側だけでなくここでも見るのが要点。** products.json に既に入った thumb は
  // 次のパイプライン実行まで残るので、生成側だけを止めても即座には消えない。
  // 権利者から指摘が来たときはデプロイした瞬間に止まる必要がある。
  if (product.thumb && (SHOW_STRICT_IP_COPIES || !isStrictIp(product))) {
    sources.push(product.thumb);
  }
  // placehold.co のダミーURLは「画像なし」と同義なので候補に入れない
  if (
    product.img &&
    !product.img.includes("placehold") &&
    canUseSourceImageAsThumb(product.img)
  ) {
    sources.push(product.img);
  }
  return sources;
}
