/**
 * collect.js v3 - ガチャガチャ新作情報を4ソースから網羅的に収集
 * 
 * 【修正点（v2からの変更）】
 * - タカトミ: img alt属性から商品名を取得するように変更
 * - ガチャアイランド: RSS的なアプローチではなく、個別記事URLのパターン取得に変更
 * - PR TIMES: URLをencodeURIでエンコードして日本語URL問題を解消
 */

import Parser from "rss-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ========================================
// 1. バンダイ ガシャポン公式（画像URL取得付き）
// ========================================
async function collectFromBandai() {
  const articles = [];
  try {
    console.log("  📡 バンダイ ガシャポン公式");
    const res = await fetch("https://gashapon.jp/schedule/");
    const html = await res.text();

    // 画像URL + 商品名 + jan_code を一括取得
    // パターン: <img src="https://bandai-a.akamaihd.net/...jpg"> ... detail.php?jan_code=XXX ... 商品名
    const blockRegex = /<a[^>]*href="[^"]*detail\.php\?jan_code=(\d+)"[^>]*>([\s\S]*?)<\/a>/g;
    let match;

    while ((match = blockRegex.exec(html)) !== null) {
      const janCode = match[1];
      const block = match[2];

      // ブロック内から画像URLを取得
      const imgMatch = block.match(/src="(https:\/\/bandai-a\.akamaihd\.net[^"]+)"/);
      const imageUrl = imgMatch ? imgMatch[1] : null;

      // ブロック内から商品名を取得（最後のテキストノード）
      const nameMatch = block.match(/>\s*([^<]{3,})\s*</g);
      let name = "";
      if (nameMatch) {
        // 最も長いテキストを商品名とする
        for (const m of nameMatch) {
          const text = m.replace(/^>\s*/, "").replace(/\s*<$/, "").trim();
          if (text.length > name.length && !text.includes("ガシャポン") && !text.includes("円")) {
            name = text;
          }
        }
      }

      if (name && name.length > 2 && !name.startsWith("*")) {
        articles.push({
          title: name,
          url: `https://gashapon.jp/products/detail.php?jan_code=${janCode}`,
          summary: `バンダイ ガシャポン: ${name}`,
          publishedAt: new Date().toISOString(),
          source: "バンダイ公式",
          imageUrl: imageUrl,
        });
      }
    }
  } catch (err) {
    console.error(`  ❌ バンダイ公式 失敗: ${err.message}`);
  }
  return articles;
}

// ========================================
// 2. タカラトミーアーツ公式（修正v3: 実HTML構造に完全対応）
// ========================================
async function collectFromTakaraTomy() {
  const articles = [];
  try {
    console.log("  📡 タカラトミーアーツ公式");
    const res = await fetch("https://www.takaratomy-arts.co.jp/items/gacha/calendar/");
    const html = await res.text();

    // 実際のHTML:
    // <a href="../../item.html?n=Y066399">
    //   <div class="img"><img src="...Y066399_b.jpg" alt="" loading="lazy"></div>
    //   <p class="black">東京ばな奈 スクイーズマスコット </p>
    // </a>

    const blockRegex = /<a[^>]*item\.html\?n=(\w+)[^>]*>([\s\S]*?)<\/a>/g;
    let match;

    while ((match = blockRegex.exec(html)) !== null) {
      const productId = match[1];
      const block = match[2];

      // 画像URL: src="https://www.takaratomy-arts.co.jp/upfiles/products/..."
      const imgMatch = block.match(/src="(https:\/\/www\.takaratomy-arts\.co\.jp\/upfiles\/products\/[^"]+)"/);
      const imageUrl = imgMatch ? imgMatch[1] : null;

      // 商品名: <p class="black">商品名</p>
      const nameMatch = block.match(/<p[^>]*>([^<]+)<\/p>/);
      const name = nameMatch ? nameMatch[1].trim() : "";

      if (name && name.length > 2) {
        articles.push({
          title: name,
          url: `https://www.takaratomy-arts.co.jp/items/item.html?n=${productId}`,
          summary: `タカラトミーアーツ ガチャ: ${name}`,
          publishedAt: new Date().toISOString(),
          source: "タカラトミーアーツ公式",
          imageUrl: imageUrl,
        });
      }
    }
  } catch (err) {
    console.error(`  ❌ タカトミ公式 失敗: ${err.message}`);
  }
  return articles;
}

