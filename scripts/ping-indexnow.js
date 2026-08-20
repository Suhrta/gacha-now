/**
 * ping-indexnow.js - 新着で内容が変わったURLをIndexNowで即時通知する
 *
 * IndexNow は Bing / Yandex / Seznam などが共同で使うプッシュ型のクロール通知。
 * クローラの巡回を待たずに「このURLが変わった」と伝えられる。
 * GA4実測(2026-08-19)で bing/organic が流入の約4割を占めており、
 * 毎日3回更新するこのサイトとは相性が良い。
 *
 * Google は IndexNow に参加していないので、Google 側は従来どおり
 * サイトマップ + 通常クロール任せになる。ここで通知しても損はしない。
 *
 * 通知するのは「新着商品があったときだけ」。新着が無い回で毎回同じURLを投げると
 * 無意味なリクエストになるうえ、スパム扱いされる可能性がある。
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isLowValueProduct } from "../lib/quality.js";
import { getReleaseYearMonth } from "../lib/release.js";
import { CHARACTERS, filterProductsByCharacter } from "../data/characters.js";
import { SERIES, filterProductsBySeries } from "../data/series.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// このキーは秘密情報ではない。仕様上 public/<key>.txt として全世界に公開して
// ドメイン所有の証明に使うものなので、リポジトリに直接書いてよい。
const KEY = "be3e66a0f7ad4f7ba43b461703d6d621";
const HOST = "gacha-now.net";
const BASE = `https://${HOST}`;
const KEY_LOCATION = `${BASE}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/IndexNow";

function readJson(relPath, fallback) {
  const full = path.join(__dirname, relPath);
  if (!fs.existsSync(full)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(full, "utf-8"));
  } catch {
    return fallback;
  }
}

function main() {
  // new-today.json は「今回のランで新規追加された商品名」の配列（update.js が書く）
  const newNames = readJson("../data/new-today.json", []);
  if (!Array.isArray(newNames) || newNames.length === 0) {
    console.log("新着なし。IndexNow通知はスキップします。");
    return;
  }

  const products = readJson("../data/products.json", []);
  const nameSet = new Set(newNames);
  const newProducts = products.filter((p) => nameSet.has(p.name));

  if (newProducts.length === 0) {
    console.log("new-today.json の商品が products.json に見つかりません。スキップします。");
    return;
  }

  const urls = new Set();

  // トップは新着一覧を含むので必ず変わる
  urls.add(`${BASE}/`);

  // 商品ページ。noindex にしているものは通知しない
  // （自分で noindex と申告しているページをクロールさせても意味がない）
  for (const p of newProducts) {
    if (!isLowValueProduct(p)) urls.add(`${BASE}/item/${p.id}`);
  }

  // 新着が属するブランド一覧ページ
  for (const slug of new Set(newProducts.map((p) => p.brandSlug).filter(Boolean))) {
    urls.add(`${BASE}/brand/${slug}`);
  }

  // 新着が属する発売月ページ。実測で最もクリックを生む面なので優先度が高い
  for (const ym of new Set(newProducts.map(getReleaseYearMonth).filter(Boolean))) {
    urls.add(`${BASE}/release/${ym}`);
  }

  // 新着がヒットするキャラ・シリーズページ
  for (const c of CHARACTERS) {
    if (filterProductsByCharacter(newProducts, c).length > 0) {
      urls.add(`${BASE}/character/${c.slug}`);
    }
  }
  for (const s of SERIES) {
    if (filterProductsBySeries(newProducts, s).length > 0) {
      urls.add(`${BASE}/series/${s.slug}`);
    }
  }

  const urlList = [...urls];
  console.log(`IndexNow通知対象: ${urlList.length}件（新着商品 ${newProducts.length}件）`);
  urlList.forEach((u) => console.log("  " + u));

  // INDEXNOW_DRY_RUN=1 で送信せず対象URLの確認だけ行う
  if (process.env.INDEXNOW_DRY_RUN) {
    console.log("DRY RUN のため送信しません。");
    return;
  }

  return fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  })
    .then((res) => {
      // 200/202 が成功。422 はキーファイル未配置やURL不一致
      if (res.ok) {
        console.log(`✅ IndexNow通知成功 (${res.status})`);
      } else {
        console.warn(`⚠️ IndexNow通知が受理されませんでした (${res.status})`);
      }
    })
    .catch((e) => {
      // 通知は補助的な施策なので、失敗してもパイプラインは止めない
      console.warn("⚠️ IndexNow通知に失敗:", e.message);
    });
}

await main();
