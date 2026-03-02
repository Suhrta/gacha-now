/**
 * generate-post.js v2 - Instagram投稿用HTMLテンプレート+キャプション生成
 * 
 * 【方針変更】
 * canvas（node-canvas）はWindowsでインストールが困難。
 * 代わりにHTMLファイルを生成 → ブラウザで開いてスクショを撮る方式に変更。
 * 追加ライブラリ不要で動く。
 * 
 * 【使い方】
 * node scripts/generate-post.js
 * → posts/ フォルダにHTMLとキャプションが生成される
 * → HTMLをブラウザで開いてスクショ → Instagramに投稿
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BRAND_COLORS = {
  pokemon: { bg: "#FFF8E1", accent: "#FFB300", text: "#4E342E" },
  sanrio: { bg: "#FFF0F5", accent: "#E91E63", text: "#880E4F" },
  chiikawa: { bg: "#E1F5FE", accent: "#0288D1", text: "#01579B" },
  kirby: { bg: "#FCE4EC", accent: "#EC407A", text: "#880E4F" },
  disney: { bg: "#F3E5F5", accent: "#8E24AA", text: "#4A148C" },
  anime: { bg: "#FFEBEE", accent: "#E53935", text: "#B71C1C" },
  character: { bg: "#E1F5FE", accent: "#0288D1", text: "#01579B" },
  omoshiro: { bg: "#FFF3E0", accent: "#F57C00", text: "#E65100" },
  default: { bg: "#FAFAFA", accent: "#FF4D6A", text: "#212121" },
};

/**
 * 1商品分の投稿画像HTMLを生成
 */
function generateHTML(product) {
  const colors = BRAND_COLORS[product.brandSlug] || BRAND_COLORS.default;
  
  // ランダムなカプセル色
  const capsuleColors = ["#FFD54F", "#4FC3F7", "#CE93D8", "#AED581", "#FF8A65", "#F48FB1", "#81D4FA", "#FFB74D"];
  
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    width: 1080px;
    height: 1080px;
    overflow: hidden;
    font-family: 'Dela Gothic One', 'Noto Sans JP', sans-serif;
  }

  .card {
    width: 1080px;
    height: 1080px;
    background: ${colors.bg};
    position: relative;
    overflow: hidden;
  }

  /* ドットパターン */
  .card::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(0,0,0,0.04) 1.5px, transparent 1.5px);
    background-size: 24px 24px;
  }

  /* ヘッダー */
  .header {
    background: ${colors.accent};
    height: 130px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 2;
  }
  .header-text {
    color: #fff;
    font-size: 44px;
    font-weight: 900;
    letter-spacing: 2px;
    text-shadow: 2px 2px 0 rgba(0,0,0,0.15);
  }

  /* メインカード */
  .main {
    position: absolute;
    top: 170px; left: 70px; right: 70px;
    background: #fff;
    border-radius: 32px;
    padding: 50px 40px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.08);
    z-index: 2;
    text-align: center;
    min-height: 520px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .brand-badge {
    display: inline-block;
    background: ${colors.accent};
    color: #fff;
    font-size: 28px;
    font-weight: 700;
    padding: 8px 32px;
    border-radius: 50px;
    margin-bottom: 30px;
  }

  .product-name {
    font-size: 52px;
    font-weight: 900;
    color: ${colors.text};
    line-height: 1.35;
    margin-bottom: 35px;
    letter-spacing: -1px;
  }

  .divider {
    width: 80%;
    margin: 0 auto 30px;
    border: none;
    border-top: 4px dashed ${colors.accent}44;
  }

  .price-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 40px;
  }

  .price {
    font-size: 80px;
    font-weight: 900;
    color: ${colors.accent};
    letter-spacing: -2px;
  }

  .types {
    font-size: 36px;
    font-weight: 700;
    color: ${colors.text};
    opacity: 0.7;
    background: ${colors.bg};
    padding: 8px 24px;
    border-radius: 16px;
  }

  ${product.hot ? `
  .hot-badge {
    position: absolute;
    top: 150px; right: 50px;
    background: #FF3B30;
    color: #fff;
    font-size: 30px;
    font-weight: 900;
    padding: 10px 28px;
    border-radius: 50px;
    z-index: 5;
    box-shadow: 0 4px 15px rgba(255,59,48,0.4);
  }` : ''}

  /* フッター */
  .footer {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    background: ${colors.accent};
    height: 180px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }

  .release {
    color: #fff;
    font-size: 44px;
    font-weight: 900;
    text-shadow: 2px 2px 0 rgba(0,0,0,0.15);
    margin-bottom: 8px;
  }

  .site-url {
    color: rgba(255,255,255,0.8);
    font-size: 26px;
    font-weight: 400;
    letter-spacing: 2px;
  }

  /* 装飾カプセル */
  .capsule {
    position: absolute;
    border-radius: 50%;
    z-index: 1;
    opacity: 0.25;
  }
  .cp1 { width: 80px; height: 80px; background: ${capsuleColors[0]}; top: 730px; left: 30px; }
  .cp2 { width: 60px; height: 60px; background: ${capsuleColors[1]}; top: 750px; right: 40px; }
  .cp3 { width: 50px; height: 50px; background: ${capsuleColors[2]}; top: 720px; left: 200px; }
  .cp4 { width: 70px; height: 70px; background: ${capsuleColors[3]}; top: 770px; right: 200px; }
  .cp5 { width: 45px; height: 45px; background: ${capsuleColors[4]}; top: 700px; left: 500px; }
