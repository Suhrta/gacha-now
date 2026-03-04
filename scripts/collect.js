/**
 * collect.js v5 - ガチャガチャ新作情報を公式サイトから正確に収集
 *
 * 【v4からの変更点】
 * - キタンクラブ追加: Puppeteerで新商品ページから商品URL取得 → cheerioで詳細パース
 * - ブランド自動判定強化: BRAND_MAP + サイトカテゴリタグ + 商品名推定の3段階フォールバック
 * - 新IPが出ても自動でカテゴリ分けされる
 *
 * 対応メーカー:
 *   1. バンダイ（ガシャポン公式 scheduleページ）
 *   2. タカラトミーアーツ（カレンダー + 詳細ページ）
 *   3. キタンクラブ（新商品ページ → 詳細ページ）
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

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
  // キタンクラブ固有IP
  { keywords: ["コップのフチ子", "フチ子"], brand: "コップのフチ子" },
  { keywords: ["PUTITTO"], brand: "PUTITTO" },
  { keywords: ["コウペンちゃん"], brand: "コウペンちゃん" },
  { keywords: ["タローマン"], brand: "タローマン" },
  { keywords: ["可愛い嘘のカワウソ", "カワウソ"], brand: "可愛い嘘のカワウソ" },
  { keywords: ["おぱんちゅうさぎ"], brand: "おぱんちゅうさぎ" },
  { keywords: ["チェンソーマン"], brand: "チェンソーマン" },
  { keywords: ["ヒロアカ", "僕のヒーローアカデミア"], brand: "ヒロアカ" },
];

// カテゴリタグ除外リスト（ブランドではないタグ）
const CATEGORY_IGNORE = new Set([
  "新商品", "オリジナル", "企業コラボ", "キタンクラブオリジナル",
  "カプセルトイ", "ねこのかぶりもの", "座るシリーズ", "シリーズ生きる",
  "コップのフチ子シリーズ", "PUTITTOシリーズ", "フィギュア", "アーティスト",
]);

/**
 * ブランド判定（3段階フォールバック）
 * 1. BRAND_MAP キーワードマッチ
 * 2. サイトのカテゴリタグ（キタンクラブ等）
 * 3. 「その他」
 */
