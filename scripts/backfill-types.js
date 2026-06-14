/**
 * backfill-types.js - 既存 products.json の types（種類数）を詳細ページから取得し直す一度きりのスクリプト
 *
 * 背景: バンダイは詳細ページを取得しておらず全件 types=4 のフォールバック値だった。
 *       タカラ/キタンも一部取得失敗で4になっている。
 *
 * 方針:
 *   - 各商品の sourceUrl（詳細ページ）から「全○種」を抽出（全角数字対応）
 *   - 取得できた → その値で上書き
 *   - 取得できなかった →
 *       バンダイ: 既存値は誤りと分かっているため null（UIで種類数を非表示）
 *       その他  : 既存値が正しい可能性があるため据え置き
 *
 * 使い方:
 *   node scripts/backfill-types.js          # 本実行（products.json を書き換え）
 *   DRY=1 node scripts/backfill-types.js     # 書き換えずにログだけ
 *   LIMIT=10 DRY=1 node scripts/backfill-types.js  # 先頭10件で動作確認
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = process.env.PRODUCTS_PATH || path.join(__dirname, "../data/products.json");
const DRY = !!process.env.DRY;
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function extractTypes(html) {
  const m = html.match(/全\s*([0-9０-９]+)\s*種/);
  if (!m) return null;
  const half = m[1].replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
  const n = parseInt(half, 10);
  return Number.isFinite(n) && n > 0 && n <= 99 ? n : null;
}

async function fetchTypes(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return extractTypes(await res.text());
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));
  const target = Math.min(products.length, LIMIT);
  console.log(`対象: ${target}件${DRY ? "（DRY: 書き換えなし）" : ""}\n`);

  let updated = 0, nulled = 0, kept = 0, failed = 0;
  for (let i = 0; i < target; i++) {
    const p = products[i];
    const isBandai = p.source === "バンダイ公式";
    const url = p.sourceUrl;

    if (!url || url === "#") {
      if (isBandai && p.types !== null) { p.types = null; nulled++; }
      continue;
    }

    let types = null;
    try {
      types = await fetchTypes(url);
    } catch (e) {
      failed++;
      console.log(`  ⚠️ [${i + 1}/${target}] ${p.name}: ${e.message}`);
      await sleep(700);
      continue;
    }

    if (types != null) {
      if (p.types !== types) {
        console.log(`  ✏️ [${i + 1}/${target}] ${p.name}: ${p.types} → ${types}`);
        p.types = types;
        updated++;
      }
    } else if (isBandai) {
      if (p.types !== null) { p.types = null; nulled++; }
    } else {
      kept++;
    }

    await sleep(700);
  }

  if (!DRY) {
    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf-8");
    console.log(`\n💾 ${PRODUCTS_PATH} を保存`);
  }
  console.log(`\n✅ 完了: 修正 ${updated}件 / null化 ${nulled}件 / 据え置き ${kept}件 / 取得失敗 ${failed}件`);
}

main().catch((e) => { console.error(e); process.exit(1); });
