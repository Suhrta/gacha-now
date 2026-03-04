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

// ブランドスラッグ変換（未登録ブランドは自動生成）
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
    // キタンクラブ固有
    "コップのフチ子": "fuchiko", "PUTITTO": "putitto",
    "コウペンちゃん": "koupen", "タローマン": "taroman",
    "可愛い嘘のカワウソ": "kawauso", "おぱんちゅうさぎ": "opanchu",
    "チェンソーマン": "chainsawman", "ヒロアカ": "heroaca",
    // ブシロードクリエイティブ関連
    "バンドリ": "bandori", "ラブライブ": "lovelive", "D4DJ": "d4dj",
    "ぼっち・ざ・ろっく": "bocchi", "名探偵コナン": "conan",
    "ハイキュー": "haikyu", "ダンダダン": "dandadan",
    "モブサイコ100": "mobpsycho", "るろうに剣心": "rurouni",
    "DEATH NOTE": "deathnote", "ぴちぴちピッチ": "pitchipitch",
    "ゾンビランドサガ": "zombieland", "ウマ娘": "umamusume",
    // Qualia・ケンエレファント関連
    "ピングー": "pingu", "セサミストリート": "sesame",
    "ケアベア": "carebears",
  };
  if (map[brand]) return map[brand];
  // 未登録ブランド → 自動スラッグ生成
  // 英数字はそのまま、日本語はハッシュベースの短い文字列に変換
  const ascii = brand.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ascii.length >= 3) return ascii;
  // 日本語のみのブランド名 → ハッシュで一意なスラッグを生成
  let hash = 0;
  for (let i = 0; i < brand.length; i++) {
    hash = ((hash << 5) - hash + brand.charCodeAt(i)) | 0;
  }
  return "brand-" + Math.abs(hash).toString(36);
}

// ブランド別テーマカラー（未登録ブランドは自動生成）
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
    // キタンクラブ固有
    "コップのフチ子": "#FF8A65", "PUTITTO": "#9575CD",
    "コウペンちゃん": "#FFF176", "タローマン": "#EF5350",
    "可愛い嘘のカワウソ": "#80DEEA", "おぱんちゅうさぎ": "#F8BBD0",
    "チェンソーマン": "#B71C1C", "ヒロアカ": "#43A047",
  };
  if (colors[brand]) return colors[brand];
  // 未登録ブランド → ハッシュからパステルカラーを自動生成
  let hash = 0;
  for (let i = 0; i < brand.length; i++) {
    hash = ((hash << 5) - hash + brand.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  // HSL → Hex（彩度60%、明度75%でパステル調に）
  const s = 0.6, l = 0.75;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (hue < 60) { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// 注目度判定
function isHot(name, brand) {
  const hotBrands = ["サンリオ", "たまごっち", "ちいかわ", "ポケモン"];
  return hotBrands.includes(brand);
}

// IDを生成
function generateId(name, index, url) {
  // 商品名+URLから簡易ハッシュを生成してユニークIDを確保
  const src = name + (url || String(index));
  let hash = 0;
  for (let i = 0; i < src.length; i++) {
    hash = ((hash << 5) - hash + src.charCodeAt(i)) | 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  const ascii = name
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 30);
  const prefix = ascii.length >= 3 ? ascii : "gacha";
  return `${prefix}-${hex}`;
}

/**
 * releaseWeekから推定日付を算出
 * 例: "2026年3月 第2週" → 2026-03-08, "2024年6月 下旬" → 2024-06-21
 */
function estimateReleaseDate(releaseWeek) {
  if (!releaseWeek || releaseWeek === "未定") return null;

  const yearMatch = releaseWeek.match(/(\d{4})年(\d{1,2})月/);
  if (!yearMatch) return null;

  const year = parseInt(yearMatch[1]);
  const month = parseInt(yearMatch[2]);

  // 日を推定
  let day = 15; // デフォルト中旬
  if (releaseWeek.includes("上旬")) day = 5;
  else if (releaseWeek.includes("中旬")) day = 15;
  else if (releaseWeek.includes("下旬")) day = 25;
  else if (releaseWeek.includes("第1週")) day = 1;
  else if (releaseWeek.includes("第2週")) day = 8;
  else if (releaseWeek.includes("第3週")) day = 15;
  else if (releaseWeek.includes("第4週")) day = 22;
  else if (releaseWeek.includes("第5週")) day = 29;
  else {
    const dayMatch = releaseWeek.match(/(\d+)日/);
    if (dayMatch) day = parseInt(dayMatch[1]);
  }

  return new Date(year, month - 1, day);
}

/**
 * releaseWeekを表示用に変換
 * - 6ヶ月以上前 → null（除外対象）
 * - 6ヶ月以内の過去 → "発売中"
 * - 未来 → 年を除いて表示（例: "3月 第2週"）
 * - 未定 → そのまま
 */
function normalizeReleaseWeek(releaseWeek) {
  if (!releaseWeek || releaseWeek === "未定") return { display: "未定", exclude: false };

  const estimated = estimateReleaseDate(releaseWeek);
  if (!estimated) return { display: releaseWeek, exclude: false };

  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  if (estimated < sixMonthsAgo) {
    return { display: null, exclude: true }; // 6ヶ月以上前 → 除外
  }
  if (estimated < now) {
    return { display: "発売中", exclude: false }; // 3ヶ月以内の過去
  }
  // 未来 → 年を除いて表示
  const display = releaseWeek.replace(/\d{4}年/, "");
  return { display, exclude: false };
}

async function main() {
  const collectedPath = path.join(__dirname, "../data/collected.json");

  if (!fs.existsSync(collectedPath)) {
    console.error("❌ data/collected.json が見つかりません");
    process.exit(1);
  }

  const articles = JSON.parse(fs.readFileSync(collectedPath, "utf-8"));
  console.log(`📝 ${articles.length}件を構造化します...\n`);

  const products = [];
  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const { display, exclude } = normalizeReleaseWeek(a.releaseWeek);
    if (exclude) continue; // 6ヶ月以上前の商品は除外

    products.push({
      id: generateId(a.title, i, a.url),
      name: a.title,
      brand: a.brand || "その他",
      brandSlug: toBrandSlug(a.brand || "その他"),
      price: a.price || 300,
      types: a.types || 4,
      releaseWeek: display || "未定",
      color: getBrandColor(a.brand || "その他"),
      hot: isHot(a.title, a.brand || "その他"),
      img: a.imageUrl || null,
      images: a.images || (a.imageUrl ? [a.imageUrl] : []),
      affiliateUrl: "#",
      sourceUrl: a.url,
      source: a.source,
      collectedAt: new Date().toISOString(),
    });
  }

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
