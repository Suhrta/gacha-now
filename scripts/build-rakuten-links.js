/**
 * build-rakuten-links.js
 *
 * 各商品について「コンプセット」「予約」の楽天検索クエリを、
 * 候補を具体→広義の順に楽天APIで検証し、実際にヒットする最具体クエリだけを採用する。
 * → 0件リンクを作らない（制約）。手動運用ゼロ（パイプライン組み込み）。
 *
 * 出力: data/rakuten-links.json
 *   { [productId]: { compset?: {q,count}, preorder?: {q,count}, checkedAt, sig } }
 *
 * キャッシュ: 商品の属性シグネチャ(sig)が変わらない & MAX_AGE 内なら再検証しない。
 *   → 日次実行では新商品と古い項目だけAPIを叩く（軽量）。
 *
 * 実行: node scripts/build-rakuten-links.js
 *   環境変数 RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY が必要。
 *   オプション: LIMIT=10（先頭N件だけ処理・サンプル確認用）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { searchCount, hasCredentials, sleep } from "./rakuten-api.js";
import { seriesForProduct } from "../data/series.js";
import { charactersForProduct } from "../data/characters.js";
import { isReleased } from "../lib/release.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH =
  process.env.PRODUCTS_PATH || path.join(__dirname, "../data/products.json");
const OUT_PATH = path.join(__dirname, "../data/rakuten-links.json");

// 採用の最低ヒット件数（バッファを持たせ、後日0件化しにくくする）
const MIN_HITS = 3;
// キャッシュ有効期間（日）。これを過ぎた項目は再検証（在庫状況の変化に追従）
const MAX_AGE_DAYS = 14;
// 1回の実行で再検証する最大件数（API時間の上限。新商品は常に優先）
const MAX_VALIDATIONS = Number(process.env.MAX_VALIDATIONS || 700);
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;

// 商品名から検索の邪魔になりやすい装飾を除いてコア語を得る
function productCore(name) {
  return name
    .replace(/【[^】]*】/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[0-9]+種(類)?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// 単体シードにすると広すぎ/曖昧すぎて無関係ページに飛ばす汎用語（クエリの主語には使わない）
const GENERIC =
  /^(ガチャ|ガシャポン|カプセル|カプセルトイ|マスコット|フィギュア|コレクション|アクセサリー|チャーム|キーホルダー|ストラップ|ラバー|ラバーマスコット|ぬいぐるみ|シリーズ|クリア|ミニ|セット|コンプ|Fig|フィギュアマスコット|ボールチェーン|スタンド|アクスタ|アクリル|缶バッジ|ピンズ|ピンズコレクション|ステッカー|ジオラマ|編|映画|劇場版|劇場|アニメ|TVアニメ|TV|新作|限定|再販|通常|プレミアム|コラボ)$/i;

/**
 * 検索の主語となるシード語を関連性の高い順に集める:
 *   シリーズ名 > キャラ/IP名 > 商品名の非汎用トークン(=作品名のことが多い)
 * 商品名トークンを入れることで、CHARACTERS未登録のニッチIP（例: ソウルイーター）も拾える。
 * ブランド名(バンダイ等)は特定商品のコンプ/予約には無関係すぎるのでシードにしない。
 * 実在性はAPI検証で担保するので、無関係な語が混じっても MIN_HITS 未満で自然に脱落する。
 */
function seedsFor(product) {
  const seeds = [];
  seriesForProduct(product).forEach((s) => seeds.push(s.name));
  charactersForProduct(product).forEach((c) => seeds.push(c.name));
  // 名前トークンは「CJKを含む3文字以上」に限定する。
  // 英語partial(BANANA→バナナ雑貨/BEAT等)や2文字の汎用語(神様等)は無関係ページに飛ばすため除外。
  // 人気IP(すみっコぐらし/忍たま乱太郎/ラプンツェル等・CHARACTERS未登録)はこれで拾える。
  const CJK = /[぀-ヿ㐀-鿿]/;
  const tokens = productCore(product.name)
    .split(/[ 　・\-—「」『』()（）～〜！？＆/｜+＋]/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && CJK.test(t) && !GENERIC.test(t));
  tokens.slice(0, 3).forEach((t) => seeds.push(t));
  return [...new Set(seeds)];
}

// 意図別の候補クエリを具体→広義で生成（先頭ほど関連性が高い）
function candidateQueries(product, intent) {
  const core = productCore(product.name);
  const seeds = seedsFor(product);
  const out = [];
  if (intent === "compset") {
    out.push(`${core} コンプ`);
    out.push(`${core} セット`);
    for (const s of seeds) out.push(`${s} ガチャ コンプ`);
    for (const s of seeds) out.push(`${s} ガチャ セット`);
  } else if (intent === "preorder") {
    out.push(`${core} 予約`);
    for (const s of seeds) out.push(`${s} ガチャ 予約`);
    for (const s of seeds) out.push(`${s} 予約`);
  }
  // 重複除去 + 候補数を上限（API時間を抑制）
  return [...new Set(out.map((q) => q.replace(/\s+/g, " ").trim()))]
    .filter(Boolean)
    .slice(0, 8);
}

// キャッシュ判定用シグネチャ（この値が変わったら再検証）
//
// クエリ生成に実際に効く項目だけを入れる。brand は candidateQueries が使っていない
// （検索の主語はシリーズ名・キャラ名・商品名トークンで、「バンダイ」等は無関係すぎるため）。
// 以前は brand を含めていたので、BRAND_MAP を拡張して brand を振り直すたびに
// 全商品のキャッシュが無効化され、クエリは1文字も変わらないのに再検証が走っていた
// （2026-07-15の実行では205件が再検証され、API690回とMAX_VALIDATIONS=700に肉薄した）。
function signature(product) {
  return [product.name, product.types, isReleased(product) ? "r" : "p"].join("|");
}

