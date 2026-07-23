// 仕入れ元CDNの商品画像URLを、用途に応じた解像度へ振り分ける。
//
// バンダイのCDNはパスの /model/{コード}/ が解像度を表しており、
//   s=100 / m=200 / b=560 / xl=1200
// 収集時は b（560px）で保存している。他社は元から十分な解像度がある
// （タカラトミーアーツ1200 / キタン800 / ブシロード1200）ため変換しない。
//
// 大きく見せる箇所だけ xl に差し替える方針。全面的に xl にすると
// バンダイ1枚あたり 68KB→290KB になり、最適化を通さない箇所
// （レシート内のスワイプ画像）が重くなるため。

const BANDAI_HOST = "bandai-a.akamaihd.net";
const BANDAI_SIZE_PATH = "/model/b/";

// バンダイ画像を指定のサイズコードに差し替える。対象外のURLはそのまま返す。
export function bandaiSize(url, code) {
  if (!url || !url.includes(BANDAI_HOST)) return url;
  return url.replace(BANDAI_SIZE_PATH, `/model/${code}/`);
}

// 一覧のサムネイル・商品ページの主画像用。
// next/image が表示サイズまで縮小するので、元は大きい方が良い。
export function mainImageUrl(url) {
  return bandaiSize(url, "xl");
}
