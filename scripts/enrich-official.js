/**
 * enrich-official.js - 既存商品に収集元の一次情報を後から付与する
 *
 * 【なぜ必要か】
 * collect.js は新商品を追加するだけで既存商品には触れない（rebrand.js と同じ事情）。
 * official-info.js を collect.js に組み込んでも、それが効くのは今後の新商品だけで、
 * すでに products.json にある845件は空のままになる。このスクリプトで一括付与する。
 *
 * 付与するフィールド:
 *   officialDescription  収集元が書いた公式の紹介文（一次情報）
 *   size                 本体サイズ
 *   lineup               収録キャラ名の配列 ← 検索面が新しく手に入る最重要データ
 *   ageRating            対象年齢（バンダイのみ）
 *
 * 実行:
 *   node scripts/enrich-official.js              # 未取得のものだけ
 *   FORCE=1 node scripts/enrich-official.js      # 取得済みも再取得
 *   LIMIT=20 node scripts/enrich-official.js     # 先頭20件だけ（動作確認用）
 *   DRY_RUN=1 LIMIT=5 node scripts/enrich-official.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchOfficialInfo, parserFor, hostOf } from "./official-info.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");

const FORCE = !!process.env.FORCE;
const DRY_RUN = !!process.env.DRY_RUN;
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;

// 収集元サーバーへの負荷を抑える。日次パイプラインが叩いているのと同じサーバーなので
// 一気に投げない。
//
// 【事故の記録 2026-08-07】
// 4並列/120ms で845件を一気に流したところ、gashapon.jp から 403 を返されるようになった。
// 商品詳細だけでなく collect.js が毎日使う /schedule/ まで拒否されたため、
// 「取得スクリプトを足したせいで収集元へのアクセス自体を失う」という本末転倒を起こした。
// 12件のサンプルが成功したことをもって全件を流したのが誤りだった。
//
// 対策として MAX_PER_RUN で1回の実行あたりの件数を必ず制限する。
// 未取得ぶんは日次ワークフローが毎日少しずつ回収するので、一括処理する必要はない。
// 大量に流したいときは MAX_PER_RUN を明示的に上書きする（その判断を意識的にさせる）。
const CONCURRENCY = Number(process.env.CONCURRENCY || 2);
const DELAY_MS = Number(process.env.DELAY_MS || 800);
const MAX_PER_RUN = Number(process.env.MAX_PER_RUN || 60);

// 同一ホストで403/429が続いたら、そのホストへの取得を即座に打ち切る。
// レート制限に気づかず叩き続けると、今回のように恒久的なブロックに発展する。
const ABORT_AFTER_ERRORS = 5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pool(items, worker) {
  const queue = [...items];
  const runners = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const item = queue.shift();
      if (!item) return;
      await worker(item);
      await sleep(DELAY_MS);
    }
  });
  await Promise.all(runners);
}

function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));

  const remaining = products
    .filter((p) => p.sourceUrl && parserFor(p.sourceUrl))
    .filter((p) => FORCE || !p.officialDescription);

  // 1回の実行あたりの上限。未取得ぶんは日次実行で少しずつ回収する方針なので、
  // ここで必ず頭を打たせる（2026-08-07 の gashapon.jp ブロック事故の再発防止）。
  const cap = Math.min(LIMIT, MAX_PER_RUN);
  const targets = remaining.slice(0, cap);

  console.log("📡 収集元の公式ページから一次情報を取得します");
  console.log(`   未取得: ${remaining.length}件 / 全${products.length}件`);
  console.log(`   今回の対象: ${targets.length}件（1回の上限 ${MAX_PER_RUN}件）`);
  if (remaining.length > targets.length) {
    console.log(`   残り${remaining.length - targets.length}件は次回以降に回します`);
  }
  if (DRY_RUN) console.log("   ⚠️  DRY_RUN: products.json には保存しません");
  if (targets.length === 0) return Promise.resolve();

  const stat = { ok: 0, fail: 0, desc: 0, size: 0, lineup: 0, age: 0 };
  let processed = 0;
  // ホストごとの連続403/429カウント。しきい値を超えたらそのホストは以後スキップする。
  const blocked = new Map();

  const save = () => {
    if (!DRY_RUN) fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf-8");
  };

  return pool(targets, async (product) => {
    const host = hostOf(product.sourceUrl);
    // すでに打ち切ったホストは叩かない
    if ((blocked.get(host) || 0) >= ABORT_AFTER_ERRORS) {
      stat.fail++;
      return;
    }

    const { info, rateLimited, status } = await fetchOfficialInfo(product.sourceUrl);
    processed++;

    if (rateLimited) {
      const n = (blocked.get(host) || 0) + 1;
      blocked.set(host, n);
      stat.fail++;
      if (n === ABORT_AFTER_ERRORS) {
        console.error(
          `   ⛔ ${host} が ${status} を連続で返しました。このホストへの取得を打ち切ります。\n` +
            `      しばらく時間を空けてから再実行してください（叩き続けると恒久的にブロックされます）。`
        );
      }
      return;
    }

    if (!info) {
      stat.fail++;
    } else {
      stat.ok++;
      // 取れた項目だけ上書きする。取れなかった項目で既存値を消さない。
      if (info.officialDescription) { product.officialDescription = info.officialDescription; stat.desc++; }
      if (info.size) { product.size = info.size; stat.size++; }
      if (info.lineup && info.lineup.length) { product.lineup = info.lineup; stat.lineup++; }
      if (info.ageRating) { product.ageRating = info.ageRating; stat.age++; }
    }
    if (processed % 50 === 0) {
      // 途中で落ちても成果が消えないよう定期保存する（845件を取り直すのは時間の無駄）
      save();
      console.log(`   ${processed}/${targets.length} … 説明${stat.desc} / サイズ${stat.size} / 内訳${stat.lineup}`);
    }
  }).then(() => {
    save();
    console.log("\n─────────────────────────────");
    console.log(`✅ 取得成功 ${stat.ok}件 / 失敗 ${stat.fail}件`);
    console.log(`   公式説明文 : ${stat.desc}件`);
    console.log(`   サイズ     : ${stat.size}件`);
    console.log(`   ラインナップ: ${stat.lineup}件`);
    console.log(`   対象年齢   : ${stat.age}件`);
    if (!DRY_RUN) console.log(`💾 ${PRODUCTS_PATH}`);
  });
}

main().catch((e) => {
  console.error("❌ エラー:", e);
  process.exit(1);
});
