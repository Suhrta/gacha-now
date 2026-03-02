/**
 * fetch-images.js - 楽天APIで商品画像を取得してproducts.jsonに追加
 * 
 * 【なぜ楽天APIか】
 * - 審査不要で即使える
 * - 商品画像を合法的に取得・表示できる（アフィリエイトリンク付き）
 * - 将来的に楽天アフィリエイト収益にもつながる
 * 
 * 【使い方】
 * node scripts/fetch-images.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_ID = "94f638b5-f6f0-4a6c-a95b-d3ad0d47c94a";

/**
 * 楽天市場で商品を検索して画像URLを返す
 */
async function searchRakuten(keyword) {
  try {
    const params = new URLSearchParams({
      applicationId: APP_ID,
      keyword: keyword,
      hits: "3",           // 上位3件取得
      imageFlag: "1",      // 画像ありのみ
      format: "json",
    });

    const url = `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?${params}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      console.error(`    API error: ${res.status}`);
      return null;
    }

    const data = await res.json();

    if (data.Items && data.Items.length > 0) {
      const item = data.Items[0].Item;
      return {
        imageUrl: item.mediumImageUrls?.[0]?.imageUrl || null,
        rakutenUrl: item.itemUrl,
        rakutenPrice: item.itemPrice,
      };
    }
  } catch (err) {
    console.error(`    検索失敗: ${err.message}`);
  }
  return null;
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

  // 画像がまだないもの（placehold.coのURL）だけ処理
  const targets = products.filter(
    (p) => !p.imageUrl || p.imageUrl.includes("placehold.co")
  );

  console.log(`🖼️ 画像取得: ${targets.length}件（画像なし）/ 全${products.length}件\n`);

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < targets.length; i++) {
    const product = targets[i];
    console.log(`  [${i + 1}/${targets.length}] ${product.name}`);

    // 商品名 + "ガチャ" で検索（精度向上）
    const keyword = `${product.name} ガチャ`;
    const result = await searchRakuten(keyword);

    if (result && result.imageUrl) {
      product.imageUrl = result.imageUrl;
      product.rakutenUrl = result.rakutenUrl;
      console.log(`    ✅ 画像あり`);
      found++;
    } else {
      // 商品名だけでリトライ
      const retry = await searchRakuten(product.name);
      if (retry && retry.imageUrl) {
        product.imageUrl = retry.imageUrl;
        product.rakutenUrl = retry.rakutenUrl;
        console.log(`    ✅ 画像あり（リトライ）`);
        found++;
      } else {
        console.log(`    ⏭️ 見つからず`);
        notFound++;
      }
    }

    // レート制限対策: 1秒待機（楽天APIは1秒1リクエスト制限）
    await new Promise((r) => setTimeout(r, 1100));
  }

  // 保存
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), "utf-8");

  console.log(`\n${"─".repeat(40)}`);
  console.log(`✅ 画像取得完了`);
  console.log(`   取得成功: ${found}件`);
  console.log(`   見つからず: ${notFound}件`);
  console.log(`💾 products.json を更新しました`);
}

main().catch(console.error);
