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
  BRAND_MAP,
  isPlausibleBrand,
} from "./brand.js";

const MAP_BRANDS = new Set(BRAND_MAP.map((e) => e.brand));

// 保存済みの brand を上書きしてよいか判定する。
//
// 上書きしてよいのは「BRAND_MAPのキーワード判定で付いたはずなのに、今の判定と食い違う」場合のみ。
// これは BRAND_MAP を直した結果として起きる（例: "ルフィ" が「カプセルフィギュア」に部分一致して
// 初音ミクやジョジョがワンピース扱いになっていたのを、キーワード削除で修正した）。
//
// 逆に、キタンクラブ等のサイトのカテゴリタグ由来で付いたブランドは products.json に
// タグが残っておらず名前からは再現できない。上書きすると正しいブランドを壊すので触らない。
function shouldOverwrite(stored, byName) {
  if (!MAP_BRANDS.has(stored)) return false; // タグ由来の独自ブランド
  if (GENERIC_BRANDS.has(byName)) return false; // 名前からは判定不能＝タグ由来とみなす
  return stored !== byName;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH =
  process.env.PRODUCTS_PATH || path.join(__dirname, "../data/products.json");

function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const changes = [];
  const fixes = [];
  const junk = [];
  for (const p of products) {
    const byName = detectBrand(p.name);
    let brand = null;

    if (!isPlausibleBrand(p.brand)) {
      // 収集側がページから拾い間違えた文字列がブランドとして保存されているケース。
      // タグ由来のブランドは通常このスクリプトでは触らないが、これは「正しいブランドを
      // 壊すリスク」より「意味不明な /brand/ ページが index されている実害」が上回る。
      // 実例: 'wp-emoji-settings",t=document.querySelector(e);if(!(t' に商品10件（2026-09-01）。
      // 名前から判定できなければ「その他」に落として noindex にする。
      brand = GENERIC_BRANDS.has(byName) ? "その他" : byName;
      junk.push({ name: p.name, from: p.brand, to: brand });
    } else if (GENERIC_BRANDS.has(p.brand)) {
      // 「その他」からの昇格（BRAND_MAP拡張の取りこぼし回収）
      if (GENERIC_BRANDS.has(byName)) continue; // 依然として判定できず
      brand = byName;
      changes.push({ name: p.name, from: p.brand, to: brand });
    } else if (shouldOverwrite(p.brand, byName)) {
      // 誤判定の訂正（BRAND_MAPのキーワードを直したときに効く）
      brand = byName;
      fixes.push({ name: p.name, from: p.brand, to: brand });
    } else {
      continue;
    }

    p.brand = brand;
    p.brandSlug = toBrandSlug(brand);
    p.color = getBrandColor(brand);
    p.hot = isHot(p.name, brand);
  }

  if (changes.length === 0 && fixes.length === 0 && junk.length === 0) {
    console.log("✅ 再判定: 変更なし");
    return;
  }

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf-8");

  if (junk.length) {
    console.log(`🧹 壊れたブランド名を除去: ${junk.length}件`);
    for (const j of junk) {
      console.log(`   ${JSON.stringify(j.from).slice(0, 40)} → ${j.to} | ${j.name.slice(0, 30)}`);
    }
  }

  if (fixes.length) {
    console.log(`🔧 誤判定を訂正: ${fixes.length}件`);
    for (const f of fixes) {
      console.log(`   ${f.from} → ${f.to} | ${f.name.slice(0, 34)}`);
    }
  }

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
