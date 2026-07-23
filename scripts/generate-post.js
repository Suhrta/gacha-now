/**
 * generate-post.js
 * data/new-today.jsonを読み、新規追加された商品の件数分だけ
 * Instagram投稿用の画像(PNG)とキャプション(TXT)を自動生成
 * 新規商品が0件なら何も生成しない
 *
 * 使い方: node scripts/generate-post.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";
import { mainImageUrl } from "../lib/images.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");
const NEW_TODAY_PATH = path.join(__dirname, "..", "data", "new-today.json");
const OUTPUT_DIR = path.join(__dirname, "..", "public", "posts");

// Instagramのカルーセルは2〜10枚。types=10 の商品は実在11枚になるため上限で切る。
const CAROUSEL_MAX = 10;
// PNGだと1枚800KB近くあり、複数枚化でリポジトリが破綻する。
// JPEG q90 なら約1/5（769KB→161KB）で、InstagramもJPEGを推奨している。
const JPEG_QUALITY = 90;

// 商品画像を取得して data URI にする。
//
// puppeteer に外部URLを読ませると、ヘッドレスChromeを弾くサイトで画像が読めず
// 投稿画像が空になる（実際にブシロードの商品で真っ白なままInstagramに投稿された）。
// ここで通常のUAで取得して埋め込めば、ヘッドレス側は一切外部通信しなくて済む。
// 仕入れ元CDNの障害時に空の投稿を出さないよう、取得できなければ null を返して
// プレースホルダに倒す。
async function fetchImageAsDataUri(url) {
  if (!url || url.includes("placehold")) return null;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.log(`    ⚠️ 画像取得失敗 HTTP ${res.status}: ${url.slice(0, 60)}`);
      return null;
    }
    const type = res.headers.get("content-type") || "";
    // メンテ中のサイトは画像URLに 200 + HTML を返すことがある（タカラトミーアーツで実例）
    if (!type.startsWith("image/")) {
      console.log(`    ⚠️ 画像ではない(${type}): ${url.slice(0, 60)}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch (e) {
    console.log(`    ⚠️ 画像取得エラー: ${e.message}`);
    return null;
  }
}

// 投稿カードは1080pxで書き出すため、収集時の560px（バンダイ）では拡大されて
// ボヤける。1200px版（/xl/）を優先し、取れなければ元のURLに戻す。
// 全件で /xl/ が存在する保証はないので、フォールバックがないと
// 画質改善のつもりが投稿からプレースホルダを出すことになる。
async function fetchBestImage(url) {
  const large = mainImageUrl(url);
  if (large !== url) {
    const hit = await fetchImageAsDataUri(large);
    if (hit) return hit;
    console.log(`    ↩️ /xl/ が取れないため元サイズに戻します`);
  }
  return fetchImageAsDataUri(url);
}

// 投稿に使う画像URLを決める。
// バンダイは _1 がパッケージ、_2〜_(types+1) が各種の個別画像で、
// products.json の images は存在確認せず12枚分生成されている（collect.js）ため、
// 実在する枚数だけを types から割り出す。Instagramのカルーセルは10枚が上限。
function postImageUrls(product) {
  const images = Array.isArray(product.images) ? product.images : [];
  if (images.length <= 1 || !product.img?.includes("bandai-a.akamaihd.net")) {
    return [product.img].filter(Boolean);
  }
  const real = product.types ? product.types + 1 : 1;
  return images.slice(0, Math.min(real, CAROUSEL_MAX));
}

function generateHTML(product, imgDataUri) {
  const imgSrc = imgDataUri || "";
  const hasImage = Boolean(imgDataUri);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=DotGothic16&family=Noto+Sans+JP:wght@700;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; overflow: hidden; }
  .card {
    width: 1080px; height: 1080px; background: #FFFAF3;
    position: relative; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
  }
  .card::before {
    content: ''; position: absolute; inset: 0;
    background-image: radial-gradient(circle, #F0E6D6 1.5px, transparent 1.5px);
    background-size: 24px 24px; z-index: 0;
  }
  .machine {
    position: relative; z-index: 2; width: 920px;
    background: linear-gradient(180deg, #FFFFFF 0%, #F8F4EF 100%);
    border: 4px solid #E8DDD0; border-radius: 28px 28px 20px 20px;
    box-shadow: 0 12px 40px rgba(74,55,40,0.1);
  }
  .machine-top {
    height: 10px; background: linear-gradient(135deg, #E8756D, #E8756DCC);
    border-radius: 24px 24px 0 0;
  }
  .image-window {
    margin: 14px 18px 18px; border-radius: 14px; overflow: hidden;
    border: 3px solid #E8DDD0; background: #FFF8F0;
  }
  .image-window img {
    width: 100%; aspect-ratio: 1/1; object-fit: cover;
    object-position: top; display: block;
  }
  .image-placeholder {
    width: 100%; aspect-ratio: 1/1; background: #FFF8F0;
    display: flex; align-items: center; justify-content: center; font-size: 120px;
  }
  .deco { position: absolute; border-radius: 50%; z-index: 1; opacity: 0.18; }
  .d1 { width: 40px; height: 40px; background: #F5A8A2; top: 20px; left: 30px; }
  .d2 { width: 35px; height: 35px; background: #A8D8EA; top: 15px; right: 40px; }
  .d3 { width: 45px; height: 45px; background: #F9E4B7; bottom: 30px; left: 40px; }
  .d4 { width: 38px; height: 38px; background: #B8E6C8; bottom: 35px; right: 35px; }
</style>
</head>
<body>
  <div class="card">
    <div class="deco d1"></div><div class="deco d2"></div>
    <div class="deco d3"></div><div class="deco d4"></div>
    <div class="machine">
      <div class="machine-top"></div>
      <div class="image-window">
        ${hasImage
          ? `<img src="${imgSrc}" alt="">`
          : `<div class="image-placeholder">\ud83c\udfaa</div>`
        }
      </div>
    </div>
  </div>
</body>
</html>`;
}

function generateCaption(product) {
  const lines = [
    `\ud83c\udfaa ${product.name}`,
    ``,
    `\ud83d\udcb0 ${product.price}\u5186${product.types ? ` / \u5168${product.types}\u7a2e` : ""}`,
    `\ud83d\udcc5 ${product.releaseWeek || "\u767a\u58f2\u65e5\u672a\u5b9a"}`,
    ``,
    `\ud83d\udc46 \u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u306e\u30ea\u30f3\u30af\u304b\u3089\u65b0\u4f5c\u60c5\u5831\u3092\u30c1\u30a7\u30c3\u30af\uff01`,
    `gacha-now.net`,
    ``,
    `#\u30ac\u30c1\u30e3\u30ac\u30c1\u30e3 #\u30ab\u30d7\u30bb\u30eb\u30c8\u30a4 #\u30ac\u30c1\u30e3\u306a\u3046 #\u65b0\u4f5c\u30ac\u30c1\u30e3 #\u30ac\u30b7\u30e3\u30dd\u30f3 #\u30ac\u30c1\u30e3\u6d3b #\u30ac\u30c1\u30e3\u597d\u304d\u3068\u7e4b\u304c\u308a\u305f\u3044 #\u30ab\u30d7\u30bb\u30eb\u30c8\u30a4\u597d\u304d`,
  ];
  if (product.brand && product.brand !== "\u305d\u306e\u4ed6") {
    lines[lines.length - 1] += ` #${product.brand}`;
  }
  return lines.join("\n");
}

function generateXCaption(product) {
  const lines = [
    `\ud83c\udfaa ${product.name}`,
    ``,
    `\ud83d\udcb0 ${product.price}\u5186${product.types ? ` / \u5168${product.types}\u7a2e` : ""}`,
    `\ud83d\udcc5 ${product.releaseWeek || "\u767a\u58f2\u65e5\u672a\u5b9a"}`,
    ``,
    `gacha-now.net`,
    ``,
  ];
  const tags = [`#\u30ac\u30c1\u30e3\u30ac\u30c1\u30e3`];
  if (product.brand && product.brand !== "\u305d\u306e\u4ed6") {
    tags.push(`#${product.brand}`);
  }
  lines.push(tags.join(" "));
  return lines.join("\n");
}

async function main() {
  console.log("\ud83d\udcf8 Instagram\u6295\u7a3f\u3092\u751f\u6210\u4e2d...");

  if (!fs.existsSync(NEW_TODAY_PATH)) {
    console.log("  \u23ed\ufe0f new-today.json \u306a\u3057\u3001\u30b9\u30ad\u30c3\u30d7");
    return;
  }

  const newTodayNames = JSON.parse(fs.readFileSync(NEW_TODAY_PATH, "utf-8"));
  console.log(`  \ud83c\udd95 \u65b0\u898f\u5546\u54c1: ${newTodayNames.length}\u4ef6`);

  if (newTodayNames.length === 0) {
    console.log("  \u23ed\ufe0f \u65b0\u898f\u5546\u54c1\u306a\u3057\u3001\u6295\u7a3f\u751f\u6210\u3092\u30b9\u30ad\u30c3\u30d7");
    return;
  }

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));
  const nameSet = new Set(newTodayNames);
  const newProducts = products.filter((p) => nameSet.has(p.name));

  newProducts.sort((a, b) => {
    if (a.hot && !b.hot) return -1;
    if (!a.hot && b.hot) return 1;
    return 0;
  });

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const jstHour = String((now.getUTCHours() + 9) % 24).padStart(2, "0");
  // ファイル名: post-2026-03-10-08h-1.png

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (let i = 0; i < newProducts.length; i++) {
    const product = newProducts[i];
    const idx = i + 1;
    const base = `post-${today}-${jstHour}h-${idx}`;
    const urls = postImageUrls(product);
    console.log(`\n  [${idx}/${newProducts.length}] ${product.name}（${urls.length}枚）`);

    // カルーセルは1スライド1枚のカードとして書き出す。
    // 連番は -1.jpg, -2.jpg …（1枚だけの商品も同じ規則にして投稿側を単純に保つ）
    let slide = 0;
    for (const url of urls) {
      const imgDataUri = await fetchBestImage(url);
      // 仕入れ元CDNが落ちている場合、1枚目はプレースホルダを出してでも投稿するが、
      // 2枚目以降は欠けたまま並べても意味がないので落とす
      if (!imgDataUri && slide > 0) continue;
      slide++;

      const htmlPath = path.join(OUTPUT_DIR, `${base}-${slide}.html`);
      const jpgPath = path.join(OUTPUT_DIR, `${base}-${slide}.jpg`);
      fs.writeFileSync(htmlPath, generateHTML(product, imgDataUri), "utf-8");

      const page = await browser.newPage();
      await page.setViewport({ width: 1080, height: 1080 });
      await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0", timeout: 30000 });
      await page.evaluate(() => document.fonts.ready);
      await new Promise((r) => setTimeout(r, 1000));
      await page.screenshot({ path: jpgPath, type: "jpeg", quality: JPEG_QUALITY });
      await page.close();
      console.log(`    \ud83d\udcf7 ${path.basename(jpgPath)}`);
    }

    const txtPath = path.join(OUTPUT_DIR, `${base}.txt`);
    fs.writeFileSync(txtPath, generateCaption(product), "utf-8");
    console.log(`    \ud83d\udcdd ${path.basename(txtPath)}`);

    const xTxtPath = path.join(OUTPUT_DIR, `${base}.x.txt`);
    fs.writeFileSync(xTxtPath, generateXCaption(product), "utf-8");
    console.log(`    \ud83d\udcdd ${path.basename(xTxtPath)} (X用)`);
  }

  await browser.close();
  console.log(`\n\u2705 \u5b8c\u4e86\uff01 ${newProducts.length}\u4ef6\u306e\u6295\u7a3f\u3092\u751f\u6210\u3057\u307e\u3057\u305f`);
}

main().catch((e) => { console.error("\u274c \u30a8\u30e9\u30fc:", e); process.exit(1); });