function detectBrand(name, categoryTags = []) {
  // 1. BRAND_MAP キーワードマッチ
  for (const entry of BRAND_MAP) {
    for (const kw of entry.keywords) {
      if (name.includes(kw)) return entry.brand;
    }
  }

  // 2. サイトのカテゴリタグから判定
  for (const tag of categoryTags) {
    const cleaned = tag.replace(/^#/, "").trim();
    if (cleaned && !CATEGORY_IGNORE.has(cleaned) && cleaned.length >= 2) {
      // タグがBRAND_MAPのブランド名に一致するか確認
      for (const entry of BRAND_MAP) {
        if (entry.brand === cleaned) return entry.brand;
        for (const kw of entry.keywords) {
          if (cleaned.includes(kw)) return entry.brand;
        }
      }
      // 一致しなければタグ名をそのまま新ブランドとして採用
      return cleaned;
    }
  }

  // 3. フォールバック
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
    for (let offset = -1; offset <= 1; offset++) {
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

      // 発売週セクション検出
      // HTML: <span class="pg-schedule__month--date">3</span>
      //       <span class="pg-schedule__month--text">月第</span>
      //       <span class="pg-schedule__month--date">1</span>
      //       <span class="pg-schedule__month--text">週より順次</span>
      const weekPositions = [];
      const weekRegex = /pg-schedule__month--date">\s*(\d+)\s*<\/span>\s*<span[^>]*>\s*月第\s*<\/span>\s*<span[^>]*>\s*(\d+)\s*<\/span>\s*<span[^>]*>\s*週/g;
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

        // 価格: <span class="c-card__price--main">500</span>
        const priceMatch = block.match(/c-card__price--main">\s*(\d+)\s*</);
        const price = priceMatch ? parseInt(priceMatch[1]) : null;

        // 商品名: <p class="c-card__name">商品名</p>
        const cardNameMatch = block.match(/c-card__name">\s*([^<]+)\s*</);
        let name = cardNameMatch ? cardNameMatch[1].trim() : "";

        // フラットガシャポン：altから取得
        if (!name || name.length < 3) {
          const altMatch = match[0].match(/alt="([^"]+)"/);
          if (altMatch) name = altMatch[1].trim();
        }

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
// 3. キタンクラブ公式（新商品ページ → 詳細ページ）
//    差分アクセス: 前回取得済みURLはcollected.jsonから復元してスキップ
// ========================================
async function collectFromKitan() {
  const articles = [];
  let browser;
  try {
    console.log("  📡 キタンクラブ公式");

    // 前回取得済みデータを読み込み（差分検出用）
    const collectedPath = path.join(__dirname, "../data/collected.json");
    let previousData = [];
    if (fs.existsSync(collectedPath)) {
      const allPrev = JSON.parse(fs.readFileSync(collectedPath, "utf-8"));
      previousData = allPrev.filter((a) => a.source === "キタンクラブ公式");
    }
    const previousUrls = new Set(previousData.map((a) => a.url));
    console.log(`    → 前回取得済み: ${previousUrls.size}件`);

    // キタンクラブはJSで動的読み込みなのでPuppeteerが必要
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // 商品URLリストを取得
    console.log("    → 商品ページ一覧を取得中...");
    await page.goto("https://kitan.jp/products/", { waitUntil: "networkidle2", timeout: 30000 });

    const productLinks = await page.evaluate(() => {
      const links = [];
      document.querySelectorAll('a[href*="/products/"]').forEach((a) => {
        const href = a.href;
        if (href.match(/\/products\/[a-z0-9_-]+\/?$/i) &&
            !href.includes("/products_category/") &&
            !href.includes("/product_category/") &&
            href !== "https://kitan.jp/products/") {
          links.push(href);
        }
      });
      return [...new Set(links)];
    });

    // 新商品ページにも遷移して追加取得
    try {
      await page.goto("https://kitan.jp/product_category/newproduct/", { waitUntil: "networkidle2", timeout: 30000 });
      const newProductLinks = await page.evaluate(() => {
        const links = [];
        document.querySelectorAll('a[href*="/products/"]').forEach((a) => {
          const href = a.href;
          if (href.match(/\/products\/[a-z0-9_-]+\/?$/i) &&
              !href.includes("/products_category/") &&
              !href.includes("/product_category/") &&
              href !== "https://kitan.jp/products/") {
            links.push(href);
          }
        });
        return [...new Set(links)];
      });
      for (const link of newProductLinks) {
        if (!productLinks.includes(link)) productLinks.push(link);
      }
    } catch (err) {
      console.log(`    ⚠️ 新商品ページ遷移失敗（メインリストで続行）: ${err.message}`);
    }

    await page.close();

    // 差分検出：新規URLだけ詳細ページにアクセス
    const newUrls = productLinks.filter((url) => !previousUrls.has(url));
    console.log(`    → 全${productLinks.length}件中、新規: ${newUrls.length}件、既存: ${productLinks.length - newUrls.length}件`);

    // 前回取得済みデータはそのまま復元
    for (const prev of previousData) {
      articles.push(prev);
    }

    // 新規URLだけ詳細ページにアクセス
    if (newUrls.length > 0) {
      console.log(`    → ${newUrls.length}件の新規商品ページを取得中...`);
      const detailPage = await browser.newPage();

      for (let i = 0; i < newUrls.length; i++) {
        const url = newUrls[i];
        try {
          await detailPage.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
          const html = await detailPage.content();
          const $ = cheerio.load(html);

          let name = $("h1").first().text().trim();
          if (!name) name = $("title").text().replace(/[｜|].*$/, "").trim();
          if (!name || name.length < 2) continue;

          const categoryTags = [];
          $("a[href*='/products_category/'], a[href*='/product_category/']").each((_, el) => {
            const tagText = $(el).text().trim();
            if (tagText) categoryTags.push(tagText);
          });
          $("*").each((_, el) => {
            const text = $(el).clone().children().remove().end().text().trim();
            const hashTags = text.match(/#[^\s#]+/g);
            if (hashTags) categoryTags.push(...hashTags);
          });

          const pageText = $.text();
          const priceMatch = pageText.match(/1回\s*(\d{2,4})\s*円/);
          const price = priceMatch ? parseInt(priceMatch[1]) : null;

          const typesMatch = pageText.match(/全\s*(\d+)\s*種/);
          const types = typesMatch ? parseInt(typesMatch[1]) : null;

          const relMatch = pageText.match(/(\d{4})年(\d{1,2})月(上旬|中旬|下旬|[\d]+日)/);
          let releaseWeek = "未定";
          if (relMatch) {
            releaseWeek = `${relMatch[2]}月 ${relMatch[3]}`;
          }

          let imageUrl = $('meta[property="og:image"]').attr("content") || null;
          if (!imageUrl) {
            const imgEl = $("img[src*='uploads']").first();
            imageUrl = imgEl.attr("src") || null;
          }

          const brand = detectBrand(name, [...new Set(categoryTags)]);

          articles.push({
            title: name,
            url,
            source: "キタンクラブ公式",
            imageUrl,
            price,
            releaseWeek,
            brand,
            types,
          });

          console.log(`    ✅ [${i + 1}/${newUrls.length}] ${name}`);
        } catch (err) {
          console.error(`    ⚠️ ${url}: ${err.message}`);
        }

        await new Promise((r) => setTimeout(r, 800));
      }

      await detailPage.close();
    } else {
      console.log("    → 新規商品なし、前回データをそのまま使用");
    }
  } catch (err) {
    console.error(`  ❌ キタンクラブ公式 失敗: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
  return articles;
}

// ========================================
// メイン実行
// ========================================
async function main() {
  console.log("🏪 ガチャなう データ収集 v5\n");

  const results = {};

  console.log("[1/3] バンダイ ガシャポン公式");
  results.bandai = await collectFromBandai();
  console.log(`  → ${results.bandai.length}件\n`);

  console.log("[2/3] タカラトミーアーツ公式");
  results.takaratomy = await collectFromTakaraTomy();
  console.log(`  → ${results.takaratomy.length}件\n`);

  console.log("[3/3] キタンクラブ公式");
  results.kitan = await collectFromKitan();
  console.log(`  → ${results.kitan.length}件\n`);

  const all = [...results.bandai, ...results.takaratomy, ...results.kitan];

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
  console.log(`   キタンクラブ公式: ${results.kitan.length}件`);

  const outputPath = path.join(__dirname, "../data/collected.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`\n💾 ${outputPath} に保存しました`);
}

main().catch(console.error);
