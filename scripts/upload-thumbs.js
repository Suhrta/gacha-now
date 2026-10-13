/**
 * upload-thumbs.js - public/thumb/ の既存サムネイルをR2へ一括移行する（1回限り）
 *
 * 移行の背景と判断は scripts/r2.js の先頭に書いてある。
 *
 * 【実行方法】
 *   node scripts/upload-thumbs.js            … アップロードして products.json を書き換える
 *   node scripts/upload-thumbs.js --dry-run  … 何件対象かだけ出す（書き込みなし）
 *
 * CIでは実行しない。873件のアップロードで日次パイプラインのラン時間を伸ばしたくないので、
 * ローカルから1回流して結果（products.json）をコミットする。
 *
 * 【冪等性】
 * 先にR2のキー一覧を取り、既にあるものは上げ直さない。
 * 途中で失敗しても、もう一度流せば続きから進む。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasR2, putObject, listKeys, publicUrl, PUBLIC_BASE } from "./r2.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THUMB_DIR = path.join(__dirname, "..", "public", "thumb");
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  if (!hasR2()) {
    console.error(
      "❌ R2の認証情報がありません。\n" +
        "   R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY を\n" +
        "   .env（ローカル）または GitHub Secrets（CI）に設定してください。"
    );
    process.exit(1);
  }
  if (!fs.existsSync(THUMB_DIR)) {
    console.error(`❌ ${THUMB_DIR} がありません。`);
    process.exit(1);
  }

  const files = fs.readdirSync(THUMB_DIR).filter((f) => f.endsWith(".webp"));
  console.log(`📦 ローカルのサムネイル: ${files.length}件`);

  const existing = new Set(await listKeys("thumb/"));
  console.log(`   R2に既にあるもの    : ${existing.size}件`);

  const targets = files.filter((f) => !existing.has(`thumb/${f}`));
  console.log(`   今回アップロード    : ${targets.length}件`);

  if (DRY_RUN) {
    console.log("\n--dry-run のため、ここで終了します（何も書き込んでいません）。");
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const [i, file] of targets.entries()) {
    try {
      await putObject(`thumb/${file}`, fs.readFileSync(path.join(THUMB_DIR, file)));
      ok++;
    } catch (e) {
      failed++;
      console.error(`   ⚠️ ${file}: ${e.message}`);
    }
    if ((i + 1) % 50 === 0) console.log(`   …${i + 1}/${targets.length}`);
  }
  console.log(`\n✅ アップロード完了: 成功${ok} / 失敗${failed}`);

  if (failed > 0) {
    console.error("失敗が残っているので products.json は書き換えません。もう一度実行してください。");
    process.exit(1);
  }

  // products.json の thumb を絶対URLに差し替える。
  // 相対パス（/thumb/x.webp）のままのものだけ対象にするので、再実行しても二重に付かない。
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));
  let rewritten = 0;
  for (const p of products) {
    if (typeof p.thumb !== "string" || !p.thumb.startsWith("/thumb/")) continue;
    const key = p.thumb.replace(/^\//, "");
    p.thumb = publicUrl(key);
    rewritten++;
  }
  // 末尾改行を付けないのは既存スクリプト（update.js / build-thumbs.js）に合わせるため。
  // 揃えないと、書き手が替わるたびに末尾1行だけの差分が毎回出る。
  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf-8");
  console.log(`✅ products.json の thumb を ${rewritten}件 ${PUBLIC_BASE} 配下に書き換えました`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