// ========================================
// 3. ガチャガチャアイランド（修正: 記事URL + タイトル取得方式に変更）
// ========================================
async function collectFromGachaIsland() {
  const articles = [];

  async function fetchPage(url, label) {
    try {
      console.log(`  📡 ${label}`);
      const res = await fetch(url);
      if (!res.ok) return;
      const html = await res.text();

      // ガチャアイランドの一覧ページの構造:
      // 商品は個別記事へのリンクで掲載されている
      // URLパターン: https://gacha-island.jp/数字/
      // タイトルはaタグ内や画像のalt属性に入っている

      // 方法1: <a>タグのhrefとテキストを取得
      const linkRegex = /href="(https:\/\/gacha-island\.jp\/(\d+)\/)"[^>]*>([^<]*)</g;
      let match;

      while ((match = linkRegex.exec(html)) !== null) {
        const articleUrl = match[1];
        const title = match[3].trim();
        if (title && title.length > 3 && !title.includes("一覧") && !title.includes("スケジュール")) {
          articles.push({
            title: title,
            url: articleUrl,
            summary: `ガチャガチャアイランド: ${title}`,
            publishedAt: new Date().toISOString(),
            source: label,
          });
        }
      }

      // 方法2: imgのalt属性からも取得（タイトルがリンクテキストにない場合の補完）
      const imgRegex = /gacha-island\.jp\/(\d+)\/"[^>]*>[\s\S]*?<img[^>]*alt="([^"]+)"/g;
      while ((match = imgRegex.exec(html)) !== null) {
        const articleUrl = `https://gacha-island.jp/${match[1]}/`;
        const title = match[2].trim();
        if (title && title.length > 3) {
          articles.push({
            title: title,
            url: articleUrl,
            summary: `ガチャガチャアイランド: ${title}`,
            publishedAt: new Date().toISOString(),
            source: label,
          });
        }
      }
    } catch (err) {
      console.error(`  ❌ ${label} 失敗: ${err.message}`);
    }
  }

  // 当月
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  await fetchPage(
    `https://gacha-island.jp/gacha-release-schedule/release${y}${m}/`,
    `ガチャアイランド（${parseInt(m)}月）`
  );

  // 来月（先行情報）
  const next = new Date(now);
  next.setMonth(next.getMonth() + 1);
  const ny = next.getFullYear();
  const nm = String(next.getMonth() + 1).padStart(2, "0");
  await fetchPage(
    `https://gacha-island.jp/gacha-release-schedule/release${ny}${nm}/`,
    `ガチャアイランド（${parseInt(nm)}月・先行）`
  );

  return articles;
}

// ========================================
// 4. PR TIMES（修正: encodeURIで日本語URL対応）
// ========================================
async function collectFromPRTimes() {
  const parser = new Parser();
  const articles = [];
  const seenUrls = new Set();

  // キーワードごとにRSSフィードを取得
  const keywords = ["ガチャガチャ", "カプセルトイ", "ガシャポン"];

  for (const kw of keywords) {
    try {
      console.log(`  📡 PR TIMES - ${kw}`);
      // encodeURIComponent で日本語をURLエンコード
      const url = `https://prtimes.jp/rss/keyword.rss?keyword=${encodeURIComponent(kw)}`;
      const result = await parser.parseURL(url);

      for (const item of result.items) {
        if (seenUrls.has(item.link)) continue;
        seenUrls.add(item.link);

        articles.push({
          title: item.title,
          url: item.link,
          summary: item.contentSnippet?.slice(0, 500) || "",
          publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          source: "PR TIMES",
        });
      }
    } catch (err) {
      console.error(`  ❌ PR TIMES - ${kw} 失敗: ${err.message}`);
    }
  }

  return articles;
}

// ========================================
// メイン実行
// ========================================
async function main() {
  console.log("🏪 ガチャなう データ収集 v3\n");

  const results = {};

  console.log("[1/4] バンダイ ガシャポン公式");
  results.bandai = await collectFromBandai();
  console.log(`  → ${results.bandai.length}件\n`);

  console.log("[2/4] タカラトミーアーツ公式");
  results.takaratomy = await collectFromTakaraTomy();
  console.log(`  → ${results.takaratomy.length}件\n`);

  console.log("[3/4] ガチャガチャアイランド");
  results.island = await collectFromGachaIsland();
  console.log(`  → ${results.island.length}件\n`);

  console.log("[4/4] PR TIMES");
  results.prtimes = await collectFromPRTimes();
  console.log(`  → ${results.prtimes.length}件\n`);

  // 全ソースをマージ
  const all = [
    ...results.bandai,
    ...results.takaratomy,
    ...results.island,
    ...results.prtimes,
  ];

  // 重複排除（商品名ベース）
  const seen = new Set();
  const unique = all.filter((a) => {
    const key = a.title.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  // サマリー
  console.log("─".repeat(40));
  console.log(`✅ 合計: ${unique.length}件（重複排除後）`);
  console.log(`   バンダイ公式:      ${results.bandai.length}件`);
  console.log(`   タカトミ公式:      ${results.takaratomy.length}件`);
  console.log(`   ガチャアイランド:  ${results.island.length}件`);
  console.log(`   PR TIMES:          ${results.prtimes.length}件`);

  // 保存
  const outputPath = path.join(__dirname, "../data/collected.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(unique, null, 2), "utf-8");
  console.log(`\n💾 ${outputPath} に保存しました`);
}

main().catch(console.error);
