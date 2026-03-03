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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");
const NEW_TODAY_PATH = path.join(__dirname, "..", "data", "new-today.json");
const OUTPUT_DIR = path.join(__dirname, "..", "posts");

function generateHTML(product) {
  const imgSrc = product.img || "";
  const hasImage = imgSrc && !imgSrc.includes("placehold");

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
    `\ud83d\udcb0 ${product.price}\u5186 / \u5168${product.types}\u7a2e`,
    `\ud83d\udcc5 ${product.releaseWeek || "\u767a\u58f2\u65e5\u672a\u5b9a"}`,
    ``,
    `\ud83d\udc46 \u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u306e\u30ea\u30f3\u30af\u304b\u3089\u65b0\u4f5c\u60c5\u5831\u3092\u30c1\u30a7\u30c3\u30af\uff01`,
    `gacha-now.vercel.app`,
    ``,
    `#\u30ac\u30c1\u30e3\u30ac\u30c1\u30e3 #\u30ab\u30d7\u30bb\u30eb\u30c8\u30a4 #\u30ac\u30c1\u30e3\u306a\u3046 #\u65b0\u4f5c\u30ac\u30c1\u30e3 #\u30ac\u30b7\u30e3\u30dd\u30f3 #\u30ac\u30c1\u30e3\u6d3b #\u30ac\u30c1\u30e3\u597d\u304d\u3068\u7e4b\u304c\u308a\u305f\u3044 #\u30ab\u30d7\u30bb\u30eb\u30c8\u30a4\u597d\u304d`,
  ];
  if (product.brand && product.brand !== "\u305d\u306e\u4ed6") {
    lines[lines.length - 1] += ` #${product.brand}`;
  }
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

  const today = new Date().toISOString().split("T")[0];

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (let i = 0; i < newProducts.length; i++) {
    const product = newProducts[i];
    const idx = i + 1;
    console.log(`\n  [${idx}/${newProducts.length}] ${product.name}`);

    const htmlPath = path.join(OUTPUT_DIR, `post-${today}-${idx}.html`);
    const pngPath = path.join(OUTPUT_DIR, `post-${today}-${idx}.png`);
    const txtPath = path.join(OUTPUT_DIR, `post-${today}-${idx}.txt`);

    const html = generateHTML(product);
    fs.writeFileSync(htmlPath, html, "utf-8");

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080 });
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: pngPath, type: "png" });
    await page.close();
    console.log(`    \ud83d\udcf7 ${pngPath}`);

    const caption = generateCaption(product);
    fs.writeFileSync(txtPath, caption, "utf-8");
    console.log(`    \ud83d\udcdd ${txtPath}`);
  }

  await browser.close();
  console.log(`\n\u2705 \u5b8c\u4e86\uff01 ${newProducts.length}\u4ef6\u306e\u6295\u7a3f\u3092\u751f\u6210\u3057\u307e\u3057\u305f`);
}

main().catch((e) => { console.error("\u274c \u30a8\u30e9\u30fc:", e); process.exit(1); });
