/**
 * backfill-image-cands.js - 既存商品に「今の候補セット」を記録する（AIは呼ばない）
 *
 * 【なぜ必要か】
 * pick-gacha-images.js / pick-shokugan-images.js は
 * 「前回見た候補セットから増えていなければAIを呼ばない」ようになった
 * （scripts/image-pick-state.js）。
 * ところが既存データには候補セットの記録が無いため、記録が無い商品は
 * hasNewCandidate() が true を返して**全件が初回に1回ずつ判定される**。
 * タカトミ101件＋食玩47件で約$0.52かかる。
 *
 * 既存の判定結果（rakutenThumb / cleanImage）はそのまま有効なので、
 * 楽天API（無料）で今の候補セットだけを記録して、その初回ぶんを省く。
 *
 * 【やること・やらないこと】
 *   やる   : 未採用の商品に *Cands（候補キー）と *CheckedAt（確認日）を書く
 *   やらない: AI判定、既存の採用画像の変更、採用済み商品への書き込み
 *
 * 見送り回数（*Misses）は、過去に何回見送ったか記録が無いので据え置く（= 0から数える）。
 * 候補が増えた時に、これから最大3回まで再判定の機会がある状態になる。
 *
 * 実行例:
 *   DRY_RUN=1 node scripts/backfill-image-cands.js
 *   node scripts/backfill-image-cands.js
 *   TARGET=shokugan node scripts/backfill-image-cands.js
 */
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";
import { searchItems, hasCredentials, sleep } from "./rakuten-api.js";
import { candKeys, isPlaceholderImage, todayStamp } from "./image-pick-state.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");
const SHOKUGAN_PATH = path.join(__dirname, "..", "data", "shokugan.json");

const DRY_RUN = !!process.env.DRY_RUN;
const LIMIT = Number(process.env.LIMIT || 0);
// gacha / shokugan / both
const TARGET = process.env.TARGET || "both";
const MAX_CANDIDATES = 6;
const TAKARATOMY_HOST = "takaratomy-arts.co.jp";

/** pick-gacha-images.js の searchKeyword と同一。ここを変えると候補が変わる。 */
function searchKeyword(product) {
  return String(product.name || "")
    .replace(/【[^】]*】/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function gachaCandidateUrls(product) {
  const r = await searchItems(searchKeyword(product), { hits: MAX_CANDIDATES });
  if (r.error || !r.items?.length) return [];
  return r.items
    .map((i) => String(i.image || "").replace(/_ex=\d+x\d+/, "_ex=400x400"))
    .filter((u) => u && !isPlaceholderImage(u));
}

/** pick-shokugan-images.js の candidateImages と同一（JAN検索・hits=10から6枚）。 */
function shokuganCandidateUrls(jan) {
  return new Promise((resolve) => {
    const params = new URLSearchParams({
      applicationId: process.env.RAKUTEN_APP_ID,
      accessKey: process.env.RAKUTEN_ACCESS_KEY,
      keyword: jan,
      hits: "10",
      format: "json",
    });
    https
      .get(
        `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${params}`,
        { headers: { Origin: "https://gacha-now.vercel.app" } },
        (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => {
            try {
              const data = JSON.parse(body);
              const urls = (data.Items || [])
                .map((x) => x.Item || x)
                .map((i) => i.mediumImageUrls?.[0]?.imageUrl)
                .filter(Boolean)
                .map((u) => u.replace(/_ex=\d+x\d+/, "_ex=400x400"))
                .filter((u) => !isPlaceholderImage(u));
              resolve([...new Set(urls)].slice(0, MAX_CANDIDATES));
            } catch {
              resolve([]);
            }
          });
        }
      )
      .on("error", () => resolve([]));
  });
}

/**
 * 共通の流し込み。
 * fetchUrls で候補URLを取り、candsField / checkedAtField に書いて保存する。
 */
async function backfill({ label, filePath, items, targets, fetchUrls, candsField, checkedAtField }) {
  console.log(`\n── ${label} ──`);
  console.log(`   対象 ${targets.length}件（採用済みと記録済みは除外）`);
  if (targets.length === 0) return;

  let withCands = 0;
  let empty = 0;
  let n = 0;

  for (const it of targets) {
    const urls = await fetchUrls(it);
    await sleep();
    n++;
    const keys = candKeys(urls);
    if (!DRY_RUN) {
      it[candsField] = keys;
      it[checkedAtField] = todayStamp();
      // 逐次保存。245件を4分かけて回すので、途中で止めても進捗が残るようにする。
      fs.writeFileSync(filePath, JSON.stringify(items, null, 2), "utf-8");
    }
    if (keys.length) withCands++;
    else empty++;
    if (n % 20 === 0) console.log(`   ${n}/${targets.length}件`);
  }

  console.log(`   ✅ 候補あり ${withCands}件 / 候補ゼロ ${empty}件`);
}

async function main() {
  if (!hasCredentials()) {
    console.error("❌ 楽天APIの認証情報がありません");
    process.exit(1);
  }
  console.log("🗂  候補セットのバックフィル（AIは呼びません・楽天APIのみ）");

  if (TARGET === "gacha" || TARGET === "both") {
    const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));
    let targets = products.filter(
      (p) =>
        String(p.img || "").includes(TAKARATOMY_HOST) &&
        !p.rakutenThumb &&
        !Array.isArray(p.rakutenThumbCands)
    );
    if (LIMIT > 0) targets = targets.slice(0, LIMIT);
    await backfill({
      label: "タカラトミーアーツ（products.json）",
      filePath: PRODUCTS_PATH,
      items: products,
      targets,
      fetchUrls: gachaCandidateUrls,
      candsField: "rakutenThumbCands",
      checkedAtField: "rakutenThumbCheckedAt",
    });
  }

  if (TARGET === "shokugan" || TARGET === "both") {
    const items = JSON.parse(fs.readFileSync(SHOKUGAN_PATH, "utf8"));
    let targets = items.filter(
      (i) =>
        i.jan && !i.catalogImage && !i.cleanImage && !Array.isArray(i.cleanImageCands)
    );
    if (LIMIT > 0) targets = targets.slice(0, LIMIT);
    await backfill({
      label: "食玩（shokugan.json）",
      filePath: SHOKUGAN_PATH,
      items,
      targets,
      fetchUrls: (it) => shokuganCandidateUrls(it.jan),
      candsField: "cleanImageCands",
      checkedAtField: "cleanImageCheckedAt",
    });
  }

  if (DRY_RUN) console.log("\n※ DRY_RUN のため保存していません");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
