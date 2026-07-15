/**
 * rakuten-api.js - 楽天商品検索API（2026年新仕様）の共有ヘルパー
 *
 * 【2026年のAPI刷新への対応】
 * - 旧: app.rakuten.co.jp/services/api/... （2026/5/14に完全停止）
 * - 新: openapi.rakuten.co.jp/ichibams/api/...
 *   必須: applicationId + accessKey（クエリ） + Origin ヘッダー（許可ドメイン一致）
 *   ※ Node の fetch は Origin/Referer を禁止ヘッダーとして削除するため node:https を使う
 *
 * 認証情報は環境変数から読む（.env / GitHub Secrets）:
 *   RAKUTEN_APP_ID, RAKUTEN_ACCESS_KEY
 *   RAKUTEN_ORIGIN（省略時は楽天アプリの許可ドメイン既定値）
 */
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const APP_ID = process.env.RAKUTEN_APP_ID;
const ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY;

// アプリの「Allowed websites」に登録済みのドメイン。秘密情報ではなく固定の設定値なので
// 既定値をコードに持つ（環境変数は上書き用）。スキーム欠落・末尾スラッシュ・空白は
// そのまま送ると楽天に「Originなし」と判定され全件403になるため正規化する。
const DEFAULT_ORIGIN = "https://gacha-now.vercel.app";
function normalizeOrigin(v) {
  const s = (v || "").trim().replace(/\/+$/, "");
  if (!s) return DEFAULT_ORIGIN;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    // URL()はかなり寛容なので、ドメインとして妥当な場合のみ採用する。
    // 壊れた値をそのまま送ると全リクエストが403になり原因が見えづらい。
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname)) return DEFAULT_ORIGIN;
    return u.origin;
  } catch {
    return DEFAULT_ORIGIN;
  }
}
const ORIGIN = normalizeOrigin(process.env.RAKUTEN_ORIGIN);

const ENDPOINT =
  "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601";

export function hasCredentials() {
  return Boolean(APP_ID && ACCESS_KEY);
}

function get(url) {
  return new Promise((resolve) => {
    https
      .get(url, { headers: { Origin: ORIGIN } }, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve({ status: res.statusCode, body: d }));
      })
      .on("error", (e) => resolve({ status: 0, body: "", error: e.message }));
  });
}

/**
 * キーワード検索し、ヒット総件数と上位商品を返す。
 * @returns {Promise<{count:number, items:Array<{name,price,url,image}>, error?:string}>}
 */
export async function searchItems(keyword, { hits = 3 } = {}) {
  if (!hasCredentials()) {
    return { count: 0, items: [], error: "no-credentials" };
  }
  const params = new URLSearchParams({
    applicationId: APP_ID,
    accessKey: ACCESS_KEY,
    keyword,
    hits: String(hits),
    format: "json",
  });
  const { status, body, error } = await get(`${ENDPOINT}?${params}`);
  if (error) return { count: 0, items: [], error };
  if (status !== 200) {
    let msg = `http-${status}`;
    try {
      msg = JSON.parse(body)?.errors?.errorMessage || msg;
    } catch {}
    return { count: 0, items: [], error: msg };
  }
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return { count: 0, items: [], error: "bad-json" };
  }
  const items = (data.Items || []).map((x) => {
    const it = x.Item || x;
    return {
      name: it.itemName,
      price: it.itemPrice,
      url: it.itemUrl,
      image: it.mediumImageUrls?.[0]?.imageUrl || null,
    };
  });
  return { count: data.count ?? 0, items };
}

/** 総ヒット件数だけ取得（検証用・軽量） */
export async function searchCount(keyword) {
  const r = await searchItems(keyword, { hits: 1 });
  return r.error ? { count: 0, error: r.error } : { count: r.count };
}

// 楽天APIのレート制限（1リクエスト/秒）に合わせた待機
export const RATE_LIMIT_MS = 1100;
export const sleep = (ms = RATE_LIMIT_MS) =>
  new Promise((r) => setTimeout(r, ms));
