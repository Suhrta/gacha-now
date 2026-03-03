/**
 * collect.js v4 - ガチャガチャ新作情報を公式サイトから正確に収集
 *
 * 【v3からの変更点】
 * - バンダイ: scheduleページから価格・発売週を直接取得
 * - タカトミ: calendarの発売週 + 詳細ページから価格・種類数取得
 * - ブランド自動判定（商品名からIP名を正規表現で判定）
 * - Claude API不要で正確なデータ取得
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ========================================
// ブランド判定マップ
// ========================================
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
  { keywords: ["藤子不二雄", "ドラえもん"], brand: "藤子不二雄" },
];

function detectBrand(name) {
  for (const entry of BRAND_MAP) {
    for (const kw of entry.keywords) {
      if (name.includes(kw)) return entry.brand;
    }
  }
  return "その他";
}

// ========================================
// 1. バンダイ ガシャポン公式（scheduleページから全情報取得）
// ========================================
async function collectFromBandai() {
  const articles = [];
  try {
    console.log("  📡 バンダイ ガシャポン公式");

    const now = new Date();
    const months = [];
    for (let offset = 0; offset <= 1; offset++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() + offset);
      const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push(ym);
    }

    for (const ym of months) {
      const url = `https://gashapon.jp/schedule/?ym=${ym}`;
      console.log(`    → ${ym}`);
      const res = await fetch(url);
      const html = await res.text();

      // 発売週セクション検出: "3月第1週より順次" 等
      const weekPositions = [];
      const weekRegex = /(\d+)月第(\d+)週/g;
      let weekMatch;
      while ((weekMatch = weekRegex.exec(html)) !== null) {
        weekPositions.push({
          pos: weekMatch.index,
          week: `${weekMatch[1]}月 第${weekMatch[2]}週`,
        });
      }

      // 商品ブロック取得
      const blockRegex = /<a[^>]*href="[^"]*detail\.php\?jan_code=(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
      let match;

      while ((match = blockRegex.exec(html)) !== null) {
        const janCode = match[1];
        const block = match[2];
        const blockPos = match.index;

        // 発売週判定
        let releaseWeek = "未定";
        for (const wp of weekPositions) {
          if (wp.pos < blockPos) releaseWeek = wp.week;
        }

        // 画像URL
        const imgMatch = block.match(/src="(https:\/\/bandai-a\.akamaihd\.net[^"]+)"/);
        const imageUrl = imgMatch ? imgMatch[1] : null;

        // 価格
        const priceMatch = block.match(/(\d{3,4})円/);
        const price = priceMatch ? parseInt(priceMatch[1]) : null;

        // 商品名
        const nameMatch = block.match(/>\s*([^<]{3,})\s*</g);
        let name = "";
        if (nameMatch) {
          for (const m of nameMatch) {
            const text = m.replace(/^>\s*/, "").replace(/\s*<$/, "").trim();
            if (
              text.length > name.length &&
              !text.match(/^\d{3,4}円$/) &&
              !text.match(/^再入荷$/) &&
              !text.match(/^ガシャポン$/) &&
              !text.match(/^フラットガシャポン$/) &&
              !text.match(/^プレミアムガシャポン$/) &&
              text.length > 2
            ) {
              name = text;
            }
          }
        }
        // フラットガシャポン商品名復元
        const fullNameMatch = block.match(/>\s*(【フラットガシャポン】[^<]+)\s*</);
        if (fullNameMatch) name = fullNameMatch[1].trim();

        const brand = detectBrand(name);

        if (name && name.length > 2 && !name.startsWith("*")) {
          articles.push({
            title: name,
            url: `https://gashapon.jp/products/detail.php?jan_code=${janCode}`,
            source: "バンダイ公式",
            imageUrl,
            price,
            releaseWeek,
            brand,
            types: null,
          });
        }
      }

      await new Promise((r) => setTimeout(r, 500));
    }
  } catch (err) {
    console.error(`  ❌ バンダイ公式 失敗: ${err.message}`);
  }
  return articles;
}

