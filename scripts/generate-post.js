/**
 * generate-post.js
 * products.jsonから新着HOT商品をピックアップして
 * Instagram投稿用の画像(PNG)とキャプション(TXT)を自動生成
 *
 * 使い方: node scripts/generate-post.js
 * 必要: npm install puppeteer (scripts/内で)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");
const OUTPUT_DIR = path.join(__dirname, "..", "posts");

// 今月の新着HOT商品から1件選ぶ
function pickProduct(products) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  // 今月発売のHOT商品
  const hotNew = products.filter((p) => {
    if (!p.hot) return false;
    const m = p.releaseWeek?.match(/(\d+)月/);
    return m && parseInt(m[1]) === currentMonth;
  });

  // HOTがなければ今月の新作から
  const pool = hotNew.length > 0 ? hotNew : products.filter((p) => {
    const m = p.releaseWeek?.match(/(\d+)月/);
    return m && parseInt(m[1]) === currentMonth;
  });

  if (pool.length === 0) return products[0]; // フォールバック

  // 日付ベースでローテーション（毎日違う商品）
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  return pool[dayOfYear % pool.length];
}

// HTML生成
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
    width: 1080px;
    height: 1080px;
    background: #FFFAF3;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .card::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, #F0E6D6 1.5px, transparent 1.5px);
    background-size: 24px 24px;
    z-index: 0;
  }

  .machine {
    position: relative;
    z-index: 2;
    width: 920px;
    background: linear-gradient(180deg, #FFFFFF 0%, #F8F4EF 100%);
    border: 4px solid #E8DDD0;
    border-radius: 28px 28px 20px 20px;
    box-shadow: 0 12px 40px rgba(74,55,40,0.1);
  }

  .machine-top {
    height: 10px;
    background: linear-gradient(135deg, #E8756D, #E8756DCC);
    border-radius: 24px 24px 0 0;
  }

  .image-window {
    margin: 14px 18px 18px;
    border-radius: 14px;
    overflow: hidden;
    border: 3px solid #E8DDD0;
    background: #FFF8F0;
  }
  .image-window img {
    width: 100%;
    aspect-ratio: 1/1;
    object-fit: cover;
    object-position: top;
    display: block;
  }
  .image-placeholder {
    width: 100%;
    aspect-ratio: 1/1;
    background: #FFF8F0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 120px;
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
    <div class="deco d1"></div>
    <div class="deco d2"></div>
    <div class="deco d3"></div>
    <div class="deco d4"></div>

    <div class="machine">
      <div class="machine-top"></div>
      <div class="image-window">
        ${hasImage
          ? `<img src="${imgSrc}" alt="">`
          : `<div class="image-placeholder">🎪</div>`
        }
      </div>
    </div>
  </div>
</body>
</html>`;
}

// キャプション生成
function generateCaption(product) {
  const lines = [
    `🎪 ${product.name}`,
    ``,
    `💰 ${product.price}円 / 全${product.types}種`,
    `📅 ${product.releaseWeek || "発売日未定"}`,
    ``,
    `👆 プロフィールのリンクから新作情報をチェック！`,
    `gacha-now.vercel.app`,
    ``,
    `#ガチャガチャ #カプセルトイ #ガチャなう #新作ガチャ #ガシャポン #ガチャ活 #ガチャ好きと繋がりたい #カプセルトイ好き`,
  ];

  // ブランド名をハッシュタグに追加
  if (product.brand && product.brand !== "その他") {
    lines[lines.length - 1] += ` #${product.brand}`;
  }

  return lines.join("\n");
}

// メイン
async function main() {
  console.log("📸 Instagram投稿を生成中...");

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));
  const product = pickProduct(products);
  console.log(`  選択: ${product.name} (${product.brand})`);

  // 出力ディレクトリ作成
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const today = new Date().toISOString().split("T")[0]; // 2026-03-03
  const htmlPath = path.join(OUTPUT_DIR, `post-${today}.html`);
  const pngPath = path.join(OUTPUT_DIR, `post-${today}.png`);
  const txtPath = path.join(OUTPUT_DIR, `post-${today}.txt`);

  // HTML生成
  const html = generateHTML(product);
  fs.writeFileSync(htmlPath, html, "utf-8");
  console.log(`  HTML: ${htmlPath}`);

  // puppeteerでスクショ
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0", timeout: 30000 });

  // フォント読み込み待ち
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({ path: pngPath, type: "png" });
  await browser.close();
  console.log(`  PNG: ${pngPath}`);

  // キャプション生成
  const caption = generateCaption(product);
  fs.writeFileSync(txtPath, caption, "utf-8");
  console.log(`  TXT: ${txtPath}`);

  console.log(`\n✅ 完了！`);
  console.log(`  商品: ${product.name}`);
  console.log(`  画像: posts/post-${today}.png`);
  console.log(`  キャプション: posts/post-${today}.txt`);
}

main().catch((e) => { console.error("❌ エラー:", e); process.exit(1); });
