/**
 * structure.js v2 - collected.jsonからproducts.json形式に変換
 *
 * 【v1からの変更点】
 * - Claude API呼び出し廃止（APIコスト0円）
 * - collect.jsが全データを取得済みなので単純変換のみ
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ブランドスラッグ変換
function toBrandSlug(brand) {
  const map = {
    "ポケモン": "pokemon", "サンリオ": "sanrio", "ちいかわ": "chiikawa",
    "カービィ": "kirby", "ディズニー": "disney", "ワンピース": "onepiece",
    "ドラゴンボール": "dragonball", "鬼滅の刃": "kimetsu", "呪術廻戦": "jujutsu",
    "仮面ライダー": "kamenrider", "ガンダム": "gundam", "プリキュア": "precure",
    "SPY×FAMILY": "spyfamily", "転スラ": "tensura", "クレヨンしんちゃん": "shinchan",
    "mofusand": "mofusand", "すみっコぐらし": "sumikko", "スヌーピー": "snoopy",
    "たまごっち": "tamagotchi", "初音ミク": "miku", "トミカ": "tomica",
    "ゴジラ": "godzilla", "ウルトラマン": "ultraman", "NARUTO": "naruto",
    "ハリー・ポッター": "harrypotter", "アンパンマン": "anpanman",
    "ドラえもん": "doraemon", "犬夜叉": "inuyasha", "ムーミン": "moomin",
    "スポンジ・ボブ": "spongebob", "いきもの大図鑑": "ikimono",
    "まちぼうけ": "machiboke", "パンダの穴": "pandanoana",
    "おさるのジョージ": "george", "フリーレン": "frieren",
    "まどか☆マギカ": "madoka", "アイカツ": "aikatsu",
    "藤子不二雄": "fujiko", "その他": "other",
  };
  return map[brand] || brand.toLowerCase().replace(/[^a-z0-9]/g, "") || "other";
}

// ブランド別テーマカラー
function getBrandColor(brand) {
  const colors = {
    "ポケモン": "#FFD54F", "サンリオ": "#F06292", "ちいかわ": "#4FC3F7",
    "カービィ": "#F48FB1", "ディズニー": "#CE93D8", "ワンピース": "#E57373",
    "ドラゴンボール": "#FFB74D", "鬼滅の刃": "#80CBC4", "呪術廻戦": "#7986CB",
    "仮面ライダー": "#4DB6AC", "ガンダム": "#78909C", "プリキュア": "#F48FB1",
    "転スラ": "#4FC3F7", "mofusand": "#FFCC80", "すみっコぐらし": "#A5D6A7",
    "たまごっち": "#81D4FA", "初音ミク": "#4DD0E1", "ゴジラ": "#A1887F",
    "ウルトラマン": "#E57373", "いきもの大図鑑": "#AED581",
    "まちぼうけ": "#FFB74D", "パンダの穴": "#90A4AE",
  };
  return colors[brand] || "#9E9E9E";
}

// 注目度判定
function isHot(name, brand) {
  const hotBrands = ["サンリオ", "たまごっち", "ちいかわ", "ポケモン"];
  return hotBrands.includes(brand);
}

// IDを生成
function generateId(name, index) {
  const ascii = name
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
  return ascii.length >= 3 ? ascii : `gacha-${String(index + 1).padStart(4, "0")}`;
}

async function main() {
  const collectedPath = path.join(__dirname, "../data/collected.json");

  if (!fs.existsSync(collectedPath)) {
    console.error("❌ data/collected.json が見つかりません");
    process.exit(1);
  }

  const articles = JSON.parse(fs.readFileSync(collectedPath, "utf-8"));
  console.log(`📝 ${articles.length}件を構造化します...\n`);

  const products = articles.map((a, i) => ({
    id: generateId(a.title, i),
    name: a.title,
    brand: a.brand || "その他",
    brandSlug: toBrandSlug(a.brand || "その他"),
    price: a.price || 300,
    types: a.types || 4,
    releaseWeek: a.releaseWeek || "未定",
    color: getBrandColor(a.brand || "その他"),
    hot: isHot(a.title, a.brand || "その他"),
    img: a.imageUrl || null,
    affiliateUrl: "#",
    sourceUrl: a.url,
    source: a.source,
    collectedAt: new Date().toISOString(),
  }));

  // 重複排除
  const seen = new Set();
  const unique = products.filter((p) => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });

  const outputPath = path.join(__dirname, "../data/structured.json");
  fs.writeFileSync(outputPath, JSON.stringify(unique, null, 2), "utf-8");

  console.log(`✅ ${unique.length}件の商品データを構造化`);
  console.log(`💾 ${outputPath} に保存しました`);
}

main().catch(console.error);
