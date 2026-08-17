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

// サムネイルに使うURLを優先順に返す。表示側は先頭から試し、
// 読み込みに失敗したら次へ、尽きたらプレースホルダを出す。
export function thumbSources(product) {
  if (!product) return [];
  const sources = [];
  if (product.thumb) sources.push(product.thumb);
  // placehold.co のダミーURLは「画像なし」と同義なので候補に入れない
  if (product.img && !product.img.includes("placehold")) sources.push(product.img);
  return sources;
}
