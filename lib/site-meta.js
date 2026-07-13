import products from "../data/products.json";

// 商品データの最新collectedAtをJST固定で扱う
// （ビルド環境・ブラウザのタイムゾーン差によるハイドレーション不一致を防ぐ）
const times = products
  .map((p) => new Date(p.collectedAt || 0).getTime())
  .filter((t) => t > 0);

const jst = times.length
  ? new Date(Math.max(...times) + 9 * 3600 * 1000)
  : null;

export const PRODUCT_COUNT = products.length;

// データ最終更新日（JST）。タイトル・description・構造化データ・画面表示で共用する
export const DATA_UPDATED = jst
  ? {
      year: jst.getUTCFullYear(),
      month: jst.getUTCMonth() + 1,
      day: jst.getUTCDate(),
      label: `${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日`,
      iso: jst.toISOString().slice(0, 10),
    }
  : null;
