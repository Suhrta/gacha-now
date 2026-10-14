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
import { isStrictIp } from "../lib/strict-ip.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");
// R2から消す対象のキーを書き出す。削除は本番で表示を確認したあとに別途行う
// （順番を逆にすると、切り替えが失敗したときに戻せなくなる）。
const PENDING_PATH = path.join(__dirname, "..", "data", "r2-pending-delete.json");

// 自前コピーをやめる対象の仕入れ元。
//   bandai  … 直リンクに切り替え済み（/model/m/ が8.9KBで軽い）
//   takaratomy … CDNに解像度バリアントが無く平均714KBあるため直リンクにはできない。
//                楽天画像へ寄せ、見つからないものはR2のコピーを出している。
// HOST=takaratomy-arts.co.jp のように指定して対象を切り替える。
//
// 【現在このスクリプトを厳格IPに使う場面】
// 通常運転では使わない。厳格IPは SHOW_STRICT_IP_COPIES（lib/strict-ip.js）が true の間、
// R2のコピーを表示し続ける方針になっている（2026-10-14の方針変更）。
// **権利者から指摘が来てフラグを false にしたあと**、R2上の実体も消すために
//   HOST=takaratomy-arts.co.jp STRICT_IP_ONLY=1 node scripts/migrate-bandai-images.js
// を走らせて削除リストを作り直し、scripts/delete-r2-pending.js を実行する。
// フラグを倒す前にこれを走らせると、thumb が外れるだけで二度手間になる。
const DEFAULT_HOST = "bandai-a.akamaihd.net";
const HOST = process.env.HOST || DEFAULT_HOST;
const DRY_RUN = !!process.env.DRY_RUN;
// STRICT_IP_ONLY=1 で、そのホストのうち厳格IPの商品だけを対象にする。
// タカラトミーアーツは一度に全160件を移すと画像なしが106件出るため、
// ディズニー・任天堂/ポケモン・サンリオから段階的に移す（lib/strict-ip.js）。
const STRICT_IP_ONLY = String(process.env.STRICT_IP_ONLY || "") === "1";

function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  const targets = products.filter(
    (p) =>
      p.thumb &&
      p.img &&
      p.img.includes(HOST) &&
      (!STRICT_IP_ONLY || isStrictIp(p))
  );

  console.log(
    `🖼  自前サムネイルの切り離し（対象ホスト: ${HOST}${STRICT_IP_ONLY ? " / 厳格IPのみ" : ""}）`
  );
  console.log(`   全商品: ${products.length}件`);
  console.log(`   対象  : ${targets.length}件（thumbを持つ対象商品）`);

  // 既に削除待ちのキーがあれば引き継ぐ（対象ホストを分けて複数回実行するため）。
  const existingPending = fs.existsSync(PENDING_PATH)
    ? JSON.parse(fs.readFileSync(PENDING_PATH, "utf8")).keys || []
    : [];
  const pendingKeys = [...existingPending];

  for (const p of targets) {
    // thumb は "https://gachaimg.com/thumb/<id>.webp" か "/thumb/<id>.webp"
    const m = String(p.thumb).match(/thumb\/([^/]+\.webp)$/);
    if (m && !pendingKeys.includes(`thumb/${m[1]}`)) pendingKeys.push(`thumb/${m[1]}`);
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
