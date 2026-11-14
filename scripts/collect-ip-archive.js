/**
 * collect-ip-archive.js - 人気IPの「これまでに出たガチャ」を公式検索から集める
 *
 * 【なぜ必要か】
 * collect.js はバンダイの発売スケジュール（前月・今月・来月）しか見ておらず、
 * 商品は3ヶ月で掲載終了する。新作が月1件程度のIPは常に数件しか並ばない。
 * 2026-11-14 時点で /brand/chiikawa は掲載4件、競合は149種を並べていて、
 * 「ちいかわガチャガチャ 最新」3,066表示が10.7位・しかもトップページに着地していた
 * （ハブが答えになっていない）。めじるしの歴代ページが同じ作りで4.3位まで上がったので、
 * ちいかわでも「これまでに出たもの」をハブページの中に並べる。
 *
 * 【取り方】
 * ガシャポン公式の検索 https://gashapon.jp/products/result.php?free=ちいかわ は
 * 1回のアクセスで全件（2026-11-14 実測52件・1/1ページ）を新しい順に返す。
 * 商品名・価格・画像・JANは取れるが、発売日は載っていないので
 * 詳細ページ（.--releaseDate）を、まだ持っていない商品だけ1回あたり少しずつ読む。
 *
 * 【gashapon.jp の403に注意】（[[official-info-scraping]]）
 * 大量アクセスで403になり、collect.js が毎日使う /schedule/ まで止まった前例がある。
 * 詳細ページは MAX_DETAIL 件（既定10）まで・直列・間隔を空けて読み、
 * 403/429 を受けたらその回は即打ち切る。残りは翌日以降に回収される。
 *
 * 実行:
 *   node scripts/collect-ip-archive.js
 *   MAX_DETAIL=50 DELAY_MS=3000 node scripts/collect-ip-archive.js   # 初回の一括埋め（手動）
 *   DRY_RUN=1 node scripts/collect-ip-archive.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "ip-archive.json");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const BASE = "https://gashapon.jp/products/";
const DRY_RUN = !!process.env.DRY_RUN;
const MAX_DETAIL = Number(process.env.MAX_DETAIL || 10);
const DELAY_MS = Number(process.env.DELAY_MS || 2000);

// slug は /brand/{slug} と揃える。
// match は検索結果の誤爆を落とすためのもの。
// 「ハグコット なんか小さくてかわいいやつ」はちいかわの正式タイトルなので残す。
const IPS = [
  { slug: "chiikawa", query: "ちいかわ", match: /ちいかわ|なんか小さくてかわいいやつ/ },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class BlockedError extends Error {}

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 403 || res.status === 429) throw new BlockedError(`${res.status} ${url}`);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function decode(s) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSearch(html) {
  const out = [];
  const seen = new Set();
  const blocks = html.match(/<a href="detail\.php\?jan_code=\d+"[^>]*class="c-card__link"[\s\S]*?<\/a>/g) || [];
  for (const b of blocks) {
    const jan = b.match(/jan_code=(\d+)/)[1];
    if (seen.has(jan)) continue;
    seen.add(jan);
    const name = b.match(/c-card__name[^>]*>([\s\S]*?)<\//);
    const price = b.match(/c-card__price--main[^>]*>([\s\S]*?)<\//);
    const img = b.match(/<img[^>]+src="([^"]+)"/);
    out.push({
      jan,
      name: name ? decode(name[1]) : null,
      price: price ? Number(decode(price[1]).replace(/[^\d]/g, "")) || null : null,
      img: img ? img[1] : null,
    });
  }
  return out;
}

// 「2026年11月 第3週」→ { release: "2026年11月 第3週", ym: "2026-11" }
export function parseRelease(html) {
  const m = html.match(/--releaseDate[^>]*>([\s\S]*?)<\/dd>/);
  if (!m) return { release: null, ym: null };
  const release = decode(m[1]);
  const ym = release.match(/(\d{4})年\s*(\d{1,2})月/);
  return { release: release || null, ym: ym ? `${ym[1]}-${ym[2].padStart(2, "0")}` : null };
}

async function main() {
  const archive = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, "utf-8")) : {};
  let detailBudget = MAX_DETAIL;
  let blocked = false;
  let changed = false;

  for (const ip of IPS) {
    if (blocked) break;
    const prev = archive[ip.slug] || { items: [] };
    const prevByJan = new Map(prev.items.map((i) => [i.jan, i]));

    let found;
    try {
      found = parseSearch(await get(`${BASE}result.php?free=${encodeURIComponent(ip.query)}`));
    } catch (e) {
      console.warn(`[${ip.slug}] 検索に失敗。前回のデータを残す: ${e.message}`);
      if (e instanceof BlockedError) break;
      continue;
    }
    // 検索ページの形が変わって0件になったら、前回分を消さない
    if (found.length === 0) {
      console.warn(`[${ip.slug}] 検索結果が0件。ページの形が変わった可能性。前回のデータを残す`);
      continue;
    }

    // 【箱売】はガチャではなく箱での販売（同じ商品の重複）
    const items = found
      .filter((i) => i.name && ip.match.test(i.name) && !i.name.includes("【箱売】"))
      .map((i) => ({ ...prevByJan.get(i.jan), ...i }));
    // 公式検索から消えた商品も、一度載せたものは残す
    const jans = new Set(items.map((i) => i.jan));
    for (const p of prev.items) if (!jans.has(p.jan)) items.push(p);

    for (const item of items) {
      if (item.releaseChecked || blocked || detailBudget <= 0) continue;
      try {
        Object.assign(item, parseRelease(await get(`${BASE}detail.php?jan_code=${item.jan}`)), {
          releaseChecked: true,
        });
        detailBudget--;
        await sleep(DELAY_MS);
      } catch (e) {
        console.warn(`[${ip.slug}] 詳細の取得に失敗: ${e.message}`);
        if (e instanceof BlockedError) blocked = true;
      }
    }

    const pending = items.filter((i) => !i.releaseChecked).length;
    console.log(`[${ip.slug}] ${items.length}件（発売日未取得 ${pending}件）`);
    // 中身が同じ日は日付も動かさない。動かすと毎日コミット→デプロイが走る
    // （Vercelのデプロイ容量・Edge Requests枠を食う。[[deployment-storage-limit]]）
    if (JSON.stringify(prev.items) === JSON.stringify(items)) continue;
    archive[ip.slug] = { query: ip.query, checkedAt: new Date().toISOString().slice(0, 10), items };
    changed = true;
    if (blocked) break;
  }

  if (!changed) {
    console.log("変更なし");
    return;
  }
  if (DRY_RUN) {
    console.log("DRY_RUN: 書き込みなし");
    return;
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(archive, null, 1) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