</style>
<link href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Noto+Sans+JP:wght@700;900&display=swap" rel="stylesheet">
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="header-text">🏪 ガチャなう ─ 新作情報</span>
    </div>

    ${product.hot ? '<div class="hot-badge">🔥 HOT</div>' : ''}

    <div class="main">
      <span class="brand-badge">${product.brand}</span>
      <div class="product-name">${product.name}</div>
      <hr class="divider">
      <div class="price-row">
        <span class="price">¥${product.price}</span>
        <span class="types">全${product.types}種</span>
      </div>
    </div>

    <div class="capsule cp1"></div>
    <div class="capsule cp2"></div>
    <div class="capsule cp3"></div>
    <div class="capsule cp4"></div>
    <div class="capsule cp5"></div>

    <div class="footer">
      <div class="release">📅 ${product.releaseWeek}</div>
      <div class="site-url">gacha-now.vercel.app</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * キャプション生成
 */
function generateCaption(product) {
  const hashtags = [
    "#ガチャガチャ", "#カプセルトイ", "#ガチャなう",
    "#新作ガチャ", "#ガシャポン",
    `#${product.brand}`,
  ];

  const brandTags = {
    pokemon: ["#ポケモン", "#ポケモンガチャ"],
    sanrio: ["#サンリオ", "#サンリオキャラクターズ"],
    chiikawa: ["#ちいかわ", "#ちいかわガチャ"],
    kirby: ["#カービィ", "#星のカービィ"],
    disney: ["#ディズニー", "#ディズニーガチャ"],
  };

  if (brandTags[product.brandSlug]) {
    hashtags.push(...brandTags[product.brandSlug]);
  }

  hashtags.push("#ガチャ活", "#ガチャ好きと繋がりたい", "#カプセルトイ好き");

  return `🏪 新作ガチャ情報！

${product.name}

💰 ${product.price}円
🎯 全${product.types}種
📅 ${product.releaseWeek}

${product.hot ? "🔥 注目の新作！\n" : ""}詳しくはプロフィールのリンクから👆
gacha-now.vercel.app

${hashtags.join(" ")}`;
}

/**
 * メイン実行
 */
async function main() {
  const productsPath = process.env.PRODUCTS_PATH
    || path.join(__dirname, "../data/products.json");

  if (!fs.existsSync(productsPath)) {
    console.error("❌ products.json が見つかりません");
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(productsPath, "utf-8"));

  // HOT商品を優先、最新5件
  const targets = products
    .sort((a, b) => {
      // hot=true を先に
      if (a.hot && !b.hot) return -1;
      if (!a.hot && b.hot) return 1;
      return 0;
    })
    .slice(0, 5);

  // 古いpostsを削除して再生成
  const outDir = path.join(__dirname, "../posts");
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`📸 ${targets.length}件の投稿テンプレートを生成...\n`);

  // 一覧HTMLも生成
  let indexHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{background:#111;display:flex;flex-wrap:wrap;gap:20px;padding:20px;font-family:sans-serif;}
.preview{width:360px;}.preview iframe{width:360px;height:360px;border:none;transform-origin:0 0;}
.preview h3{color:#fff;font-size:14px;margin:8px 0 4px;}.preview p{color:#888;font-size:12px;white-space:pre-wrap;max-height:200px;overflow:auto;}
</style></head><body>`;

  let i = 1;
  for (const product of targets) {
    const fileId = `post-${String(i).padStart(3, "0")}`;
    const html = generateHTML(product);
    const htmlPath = path.join(outDir, `${fileId}.html`);
    fs.writeFileSync(htmlPath, html, "utf-8");

    const caption = generateCaption(product);
    const capPath = path.join(outDir, `${fileId}.txt`);
    fs.writeFileSync(capPath, caption, "utf-8");

    indexHtml += `<div class="preview">
      <iframe src="${fileId}.html" scrolling="no"></iframe>
      <h3>${product.name}</h3>
      <p>${caption}</p>
    </div>`;
    i++;

    console.log(`✅ ${product.name}`);
    console.log(`   HTML: ${htmlPath}`);
    console.log(`   キャプション: ${capPath}\n`);
  }

  indexHtml += `</body></html>`;
  fs.writeFileSync(path.join(outDir, "index.html"), indexHtml, "utf-8");

  console.log(`🎉 ${targets.length}件の投稿を posts/ に生成しました`);
  console.log(`📂 posts/index.html をブラウザで開くと一覧プレビューできます`);
  console.log(`\n💡 投稿方法:`);
  console.log(`   1. posts/xxx.html をブラウザで開く`);
  console.log(`   2. 1080x1080のウィンドウでスクショ`);
  console.log(`   3. posts/xxx.txt のキャプションをコピー`);
  console.log(`   4. Instagramに投稿`);
}

main().catch(console.error);
