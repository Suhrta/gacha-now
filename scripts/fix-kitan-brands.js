/**
 * fix-kitan-brands.js - キタンクラブ商品のブランド判定を修正する（1回だけ実行）
 * 
 * ナビゲーションのカテゴリリンクを拾ってしまい、
 * 全商品が「ちいかわ」等に誤分類されていた問題を修正。
 * 商品名ベースのBRAND_MAPで再判定する。
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BRAND_MAP = [
  { keywords: ["ポケモン", "ポケットモンスター", "ピカチュウ"], brand: "ポケモン" },
  { keywords: ["サンリオ", "ハローキティ", "マイメロ", "クロミ", "シナモロール", "ポムポムプリン"], brand: "サンリオ" },
  { keywords: ["ちいかわ", "ハチワレ"], brand: "ちいかわ" },
  { keywords: ["カービィ", "星のカービィ", "ワドルディ"], brand: "カービィ" },
  { keywords: ["ディズニー", "ミッキー", "プリンセス", "ピクサー", "トイ・ストーリー", "ズートピア", "リメンバー"], brand: "ディズニー" },
  { keywords: ["ワンピース", "ONE PIECE", "ルフィ"], brand: "ワンピース" },
  { keywords: ["ドラゴンボール"], brand: "ドラゴンボール" },
  { keywords: ["鬼滅", "鬼滅の刃"], brand: "鬼滅の刃" },
  { keywords: ["呪術廻戦", "呪術"], brand: "呪術廻戦" },
  { keywords: ["仮面ライダー", "CTION RIDE"], brand: "仮面ライダー" },
  { keywords: ["ガンダム", "機動戦士"], brand: "ガンダム" },
  { keywords: ["プリキュア"], brand: "プリキュア" },
  { keywords: ["SPY×FAMILY", "スパイファミリー"], brand: "SPY×FAMILY" },
  { keywords: ["転スラ", "転生したらスライム"], brand: "転スラ" },
  { keywords: ["クレヨンしんちゃん"], brand: "クレヨンしんちゃん" },
  { keywords: ["mofusand", "モフサンド"], brand: "mofusand" },
  { keywords: ["すみっコ"], brand: "すみっコぐらし" },
  { keywords: ["スヌーピー", "PEANUTS"], brand: "スヌーピー" },
  { keywords: ["たまごっち"], brand: "たまごっち" },
  { keywords: ["初音ミク"], brand: "初音ミク" },
  { keywords: ["トミカ", "プラレール"], brand: "トミカ" },
  { keywords: ["ゴジラ"], brand: "ゴジラ" },
  { keywords: ["ウルトラマン"], brand: "ウルトラマン" },
  { keywords: ["NARUTO", "ナルト"], brand: "NARUTO" },
  { keywords: ["ハリー・ポッター", "ハリーポッター"], brand: "ハリー・ポッター" },
  { keywords: ["アンパンマン"], brand: "アンパンマン" },
  { keywords: ["ドラえもん"], brand: "ドラえもん" },
  { keywords: ["犬夜叉"], brand: "犬夜叉" },
  { keywords: ["MOOMIN", "ムーミン"], brand: "ムーミン" },
  { keywords: ["スポンジ・ボブ"], brand: "スポンジ・ボブ" },
  { keywords: ["いきもの大図鑑"], brand: "いきもの大図鑑" },
  { keywords: ["まちぼうけ"], brand: "まちぼうけ" },
  { keywords: ["パンダの穴"], brand: "パンダの穴" },
  { keywords: ["おさるのジョージ"], brand: "おさるのジョージ" },
  { keywords: ["フリーレン", "葬送のフリーレン"], brand: "フリーレン" },
  { keywords: ["まどか☆マギカ", "まどマギ"], brand: "まどか☆マギカ" },
  { keywords: ["アイカツ"], brand: "アイカツ" },
  { keywords: ["藤子不二雄"], brand: "藤子不二雄" },
  { keywords: ["コップのフチ子", "フチ子"], brand: "コップのフチ子" },
  { keywords: ["PUTITTO"], brand: "PUTITTO" },
  { keywords: ["コウペンちゃん"], brand: "コウペンちゃん" },
  { keywords: ["タローマン"], brand: "タローマン" },
  { keywords: ["可愛い嘘のカワウソ", "カワウソ"], brand: "可愛い嘘のカワウソ" },
  { keywords: ["おぱんちゅうさぎ"], brand: "おぱんちゅうさぎ" },
  { keywords: ["チェンソーマン"], brand: "チェンソーマン" },
  { keywords: ["ヒロアカ", "僕のヒーローアカデミア"], brand: "ヒロアカ" },
];

function detectBrand(name) {
  for (const entry of BRAND_MAP) {
    for (const kw of entry.keywords) {
      if (name.includes(kw)) return entry.brand;
    }
  }
  return "その他";
}

// collected.json を修正
const collectedPath = path.join(__dirname, "../data/collected.json");
const data = JSON.parse(fs.readFileSync(collectedPath, "utf-8"));

let fixed = 0;
for (const item of data) {
  if (item.source === "キタンクラブ公式") {
    const newBrand = detectBrand(item.title);
    if (item.brand !== newBrand) {
      console.log(`  ${item.brand} → ${newBrand}: ${item.title}`);
      item.brand = newBrand;
      fixed++;
    }
  }
}

fs.writeFileSync(collectedPath, JSON.stringify(data, null, 2), "utf-8");
console.log(`\n✅ collected.json: ${fixed}件のブランドを修正`);

// products.json も修正
const productsPath = path.join(__dirname, "../data/products.json");
if (fs.existsSync(productsPath)) {
  const products = JSON.parse(fs.readFileSync(productsPath, "utf-8"));
  let fixedP = 0;
  for (const item of products) {
    if (item.source === "キタンクラブ公式") {
      const newBrand = detectBrand(item.name);
      if (item.brand !== newBrand) {
        item.brand = newBrand;
        fixedP++;
      }
    }
  }
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), "utf-8");
  console.log(`✅ products.json: ${fixedP}件のブランドを修正`);
}

console.log("\n次のステップ:");
console.log("  node scripts/structure.js");
console.log("  node scripts/update.js");
console.log("  echo \"[]\" > data/new-today.json");
console.log("  git add -A && git commit -m \"fix: キタンクラブブランド修正\" && git push");
