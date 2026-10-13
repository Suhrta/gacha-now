/**
 * r2.js - Cloudflare R2（S3互換API）への最小クライアント
 *
 * 【なぜR2か】
 * サムネイルを public/thumb/ に置いてVercelから配信していたが、
 * 2026-10の実測で VercelのCDNリクエストが 1,650,413 / 上限1,000,000 になり、
 * そのうち gacha-now が 1,365,895（82.8%）を占めていた。
 * 1ページに40〜90枚のサムネイルがあり、28日で17,104ビュー → 約137万リクエスト。
 * 画像を別ドメインから配信すればこの枠から完全に降りられる。
 * あわせてデプロイ容量（1デプロイ約47MBのうち27MBがサムネイル）も減る。
 *
 * R2を選んだ理由はエグレス無料と、請求先がVercelと分かれること。
 * Vercel Blob だと同じ逼迫している枠の中で付け替えるだけになる。
 *
 * 【秘密情報の切り分け】
 * バケット名と公開URLは秘密情報ではないのでコード定数にする。
 * Secret にすると綴り違いに気づけないまま全件失敗する
 * （scripts/rakuten-api.js の RAKUTEN_ORIGIN で一度やった失敗と同じ形）。
 * Secret は3つだけ: R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AwsClient } from "aws4fetch";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// scripts をローカル実行する場合に .env を読む（CIでは環境変数が直接入る）
function loadDotEnv() {
  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i);
    if (process.env[k] === undefined) process.env[k] = t.slice(i + 1);
  }
}
loadDotEnv();

export const BUCKET = "gacha-now-thumb";
export const PUBLIC_BASE = "https://gachaimg.com";

// R2_ACCOUNT_ID には「アカウントIDだけ」が入っている想定だが、
// Cloudflareの画面は S3 API のエンドポイントURL
// （https://<account_id>.r2.cloudflarestorage.com）を大きく表示するので、
// URLごと貼られることが実際にある（2026-10の初回設定でそうなった）。
//
// そのまま使うと URL が https://https://... になり、
// `getaddrinfo ENOTFOUND https` という原因の分かりにくいエラーで落ちる。
// 値の不備を握りつぶさず、かつ人間の自然な間違いは吸収する。
// scripts/rakuten-api.js の normalizeOrigin と同じ考え方
// （あちらは値の不備で全件403になりパイプラインを止めた前例がある）。
function normalizeAccountId(v) {
  const s = (v || "").trim();
  if (!s) return s;
  const m = s.match(/^https?:\/\/([^.]+)\.r2\.cloudflarestorage\.com/i);
  if (m) return m[1];
  return s.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}

const ACCOUNT_ID = normalizeAccountId(process.env.R2_ACCOUNT_ID);
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

/**
 * 認証情報が揃っているか。
 * 揃っていない間は呼び出し側が「今まで通りローカル配信」に倒せるようにする。
 * 移行作業の途中でCIが走っても壊れないようにするための分岐。
 */
export function hasR2() {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY);
}

let client = null;
function getClient() {
  if (!client) {
    client = new AwsClient({
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
      service: "s3",
      region: "auto",
    });
  }
  return client;
}

function objectUrl(key) {
  return `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`;
}

/** 配信に使う公開URL。products.json の thumb にはこの値を入れる。 */
export function publicUrl(key) {
  return `${PUBLIC_BASE}/${key}`;
}

/**
 * オブジェクトを置く。
 * Cache-Control を長めにするのは、サムネイルが「中身が変わったら別キー」になる
 * （キーが商品idなので、同じ商品の画像が差し替わると同じキーで上書きされる）ため
 * 完全な不変ではないが、商品画像が差し替わること自体が稀なので1日で十分。
 */
export async function putObject(key, body, contentType = "image/webp") {
  const res = await getClient().fetch(objectUrl(key), {
    method: "PUT",
    body,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
  if (!res.ok) {
    throw new Error(`R2 PUT ${key} 失敗: ${res.status} ${await res.text()}`);
  }
}

/** オブジェクトを消す。退役した商品のサムネイルを残さないため。 */
export async function deleteObject(key) {
  const res = await getClient().fetch(objectUrl(key), { method: "DELETE" });
  // 既に無い場合の404はエラーにしない（冪等に扱う）
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 DELETE ${key} 失敗: ${res.status}`);
  }
}

/** prefix 配下のキーを全部返す（1000件ごとにページングする）。 */
export async function listKeys(prefix = "") {
  const keys = [];
  let token = null;
  do {
    const params = new URLSearchParams({ "list-type": "2", prefix });
    if (token) params.set("continuation-token", token);
    const res = await getClient().fetch(
      `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}?${params}`
    );
    if (!res.ok) throw new Error(`R2 LIST 失敗: ${res.status}`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(m[1]);
    const next = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
    token = next ? next[1] : null;
  } while (token);
  return keys;
}
