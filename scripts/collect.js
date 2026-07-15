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
import { detectBrand } from "./brand.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 「全○種」を抽出（全角数字にも対応）。取れなければ null
function extractTypes(html) {
  const m = html.match(/全\s*([0-9０-９]+)\s*種/);
  if (!m) return null;
  const half = m[1].replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
  const n = parseInt(half, 10);
  return Number.isFinite(n) && n > 0 && n <= 99 ? n : null;
}

// バンダイ詳細ページから種類数を取得（失敗時は null）
async function fetchBandaiTypes(janCode) {
  try {
    const res = await fetch(`https://gashapon.jp/products/detail.php?jan_code=${janCode}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;
    return extractTypes(await res.text());
  } catch {
    return null;
  }
}

// ブランド判定は scripts/brand.js に集約（collect/structure/rebrand で同じ定義を使う）

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
      const res = await fetch(url, {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  }
});
      const html = await res.text();

      // 発売週セクション検出
      // HTML: <span class="pg-schedule__month--date">3</span>
      //       <span class="pg-schedule__month--text">月第</span>
      //       <span class="pg-schedule__month--date">1</span>
      //       <span class="pg-schedule__month--text">週より順次</span>
      const weekPositions = [];
      const year = ym.slice(0, 4);
      const weekRegex = /pg-schedule__month--date">\s*(\d+)\s*<\/span>\s*<span[^>]*>\s*月第\s*<\/span>\s*<span[^>]*>\s*(\d+)\s*<\/span>\s*<span[^>]*>\s*週/g;
      let weekMatch;
      while ((weekMatch = weekRegex.exec(html)) !== null) {
        weekPositions.push({
          pos: weekMatch.index,
          week: `${year}年${weekMatch[1]}月 第${weekMatch[2]}週`,
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

        // ラインナップ画像配列（バンダイは _1.jpg 〜 _N.jpg で個別画像がある）
        const images = [];
        if (imageUrl) {
          images.push(imageUrl);
          // 画像IDを抽出して連番画像URLを生成（_2〜_types+1まで）
          const idMatch = imageUrl.match(/\/(\d+)_\d+\.\w+$/);
          if (idMatch) {
            const imgId = idMatch[1];
            const baseUrl = imageUrl.replace(/\/[a-z]+\/(\d+_\d+\.\w+)$/, "");
            const ext = imageUrl.match(/\.(\w+)$/)?.[1] || "jpg";
            const size = imageUrl.match(/\/model\/([^/]+)\//)?.[1] || "b";
            // types不明の場合はとりあえず最大12枚分URLを生成（存在しない画像は表示時にスキップ）
            for (let n = 2; n <= 12; n++) {
              images.push(`https://bandai-a.akamaihd.net/bc/img/model/${size}/${imgId}_${n}.${ext}`);
            }
          }
        }

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
          // 詳細ページから種類数を取得（一覧ページには載っていないため）
          const types = await fetchBandaiTypes(janCode);
          await new Promise((r) => setTimeout(r, 500)); // レート制限

          articles.push({
            title: name,
            url: `https://gashapon.jp/products/detail.php?jan_code=${janCode}`,
            source: "バンダイ公式",
            imageUrl,
            images,
            price,
            releaseWeek,
            brand,
            types,
          });
        }
      }

      await new Promise((r) => setTimeout(r, 1500));
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
    const currentYear = new Date().getFullYear();

    // パターン1: *3*月*9*日週発売（旧）/ <em>3</em>月<em>9</em>日週発売（新）
    const dateWeekRegex = /(?:\*|<em>)(\d+)(?:\*|<\/em>)月(?:\*|<em>)(\d+)(?:\*|<\/em>)日週発売/g;
    let secMatch;
    while ((secMatch = dateWeekRegex.exec(html)) !== null) {
      weekSections.push({
        pos: secMatch.index,
        week: `${currentYear}年${secMatch[1]}月 ${secMatch[2]}日週`,
      });
    }

    // パターン2: *3*月発売週未定（旧）/ <em>3</em>月発売週未定（新）
    const undefinedRegex = /(?:\*|<em>)(\d+)(?:\*|<\/em>)月発売週未定/g;
    while ((secMatch = undefinedRegex.exec(html)) !== null) {
      weekSections.push({
        pos: secMatch.index,
        week: `${currentYear}年${secMatch[1]}月 未定`,
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
        // パターン1: 「2026年3月9日週」
        const relMatch = dHtml.match(/(\d{4})年(\d+)月(\d+)日週/);
        if (relMatch) {
          item.releaseWeek = `${relMatch[1]}年${relMatch[2]}月 ${relMatch[3]}日週`;
        } else {
          // パターン2: 「3月9日週」（年なし）
          const relMatch2 = dHtml.match(/(\d+)月(\d+)日週/);
          if (relMatch2) {
            item.releaseWeek = `${currentYear}年${relMatch2[1]}月 ${relMatch2[2]}日週`;
          } else {
            // パターン3: 「2026年3月中旬」「2026年3月」等
            const relMatch3 = dHtml.match(/発売時期[:：]\s*(\d{4})年(\d+)月\s*(上旬|中旬|下旬)?/);
            if (relMatch3) {
              const suffix = relMatch3[3] || "";
              item.releaseWeek = `${relMatch3[1]}年${relMatch3[2]}月${suffix ? " " + suffix : ""}`;
            }
          }
        }
      } catch (err) {
        console.error(`    ⚠️ ${item.name}: ${err.message}`);
      }

      articles.push({
        title: item.name,
        url: `https://www.takaratomy-arts.co.jp/items/item.html?n=${item.productId}`,
        source: "タカラトミーアーツ公式",
        imageUrl: item.imageUrl,
        images: item.imageUrl ? [item.imageUrl] : [],
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

          // カテゴリタグ: ページ本文中のハッシュタグのみ取得
          // ※ナビゲーションの /products_category/ リンクは全ページ共通なので使わない
          const categoryTags = [];
          const bodyText = $("body").text();
          const hashMatches = bodyText.match(/#[^\s#<>]{2,}/g);
          if (hashMatches) {
            for (const tag of hashMatches) {
              const cleaned = tag.replace(/^#/, "").trim();
              // ナビ由来の一般的なカテゴリ名を除外
              if (!["新商品", "オリジナル", "企業コラボ", "キタンクラブオリジナル",
                    "カプセルトイ", "フィギュア", "アーティスト",
                    "wovn-translate-widget[wovn]"].includes(cleaned)) {
                categoryTags.push(cleaned);
              }
            }
          }

          const pageText = $.text();
          const priceMatch = pageText.match(/1回\s*(\d{2,4})\s*円/);
          const price = priceMatch ? parseInt(priceMatch[1]) : null;

          const typesMatch = pageText.match(/全\s*(\d+)\s*種/);
          const types = typesMatch ? parseInt(typesMatch[1]) : null;

          const relMatch = pageText.match(/(\d{4})年(\d{1,2})月(上旬|中旬|下旬|[\d]+日)/);
          let releaseWeek = "未定";
          if (relMatch) {
            releaseWeek = `${relMatch[1]}年${relMatch[2]}月 ${relMatch[3]}`;
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
            images: imageUrl ? [imageUrl] : [],
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
// 4. Qualia公式（商品一覧ページ → 詳細ページ）
//    cheerioで解析。ページネーション /distinations/page/N/
// ========================================
async function collectFromQualia() {
  const articles = [];
  let browser;
  try {
    console.log("  📡 Qualia公式");

    // 前回取得済みデータを読み込み
    const collectedPath = path.join(__dirname, "../data/collected.json");
    let previousData = [];
    if (fs.existsSync(collectedPath)) {
      const allPrev = JSON.parse(fs.readFileSync(collectedPath, "utf-8"));
      previousData = allPrev.filter((a) => a.source === "Qualia公式");
    }
    const previousUrls = new Set(previousData.map((a) => a.url));
    console.log(`    → 前回取得済み: ${previousUrls.size}件`);

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // 一覧ページから商品リンクを取得（3ページ分=約30件）
    const productLinks = [];
    const listPage = await browser.newPage();
    for (let pg = 1; pg <= 3; pg++) {
      const listUrl = pg === 1
        ? "https://qualia-45.jp/distinations/"
        : `https://qualia-45.jp/distinations/page/${pg}/`;
      try {
        await listPage.goto(listUrl, { waitUntil: "networkidle2", timeout: 20000 });
        const html = await listPage.content();
        const $ = cheerio.load(html);
        $('a[href*="/distinations/"]').each((_, el) => {
          const href = $(el).attr("href");
          if (href && href.match(/\/distinations\/[a-z0-9_-]+\/?$/i)
              && !href.includes("/page/")
              && !productLinks.includes(href)) {
            const fullUrl = href.startsWith("http") ? href : `https://qualia-45.jp${href}`;
            productLinks.push(fullUrl);
          }
        });
      } catch (err) {
        console.log(`    ⚠️ 一覧ページ${pg}: ${err.message}`);
      }
    }
    await listPage.close();
    console.log(`    → 一覧から${productLinks.length}件の商品URLを検出`);

    // 差分検出
    const newUrls = productLinks.filter((url) => !previousUrls.has(url));
    console.log(`    → 新規: ${newUrls.length}件、既存: ${productLinks.length - newUrls.length}件`);

    // 前回データ復元
    for (const prev of previousData) {
      articles.push(prev);
    }

    // 新規URLだけ詳細ページにアクセス
    if (newUrls.length > 0) {
      const detailPage = await browser.newPage();
      for (let i = 0; i < newUrls.length; i++) {
        const url = newUrls[i];
        try {
          await detailPage.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
          const html = await detailPage.content();
          const $ = cheerio.load(html);

          // 商品名
          let name = $("h2").first().text().trim() || $("h3").first().text().trim();
          if (!name) name = $("title").text().replace(/\s*\|.*$/, "").trim();
          if (!name || name.length < 2) continue;

          // 商品情報テキスト
          const pageText = $.text();

          // 発売日
          const relMatch = pageText.match(/発売日[：:]\s*(\d{4})年(\d{1,2})月/);
          let releaseWeek = "未定";
          if (relMatch) {
            releaseWeek = `${relMatch[1]}年${relMatch[2]}月`;
            // 上旬/中旬/下旬があれば追加
            const detailMatch = pageText.match(/発売日[：:].*?(\d{4})年(\d{1,2})月\s*(上旬|中旬|下旬)?/);
            if (detailMatch && detailMatch[3]) {
              releaseWeek += ` ${detailMatch[3]}`;
            }
          }

          // 価格・種類
          const priceMatch = pageText.match(/(\d{2,4})円/);
          const price = priceMatch ? parseInt(priceMatch[1]) : null;
          const typesMatch = pageText.match(/全\s*(\d+)\s*種/);
          const types = typesMatch ? parseInt(typesMatch[1]) : null;

          // 画像
          let imageUrl = $('meta[property="og:image"]').attr("content") || null;
          if (!imageUrl) {
            const imgEl = $("img[src*='wp-content']").first();
            imageUrl = imgEl.attr("src") || null;
          }

          const brand = detectBrand(name);

          articles.push({
            title: name,
            url,
            source: "Qualia公式",
            imageUrl,
            images: imageUrl ? [imageUrl] : [],
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
    console.error(`  ❌ Qualia公式 失敗: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
  return articles;
}

// ========================================
// 5. ブシロードクリエイティブ公式（ブシカプ！サイト）
//    一覧ページ → 詳細ページ（カプセルトイのみ）
// ========================================
async function collectFromBushiroad() {
  const articles = [];
  let browser;
  try {
    console.log("  📡 ブシロードクリエイティブ公式");

    const collectedPath = path.join(__dirname, "../data/collected.json");
    let previousData = [];
    if (fs.existsSync(collectedPath)) {
      const allPrev = JSON.parse(fs.readFileSync(collectedPath, "utf-8"));
      previousData = allPrev.filter((a) => a.source === "ブシロードクリエイティブ公式");
    }
    const previousUrls = new Set(previousData.map((a) => a.url));
    console.log(`    → 前回取得済み: ${previousUrls.size}件`);

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // 一覧ページ（カプセルトイ、新着順）3ページ分
    const productLinks = [];
    const listPage = await browser.newPage();
    for (let pg = 1; pg <= 3; pg++) {
      const listUrl = pg === 1
        ? "https://capsule.bushiroad-creative.com/product/?gr=capsuletoy"
        : `https://capsule.bushiroad-creative.com/product/?gr=capsuletoy&page=${pg}`;
      try {
        await listPage.goto(listUrl, { waitUntil: "networkidle2", timeout: 20000 });
        const html = await listPage.content();
        const $ = cheerio.load(html);
        $('a[href*="/product/"]').each((_, el) => {
          const href = $(el).attr("href");
          if (href && href.match(/\/product\/\d+\/?$/)) {
            const fullUrl = href.startsWith("http") ? href : `https://capsule.bushiroad-creative.com${href}`;
            if (!productLinks.includes(fullUrl)) productLinks.push(fullUrl);
          }
        });
      } catch (err) {
        console.log(`    ⚠️ 一覧ページ${pg}: ${err.message}`);
      }
    }
    await listPage.close();
    console.log(`    → 一覧から${productLinks.length}件の商品URLを検出`);

    const newUrls = productLinks.filter((url) => !previousUrls.has(url));
    console.log(`    → 新規: ${newUrls.length}件、既存: ${productLinks.length - newUrls.length}件`);

    for (const prev of previousData) {
      articles.push(prev);
    }

    if (newUrls.length > 0) {
      const detailPage = await browser.newPage();
      for (let i = 0; i < newUrls.length; i++) {
        const url = newUrls[i];
        try {
          await detailPage.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
          const html = await detailPage.content();
          const $ = cheerio.load(html);

          // 商品名
          let name = $("h3").first().text().trim();
          if (!name) name = $("title").text().replace(/\s*[｜|].*$/, "").trim();
          if (!name || name.length < 2) continue;

          // 商品情報
          const pageText = $.text();

          // 発売日: "2026年6月下旬発売予定" or "2026年3月発売予定"
          const relMatch = pageText.match(/(\d{4})年(\d{1,2})月\s*(上旬|中旬|下旬)?/);
          let releaseWeek = "未定";
          if (relMatch) {
            releaseWeek = `${relMatch[1]}年${relMatch[2]}月`;
            if (relMatch[3]) releaseWeek += ` ${relMatch[3]}`;
          }

          // 価格: "500円 (税込)"
          const priceMatch = pageText.match(/(\d{2,4})円\s*[\(（]?税込/);
          const price = priceMatch ? parseInt(priceMatch[1]) : null;

          // 種類: "全5種"
          const typesMatch = pageText.match(/全\s*(\d+)\s*種/);
          const types = typesMatch ? parseInt(typesMatch[1]) : null;

          // 画像
          let imageUrl = $('meta[property="og:image"]').attr("content") || null;
          if (!imageUrl) {
            const imgEl = $("img[src*='wp-content']").first();
            imageUrl = imgEl.attr("src") || null;
          }

          const brand = detectBrand(name);

          articles.push({
            title: name,
            url,
            source: "ブシロードクリエイティブ公式",
            imageUrl,
            images: imageUrl ? [imageUrl] : [],
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
    console.error(`  ❌ ブシロードクリエイティブ公式 失敗: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
  return articles;
}

// ========================================
// 6. ケンエレファント公式（KENELE STOREから取得）
//    ECサイトの商品一覧から取得
// ========================================
async function collectFromKenelephant() {
  const articles = [];
  let browser;
  try {
    console.log("  📡 ケンエレファント公式");

    const collectedPath = path.join(__dirname, "../data/collected.json");
    let previousData = [];
    if (fs.existsSync(collectedPath)) {
      const allPrev = JSON.parse(fs.readFileSync(collectedPath, "utf-8"));
      previousData = allPrev.filter((a) => a.source === "ケンエレファント公式");
    }
    const previousUrls = new Set(previousData.map((a) => a.url));
    console.log(`    → 前回取得済み: ${previousUrls.size}件`);

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // KENELE STOREのカプセルトイ商品一覧（ページ1〜3）
    const productLinks = [];
    const listPage = await browser.newPage();
    for (let pg = 1; pg <= 3; pg++) {
      const listUrl = `https://kenelestore.jp/collections/all?page=${pg}`;
      try {
        await listPage.goto(listUrl, { waitUntil: "networkidle2", timeout: 20000 });
        const html = await listPage.content();
        const $ = cheerio.load(html);
        $('a[href*="/products/"]').each((_, el) => {
          const href = $(el).attr("href");
          if (href && href.match(/\/products\/[a-z0-9-]+$/i)) {
            const fullUrl = `https://kenelestore.jp${href}`;
            if (!productLinks.includes(fullUrl)) productLinks.push(fullUrl);
          }
        });
      } catch (err) {
        console.log(`    ⚠️ 一覧ページ${pg}: ${err.message}`);
      }
    }
    await listPage.close();
    console.log(`    → 一覧から${productLinks.length}件の商品URLを検出`);

    const newUrls = productLinks.filter((url) => !previousUrls.has(url));
    console.log(`    → 新規: ${newUrls.length}件、既存: ${productLinks.length - newUrls.length}件`);

    for (const prev of previousData) {
      articles.push(prev);
    }

    if (newUrls.length > 0) {
      const detailPage = await browser.newPage();
      for (let i = 0; i < newUrls.length; i++) {
        const url = newUrls[i];
        try {
          await detailPage.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
          const html = await detailPage.content();
          const $ = cheerio.load(html);

          // 商品名
          let name = $("h1").first().text().trim();
          if (!name) name = $("title").text().replace(/\s*[–—|].*$/, "").trim();
          if (!name || name.length < 2) continue;

          const pageText = $.text();

          // 発売日: "2026年3月頃発売予定" or "2026年6月頃"
          const relMatch = pageText.match(/(\d{4})年(\d{1,2})月\s*(頃|上旬|中旬|下旬)?/);
          let releaseWeek = "未定";
          if (relMatch) {
            releaseWeek = `${relMatch[1]}年${relMatch[2]}月`;
            if (relMatch[3] && relMatch[3] !== "頃") releaseWeek += ` ${relMatch[3]}`;
          }

          // 価格: Shopifyサイトなので "¥400" or "400円"
          const priceMatch = pageText.match(/[¥￥](\d{2,4})/) || pageText.match(/(\d{2,4})円/);
          const price = priceMatch ? parseInt(priceMatch[1]) : null;

          // 種類
          const typesMatch = pageText.match(/全\s*(\d+)\s*種/);
          const types = typesMatch ? parseInt(typesMatch[1]) : null;

          // 画像
          let imageUrl = $('meta[property="og:image"]').attr("content") || null;
          if (!imageUrl) {
            const imgEl = $("img[src*='cdn.shopify']").first();
            imageUrl = imgEl.attr("src") || null;
          }

          const brand = detectBrand(name);

          articles.push({
            title: name,
            url,
            source: "ケンエレファント公式",
            imageUrl,
            images: imageUrl ? [imageUrl] : [],
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
    console.error(`  ❌ ケンエレファント公式 失敗: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
  return articles;
}

// ========================================
// メイン実行
// ========================================
async function main() {
  console.log("🏪 ガチャなう データ収集 v6\n");

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

  // TODO: 画像取得修正後に有効化
  // console.log("[4/6] Qualia公式");
  // results.qualia = await collectFromQualia();
  // console.log(`  → ${results.qualia.length}件\n`);

  // console.log("[5/6] ブシロードクリエイティブ公式");
  // results.bushiroad = await collectFromBushiroad();
  // console.log(`  → ${results.bushiroad.length}件\n`);

  // console.log("[6/6] ケンエレファント公式");
  // results.kenelephant = await collectFromKenelephant();
  // console.log(`  → ${results.kenelephant.length}件\n`);

  const all = [
    ...results.bandai,
    ...results.takaratomy,
    ...results.kitan,
  ];

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
