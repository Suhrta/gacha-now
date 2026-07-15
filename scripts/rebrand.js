/**
 * rebrand.js - 既存商品のブランドを現在の BRAND_MAP で再判定する
 *
 * 【なぜ必要か】
 * update.js は新商品を追加するだけで既存商品には触れない。そのため brand は
 * 「収集された当時の BRAND_MAP」で凍結され、あとから BRAND_MAP を拡張しても
 * 既存商品は「その他」のまま＝ lib/quality.js により noindex され続ける。
 * このスクリプトを日次パイプラインに挟むことで、BRAND_MAP を直すだけで
 * 過去分までインデックス対象に復帰する。
 *
 * 【なぜ「その他」だけが対象か】
 * キタンクラブ等はサイトのカテゴリタグからブランドを判定しているが、
 * products.json にタグは保存されていない。全件を detectBrand(name) で
 * 上書きすると、タグ由来の正しいブランドを「その他」に落としてしまう。
 * そのため GENERIC（その他 等）からの一方向の昇格のみ行う。
 *
 * 実行: node scripts/rebrand.js
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  detectBrand,
  toBrandSlug,
  getBrandColor,
  isHot,
  GENERIC_BRANDS,
} from "./brand.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH =
  process.env.PRODUCTS_PATH || path.join(__dirname, "../data/products.json");

function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const changes = [];
  for (const p of products) {
    if (!GENERIC_BRANDS.has(p.brand)) continue; // 具体ブランドは尊重する
    const brand = detectBrand(p.name);
    if (GENERIC_BRANDS.has(brand)) continue; // 依然として判定できず

    changes.push({ name: p.name, from: p.brand, to: brand });
    p.brand = brand;
    p.brandSlug = toBrandSlug(brand);
    p.color = getBrandColor(brand);
    p.hot = isHot(p.name, brand);
  }

  if (changes.length === 0) {
    console.log("✅ 再判定: 変更なし");
    return;
  }

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf-8");

  const byBrand = {};
  for (const c of changes) byBrand[c.to] = (byBrand[c.to] || 0) + 1;
  console.log(`✅ 再判定: ${changes.length}件を「その他」から昇格`);
  for (const [brand, n] of Object.entries(byBrand).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${brand}: ${n}件`);
  }
  const remaining = products.filter((p) => GENERIC_BRANDS.has(p.brand)).length;
  console.log(`📊 残る「その他」: ${remaining}件 / 全${products.length}件`);
  console.log(`💾 ${PRODUCTS_PATH}`);
}

main();
