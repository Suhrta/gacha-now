/**
 * migrate-bandai-images.js - バンダイ商品を自前サムネイルから仕入れ元CDN直リンクへ切り替える（1回限り）
 *
 * 【なぜ】
 * バンダイの「著作権・商標について」に
 *   「すべての画像、文章、情報…権利者の許可なく、複製、転載等の行為をお断りいたします」
 * とある。自サーバー（R2）に縮小コピーを置く構成はこれに触れる。
 * 直リンクは複製に当たらないので、コピーを持たない形に戻す。
 *
 * 8月に自前ホストへ移した理由はVercelの画像最適化枠（402）だったが、
 * 現在は unoptimized: true で素の <img> 配信なので、直リンクにしても
 * Vercelの画像枠もR2も使わない。移した理由自体が消えている。
 *
 * 【転送量】
 * 実測（2026-10-13）: バンダイCDNは s=3.4KB / m=11KB / b=65KB / xl=346KB。
 * 表示側は srcset で m と b を渡すので、一覧カード（実表示150〜200px）では
 * 多くの環境で m が選ばれ、R2の480px webp（32KB）より軽くなる。
 *
 * 【対象外】
 * タカラトミーアーツ・キタンクラブ・ブシロードの277件は今回触らない。
 * これらのCDNは解像度バリアントが無く（実測で平均529〜714KB）、
 * 直リンクにすると一覧が重くなりすぎるため。別途判断する。
 *
 * 実行例:
 *   DRY_RUN=1 node scripts/migrate-bandai-images.js
 *   node scripts/migrate-bandai-images.js
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");
// R2から消す対象のキーを書き出す。削除は本番で表示を確認したあとに別途行う
// （順番を逆にすると、切り替えが失敗したときに戻せなくなる）。
const PENDING_PATH = path.join(__dirname, "..", "data", "r2-pending-delete.json");

const BANDAI_HOST = "bandai-a.akamaihd.net";
const DRY_RUN = !!process.env.DRY_RUN;

function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const targets = products.filter(
    (p) => p.thumb && p.img && p.img.includes(BANDAI_HOST)
  );

  console.log(`🖼  バンダイ商品の直リンク切り替え`);
  console.log(`   全商品: ${products.length}件`);
  console.log(`   対象  : ${targets.length}件（thumbを持つバンダイ商品）`);

  const pendingKeys = [];
  for (const p of targets) {
    // thumb は "https://gachaimg.com/thumb/<id>.webp" か "/thumb/<id>.webp"
    const m = String(p.thumb).match(/thumb\/([^/]+\.webp)$/);
    if (m) pendingKeys.push(`thumb/${m[1]}`);
    if (!DRY_RUN) delete p.thumb;
  }

  const remaining = products.filter((p) => p.thumb).length;
  console.log(`   切替後にthumbを持つ商品: ${remaining}件（タカトミ・キタン・ブシロード）`);
  console.log(`   R2から削除予定: ${pendingKeys.length}件`);

  if (DRY_RUN) {
    console.log("\n--dry-run のため保存していません。");
    return;
  }

  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf-8");
  fs.writeFileSync(
    PENDING_PATH,
    JSON.stringify({ createdAt: new Date().toISOString(), keys: pendingKeys }, null, 2),
    "utf-8"
  );
  console.log(`\n💾 ${PRODUCTS_PATH}`);
  console.log(`💾 ${PENDING_PATH}（本番確認後に scripts/delete-r2-pending.js で削除する）`);
}

main();