// ========================================
// 2. タカラトミーアーツ公式（カレンダー + 詳細ページ）
// ========================================
async function collectFromTakaraTomy() {
  const articles = [];
  try {
    console.log("  📡 タカラトミーアーツ公式");
    const res = await fetch("https://www.takaratomy-arts.co.jp/items/gacha/calendar/");
    const html = await res.text();

    // 発売週セクション検出
    const weekSections = [];

    // パターン1: *3*月*9*日週発売
    const dateWeekRegex = /\*(\d+)\*月\*(\d+)\*日週発売/g;
    let secMatch;
    while ((secMatch = dateWeekRegex.exec(html)) !== null) {
      weekSections.push({
        pos: secMatch.index,
        week: `${secMatch[1]}月 ${secMatch[2]}日週`,
      });
    }

    // パターン2: *3*月発売週未定
    const undefinedRegex = /\*(\d+)\*月発売週未定/g;
    while ((secMatch = undefinedRegex.exec(html)) !== null) {
      weekSections.push({
        pos: secMatch.index,
        week: `${secMatch[1]}月 未定`,
      });
    }

    // 商品ブロック取得
    const blockRegex = /<a[^>]*item\.html\?n=(\w+)[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    const productList = [];

    while ((match = blockRegex.exec(html)) !== null) {
      const productId = match[1];
      const block = match[2];
      const blockPos = match.index;

      const imgMatch = block.match(/src="(https:\/\/www\.takaratomy-arts\.co\.jp\/upfiles\/products\/[^"]+)"/);
      const imageUrl = imgMatch ? imgMatch[1] : null;

      const nameMatch = block.match(/<p[^>]*>([^<]+)<\/p>/);
      const name = nameMatch ? nameMatch[1].trim() : "";

      let releaseWeek = "未定";
      for (const ws of weekSections) {
        if (ws.pos < blockPos) releaseWeek = ws.week;
      }

      if (name && name.length > 2) {
        productList.push({ productId, name, imageUrl, releaseWeek });
      }
    }

    // 詳細ページから価格・種類数取得
    console.log(`    → ${productList.length}件の詳細ページを取得中...`);
    for (const item of productList) {
      let price = null;
      let types = null;

      try {
        const detailUrl = `https://www.takaratomy-arts.co.jp/items/item.html?n=${item.productId}`;
        const dRes = await fetch(detailUrl);
        const dHtml = await dRes.text();

        const priceMatch = dHtml.match(/■価格[:：]\s*(\d{3,4})円/);
        price = priceMatch ? parseInt(priceMatch[1]) : null;

        const typesMatch = dHtml.match(/全(\d+)種/);
        types = typesMatch ? parseInt(typesMatch[1]) : null;

        // 詳細ページの発売時期で上書き
        const relMatch = dHtml.match(/(\d+)月(\d+)日週/);
        if (relMatch) {
          item.releaseWeek = `${relMatch[1]}月 ${relMatch[2]}日週`;
        }
      } catch (err) {
        console.error(`    ⚠️ ${item.name}: ${err.message}`);
      }

      articles.push({
        title: item.name,
        url: `https://www.takaratomy-arts.co.jp/items/item.html?n=${item.productId}`,
        source: "タカラトミーアーツ公式",
        imageUrl: item.imageUrl,
        price,
        releaseWeek: item.releaseWeek,
        brand: detectBrand(item.name),
        types,
      });

      // レート制限
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (err) {
    console.error(`  ❌ タカトミ公式 失敗: ${err.message}`);
  }
  return articles;
}

// ========================================
// メイン実行
// ========================================
async function main() {
  console.log("🏪 ガチャなう データ収集 v4\n");

  const results = {};

  console.log("[1/2] バンダイ ガシャポン公式");
  results.bandai = await collectFromBandai();
  console.log(`  → ${results.bandai.length}件\n`);

  console.log("[2/2] タカラトミーアーツ公式");
  results.takaratomy = await collectFromTakaraTomy();
  console.log(`  → ${results.takaratomy.length}件\n`);

  const all = [...results.bandai, ...results.takaratomy];

  // 重複排除
  const seen = new Set();
  const unique = all.filter((a) => {
    const key = a.title.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log("─".repeat(40));
  console.log(`✅ 合計: ${unique.length}件（重複排除後）`);
  console.log(`   バンダイ公式: ${results.bandai.length}件`);
  console.log(`   タカトミ公式: ${results.takaratomy.length}件`);

  const outputPath = path.join(__dirname, "../data/collected.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`\n💾 ${outputPath} に保存しました`);
}

main().catch(console.error);
