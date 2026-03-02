/**
 * update.js - 構造化した商品データをサイトのproducts.jsonに反映する
 * 
 * 【なぜマージが必要か】
 * 新しく収集したデータを、既存のproducts.jsonに「追加」する必要がある。
 * 単純に上書きすると、前回までのデータが消えてしまう。
 * このスクリプトは：
 * 1. 既存のproducts.jsonを読む
 * 2. 新しいデータから、まだ登録されていない商品だけを追加
 * 3. 古いデータ（3ヶ月以上前）を自動で削除
 * 4. 更新されたproducts.jsonを保存
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ガチャなうプロジェクトのproducts.jsonのパス
// 環境変数で指定するか、デフォルトは同じ親ディレクトリのgacha-now
const PRODUCTS_PATH = process.env.PRODUCTS_PATH
  || path.join(__dirname, "../data/products.json");

async function main() {
  // 1. 新しく構造化したデータを読む
  const structuredPath = path.join(__dirname, "../data/structured.json");

  if (!fs.existsSync(structuredPath)) {
    console.error("❌ data/structured.json が見つかりません。先に npm run structure を実行してください。");
    process.exit(1);
  }

  const newProducts = JSON.parse(fs.readFileSync(structuredPath, "utf-8"));
  console.log(`📦 新しいデータ: ${newProducts.length}件`);

  // 2. 既存のproducts.jsonを読む
  let existing = [];
  if (fs.existsSync(PRODUCTS_PATH)) {
    existing = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));
    console.log(`📂 既存データ: ${existing.length}件`);
  } else {
    console.log("📂 既存データなし（新規作成）");
  }

  // 3. 重複チェック：既存の商品名と照合
  const existingNames = new Set(existing.map((p) => p.name));
  const toAdd = newProducts.filter((p) => !existingNames.has(p.name));

  console.log(`➕ 新規追加: ${toAdd.length}件`);
  console.log(`⏭️ スキップ（既存）: ${newProducts.length - toAdd.length}件`);

  // 4. マージ（新しいものを先頭に追加）
  const merged = [...toAdd, ...existing];

  // 5. 古いデータを削除（collectedAtが3ヶ月以上前のもの）
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const filtered = merged.filter((p) => {
    // collectedAtがないもの（手動追加）は残す
    if (!p.collectedAt) return true;
    return new Date(p.collectedAt) > threeMonthsAgo;
  });

  const removed = merged.length - filtered.length;
  if (removed > 0) {
    console.log(`🗑️ 古いデータ削除: ${removed}件`);
  }

  // 6. 保存
  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(filtered, null, 2), "utf-8");
  console.log(`\n✅ products.json を更新しました（合計: ${filtered.length}件）`);
  console.log(`📁 保存先: ${PRODUCTS_PATH}`);
}

main().catch(console.error);