async function pickQuery(product, intent, stats) {
  for (const q of candidateQueries(product, intent)) {
    if (stats.validations >= MAX_VALIDATIONS) return null;
    const { count, error } = await searchCount(q);
    stats.validations++;
    stats.apiCalls++;
    await sleep();
    if (error) {
      stats.errors++;
      if (error === "no-credentials") throw new Error("楽天API認証情報がありません（RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY）");
      continue;
    }
    if (count >= MIN_HITS) return { q, count };
  }
  return null; // 全滅 → その意図のボタンは出さない（0件リンクを作らない）
}

async function main() {
  if (!hasCredentials()) {
    console.error("❌ RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY が未設定です。");
    process.exit(1);
  }

  // プリフライト: 認証情報・Origin(許可ドメイン)が正しいか1回のテスト検索で確認。
  // 誤設定のまま全商品を「ボタンなし」で黙って通すのを防ぐ（特にCI）。
  const preflight = await searchCount("ちいかわ");
  if (preflight.error) {
    // 失敗の層ごとに直す場所が違う。2026-10-11に実測で切り分けた対応表:
    //
    //   API Configuration not found … **叩いている API の版が廃止されている**。
    //     文言から認証やアプリ設定を疑いがちだが全部ハズレ。2026-10に実際に
    //     管理画面まで見に行って、アプリACTIVE・App ID一致・Allowed websites一致・
    //     Ichibaスコープ有効と全部正しいのに直らず、Edit保存のやり直しも空振りした。
    //     真因は rakuten-api.js の ENDPOINT 末尾が旧版(20220601)だったこと。
    //     → https://webservice.rakuten.co.jp/documentation/ichiba-item-search の
    //       「Endpoint」に出ている現行版に ENDPOINT を差し替える。認証情報は触らない。
    //     見分け方: キーが違えば 403 Invalid Access Key、Originが許可外なら
    //     403 HTTP_REFERRER_NOT_ALLOWED で手前で弾かれる。400まで来ている時点で
    //     認証情報とOriginは正しいと断定してよい。
    //   Invalid Access Key … accessKey が違う。→ 管理画面の👁で実値を確認して差し替え。
    //   HTTP_REFERRER_NOT_ALLOWED … Origin が Allowed websites に無い。
    //     → 管理画面の Allowed websites と DEFAULT_ORIGIN を一致させる。
    //   REQUEST_CONTEXT_BODY_HTTP_REFERRER_MISSING … Origin が送れていない。
    //     → rakuten-api.js が node:https を使っているか確認（fetchだと消される）。
    //   accessKey must be present … Secret が空。→ GitHub Secrets を確認。
    //
    // この導線が黙って死んでいても商品更新は通るので continue-on-error のままにし、
    // 代わりにワークフロー側が outcome を見て Discord に通知する。
    const hint = /API Configuration not found/.test(preflight.error)
      ? `   → APIの版が廃止されています。認証情報・アプリ設定は正常です。\n` +
        `     （キー違いなら Invalid Access Key、Origin違いなら HTTP_REFERRER_NOT_ALLOWED）\n` +
        `     https://webservice.rakuten.co.jp/documentation/ichiba-item-search の\n` +
        `     「Endpoint」に出ている現行版に rakuten-api.js の ENDPOINT を差し替えてください。`
      : `   → RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY / RAKUTEN_ORIGIN を確認してください。\n` +
        `     （Origin は楽天アプリの「Allowed websites」と一致する必要があります）`;
    console.error(`❌ 楽天APIプリフライト失敗: ${preflight.error}\n${hint}`);
    process.exit(1);
  }
  await sleep();

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));
  const cache = fs.existsSync(OUT_PATH)
    ? JSON.parse(fs.readFileSync(OUT_PATH, "utf8"))
    : {};

  const now = Date.now();
  const maxAgeMs = MAX_AGE_DAYS * 86400 * 1000;
  const stats = { validations: 0, apiCalls: 0, errors: 0, updated: 0, skipped: 0 };

  let processed = 0;
  for (const product of products) {
    if (processed >= LIMIT) break;
    processed++;

    const prev = cache[product.id];
    const sig = signature(product);
    const fresh =
      prev && prev.sig === sig && prev.checkedAt && now - prev.checkedAt < maxAgeMs;
    if (fresh) {
      stats.skipped++;
      continue;
    }
    if (stats.validations >= MAX_VALIDATIONS) break;

    const entry = { sig, checkedAt: now };
    // コンプセットは複数種のガチャのみ（1種に「全種セット」は概念的に不要）
    if ((product.types || 0) >= 2) {
      const r = await pickQuery(product, "compset", stats);
      if (r) entry.compset = r;
    }
    // 予約は発売前のみ
    if (!isReleased(product)) {
      const r = await pickQuery(product, "preorder", stats);
      if (r) entry.preorder = r;
    }
    cache[product.id] = entry;
    stats.updated++;

    if (stats.updated % 20 === 0) {
      console.log(`  …${stats.updated}件更新 / API ${stats.apiCalls}回`);
      fs.writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2)); // 途中保存
    }
  }

  // 削除済み商品のエントリを掃除
  const validIds = new Set(products.map((p) => p.id));
  for (const id of Object.keys(cache)) if (!validIds.has(id)) delete cache[id];

  fs.writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2));
  console.log(
    `\n✅ 完了: 更新${stats.updated} / スキップ(キャッシュ)${stats.skipped} / API${stats.apiCalls}回 / エラー${stats.errors}`
  );
  console.log(`💾 ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
