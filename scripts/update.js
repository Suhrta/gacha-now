/**
 * update.js - 構造化した商品データをサイトのproducts.jsonに反映する
 * 
 * 1. 既存のproducts.jsonを読む
 * 2. 新しいデータから、まだ登録されていない商品だけを追加
 * 3. 古いデータ（3ヶ月以上前）を自動で削除
 * 4. 更新されたproducts.jsonを保存
 * 5. 今日新規追加された商品名をnew-today.jsonに記録
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = process.env.PRODUCTS_PATH
  || path.join(__dirname, "../data/products.json");
const NEW_TODAY_PATH = path.join(__dirname, "../data/new-today.json");
async function main() {
  const structuredPath = path.join(__dirname, "../data/structured.json");
  if (!fs.existsSync(structuredPath)) {
    console.error("data/structured.json が見つかりません。");
    process.exit(1);
  }
  const newProducts = JSON.parse(fs.readFileSync(structuredPath, "utf-8"));
  console.log("新しいデータ: " + newProducts.length + "件");
  let existing = [];
  if (fs.existsSync(PRODUCTS_PATH)) {
    existing = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));
    console.log("既存データ: " + existing.length + "件");
  } else {
    console.log("既存データなし（新規作成）");
  }
  // 同一商品の判定は sourceUrl を主キーにする（名前だとメーカー側の
  // 表記修正「根付け→根付」等で別商品として二重登録されるため）。
  // URL一致の既存商品は削除せず、名前・発売週などの情報だけ更新する。
  const hasJa = (s) => /[぀-ヿ一-鿿]/.test(s || "");
  const isSpecificWeek = (s) => /月/.test(s || "");
  const keyOf = (p) => p.sourceUrl || p.name;
  const existingByKey = new Map(existing.map((p) => [keyOf(p), p]));
  const existingNames = new Set(existing.map((p) => p.name));

  const toAdd = [];
  let updatedCount = 0;
  for (const np of newProducts) {
    const cur = existingByKey.get(keyOf(np));
    if (!cur) {
      // URL未登録でも同名商品があればスキップ（旧挙動の保険）
      if (existingNames.has(np.name)) continue;
      toAdd.push(np);
      continue;
    }
    // 既存エントリを更新（idとcollectedAtは維持: URL安定・3ヶ月削除サイクル維持）
    let changed = false;
    // 名前: 日本語名を英語名(kitan.jpの英語ページ混入)で上書きしない
    if (np.name !== cur.name && (hasJa(np.name) || !hasJa(cur.name))) {
      cur.name = np.name;
      changed = true;
    }
    // 発売週: 具体値(「7月 27日週」等)を「未定」で上書きしない
    if (np.releaseWeek !== cur.releaseWeek && (isSpecificWeek(np.releaseWeek) || np.releaseWeek !== "未定")) {
      cur.releaseWeek = np.releaseWeek;
      changed = true;
    }
    if (np.price !== cur.price && np.price) { cur.price = np.price; changed = true; }
    if (np.types != null && np.types !== cur.types) { cur.types = np.types; changed = true; }
    if (np.img && np.img !== cur.img) { cur.img = np.img; cur.images = np.images || [np.img]; changed = true; }
    if (changed) updatedCount++;
  }
  console.log("新規追加: " + toAdd.length + "件");
  console.log("既存更新: " + updatedCount + "件");
  console.log("スキップ（既存）: " + (newProducts.length - toAdd.length - updatedCount) + "件");
  const newTodayNames = toAdd.map((p) => p.name);
  fs.writeFileSync(NEW_TODAY_PATH, JSON.stringify(newTodayNames, null, 2), "utf-8");
  console.log("new-today.json に " + newTodayNames.length + "件を記録");
  const merged = [...toAdd, ...existing];
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const filtered = merged.filter((p) => {
    if (!p.collectedAt) return true;
    return new Date(p.collectedAt) > threeMonthsAgo;
  });
  const removed = merged.length - filtered.length;
  if (removed > 0) {
    console.log("古いデータ削除: " + removed + "件");
  }
  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(filtered, null, 2), "utf-8");
  console.log("products.json を更新しました（合計: " + filtered.length + "件）");
  console.log("保存先: " + PRODUCTS_PATH);
}
main().catch(console.error);
