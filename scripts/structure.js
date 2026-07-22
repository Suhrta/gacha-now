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
import { toBrandSlug, getBrandColor, isHot } from "./brand.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ブランド関連（slug・色・HOT判定）は scripts/brand.js に集約

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
      types: a.types ?? null,
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

  // 重複排除（同一run内）。sourceUrlを主キーにする（名前は表記ゆれで割れるため）
  const seen = new Set();
  const unique = products.filter((p) => {
    const key = p.sourceUrl || p.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const outputPath = path.join(__dirname, "../data/structured.json");
  fs.writeFileSync(outputPath, JSON.stringify(unique, null, 2), "utf-8");

  console.log(`✅ ${unique.length}件の商品データを構造化`);
  console.log(`💾 ${outputPath} に保存しました`);
}

main().catch(console.error);
