/**
 * delete-r2-pending.js - R2から不要になったサムネイルを削除する（本番確認後に手で実行）
 *
 * data/r2-pending-delete.json に書かれたキーを消す。
 * このファイルは scripts/migrate-bandai-images.js が作る。
 *
 * 【必ず本番で表示を確認してから実行すること】
 * 先に消すと、切り替えに問題があったときに戻す先が無くなる。
 * products.json の thumb を元に戻せば復旧できる状態を保つため、
 * 移行と削除は別の操作に分けてある。
 *
 * 実行例:
 *   DRY_RUN=1 node scripts/delete-r2-pending.js
 *   node scripts/delete-r2-pending.js
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasR2, deleteObject, listKeys } from "./r2.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PENDING_PATH = path.join(__dirname, "..", "data", "r2-pending-delete.json");
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");

const DRY_RUN = !!process.env.DRY_RUN;

async function main() {
  if (!hasR2()) {
    console.error("❌ R2の認証情報がありません");
    process.exit(1);
  }
  if (!fs.existsSync(PENDING_PATH)) {
    console.error(`❌ ${PENDING_PATH} がありません。先に migrate-bandai-images.js を実行してください。`);
    process.exit(1);
  }

  const pending = JSON.parse(fs.readFileSync(PENDING_PATH, "utf8"));
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  // 安全確認: 今も products.json がそのキーを参照していたら消さない。
  // 移行をロールバックした状態で誤って実行すると、表示中の画像を消すことになる。
  const inUse = new Set(
    products
      .map((p) => String(p.thumb || "").match(/thumb\/([^/]+\.webp)$/))
      .filter(Boolean)
      .map((m) => `thumb/${m[1]}`)
  );
  const targets = pending.keys.filter((k) => !inUse.has(k));
  const skipped = pending.keys.length - targets.length;

  const existing = new Set(await listKeys("thumb/"));
  const actual = targets.filter((k) => existing.has(k));

  console.log(`🗑  R2のサムネイル削除`);
  console.log(`   削除予定リスト: ${pending.keys.length}件`);
  if (skipped > 0) console.log(`   ⚠️ 今も使用中のため除外: ${skipped}件`);
  console.log(`   R2に実在する対象: ${actual.length}件`);
  console.log(`   R2の総キー数: ${existing.size}件 → 削除後 ${existing.size - actual.length}件`);

  if (DRY_RUN) {
    console.log("\n--dry-run のため削除していません。");
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const [i, key] of actual.entries()) {
    try {
      await deleteObject(key);
      ok++;
    } catch (e) {
      failed++;
      console.error(`   ⚠️ ${key}: ${e.message}`);
    }
    if ((i + 1) % 100 === 0) console.log(`   …${i + 1}/${actual.length}`);
  }

  console.log(`\n✅ 削除 ${ok}件 / 失敗 ${failed}件`);
  if (failed === 0) {
    fs.unlinkSync(PENDING_PATH);
    console.log(`   ${PENDING_PATH} を削除しました`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
