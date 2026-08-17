/**
 * build-thumbs.js
 * 商品サムネイルを仕入れ元CDNから取得し、縮小・WebP化して public/thumb/ に置く
 *
 * なぜ自前で持つか:
 *   一覧のサムネイルは next/image（Vercel Image Optimization）で縮小していたが、
 *   Hobbyの無料枠（変換5,000回・キャッシュリード30万ユニット/月）を使い切り、
 *   新規の変換が 402 で失敗するようになった（2026-08-17 に本番で確認）。
 *   超過しても課金はされないが、キャッシュに無い画像は表示されない。
 *   つまり「新商品ほど画像が出ない」という一番まずい壊れ方をする。
 *
 *   public/ 配下の静的ファイル配信は画像最適化の課金対象ではないため、
 *   あらかじめ縮小したものを置いてしまえばこの上限から完全に降りられる。
 *   元画像は1200px・最大1.5MBあるので、直リンクに戻すのはLCPが悪化して割に合わない。
 *
 * 出力: public/thumb/<商品id>.webp（幅480px・平均37KB・全体で30MB前後）
 *   表示は240px前後・モバイルで50vw なので、DPR2でちょうど足りる幅。
 *   Vercelが配っていた変換後サイズ（384px版26KB / 640px版はそれ以上）の間に収まるので、
 *   どの端末で見ても以前より重くはならない。リポジトリを軽くしたいなら
 *   WIDTH=400 / QUALITY=65 まで落とせる（24KB前後・見た目はほぼ同じ）。
 *   成功した商品には products.json に thumb フィールドを書き戻す。
 *   取得できなかった商品は thumb を持たないので、表示側が仕入れ元URLへ倒れる。
 *
 * 使い方:
 *   node scripts/build-thumbs.js              # 未生成のぶんだけ作る
 *   FORCE=true node scripts/build-thumbs.js   # 既存も作り直す（品質を変えた時）
 *   LIMIT=20 node scripts/build-thumbs.js     # 先頭N件だけ（動作確認用）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = process.env.PRODUCTS_PATH
  || path.join(__dirname, "..", "data", "products.json");
const THUMB_DIR = path.join(__dirname, "..", "public", "thumb");

const WIDTH = 480;
const QUALITY = 70;
// effort 6 は既定の4より1〜2割小さくなる。生成は1日数件なので遅さは問題にならない。
const EFFORT = 6;
// 仕入れ元CDNに負荷をかけない範囲。845件の初回生成でも数分で終わる。
const CONCURRENCY = 4;
const TIMEOUT_MS = 20000;

const FORCE = String(process.env.FORCE || "").toLowerCase() === "true";
const LIMIT = parseInt(process.env.LIMIT || "0", 10);

const UA = "Mozilla/5.0 (compatible; gacha-now-thumb/1.0; +https://gacha-now.net)";

// lib/images.js の mainImageUrl と同じ変換。
// lib/ 側はNextのESM、こちらはNode単体実行で解決系が違うため共有せず写している。
// バンダイのCDNはパスの /model/{s|m|b|xl}/ が解像度で、収集時はb(560px)で保存している。
// 縮小前の解像度が高いほど仕上がりが良いので、生成時だけ xl(1200px) を取りに行く。
function sourceUrl(url) {
  if (!url || !url.includes("bandai-a.akamaihd.net")) return url;
  return url.replace("/model/b/", "/model/xl/");
}

function thumbPath(id) {
  return path.join(THUMB_DIR, `${id}.webp`);
}

async function fetchImage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/*" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // タカラトミーアーツはメンテ中に HTTP 200 + HTMLの案内ページを返す。
  // そのままsharpに渡すと意味の分からないエラーになるので、ここで弾く。
  const type = res.headers.get("content-type") || "";
  if (!type.startsWith("image/")) throw new Error(`画像ではない (${type})`);
  return Buffer.from(await res.arrayBuffer());
}

async function buildOne(product) {
  const src = sourceUrl(product.img);
  const buf = await fetchImage(src);
  const out = await sharp(buf)
    .resize({ width: WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: EFFORT })
    .toBuffer();
  fs.writeFileSync(thumbPath(product.id), out);
  return out.length;
}

// 元画像を持たない商品。プレースホルダは表示側の NoImage が出すので生成しない。
function hasSource(product) {
  return Boolean(product.img) && !product.img.includes("placehold");
}

function prune(products) {
  const alive = new Set(products.map((p) => `${p.id}.webp`));
  let removed = 0;
  for (const file of fs.readdirSync(THUMB_DIR)) {
    if (!file.endsWith(".webp") || alive.has(file)) continue;
    fs.unlinkSync(path.join(THUMB_DIR, file));
    removed++;
  }
  return removed;
}

async function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));
  fs.mkdirSync(THUMB_DIR, { recursive: true });

  // 既にファイルがある商品は作り直さない。毎日の実行で叩くのは新商品ぶんだけになる。
  let targets = products.filter(
    (p) => hasSource(p) && (FORCE || !fs.existsSync(thumbPath(p.id)))
  );
  if (LIMIT > 0) targets = targets.slice(0, LIMIT);

  console.log(`商品 ${products.length}件 / 生成対象 ${targets.length}件`);

  let done = 0;
  let bytes = 0;
  const failed = [];

  // 固定本数のワーカーで順に取り出す。並列数を上げすぎると仕入れ元に迷惑がかかる。
  const queue = targets.slice();
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        try {
          // bytes += await ... と書くと、加算前の値を読んでから待つため
          // 並列ワーカー間で加算が取りこぼされる。合計だけが狂って気づきにくい。
          const size = await buildOne(p);
          bytes += size;
          done++;
          if (done % 50 === 0) console.log(`  ${done}/${targets.length}件`);
        } catch (e) {
          failed.push({ id: p.id, name: p.name, reason: e.message });
        }
      }
    })
  );

  // 生成済みファイルの有無をそのまま products.json に反映する。
  // 表示側は thumb があればそれを、無ければ仕入れ元URLを使う。
  let changed = 0;
  for (const p of products) {
    const url = fs.existsSync(thumbPath(p.id)) ? `/thumb/${p.id}.webp` : undefined;
    if (p.thumb === url) continue;
    if (url) p.thumb = url;
    else delete p.thumb;
    changed++;
  }
  if (changed > 0) {
    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf-8");
  }

  // 3ヶ月で削除された商品のサムネイルは残しても誰も見ない。デプロイサイズを増やさない。
  const removed = prune(products);

  console.log(`✅ 生成 ${done}件 (${(bytes / 1024 / 1024).toFixed(1)}MB)`);
  if (changed) console.log(`   products.json の thumb を ${changed}件更新`);
  if (removed) console.log(`   古いサムネイル ${removed}件を削除`);
  if (failed.length) {
    console.log(`⚠️ 失敗 ${failed.length}件（仕入れ元URLで表示される。翌日の実行で再挑戦）`);
    for (const f of failed.slice(0, 10)) console.log(`   ${f.id} ${f.name}: ${f.reason}`);
    if (failed.length > 10) console.log(`   ...他 ${failed.length - 10}件`);
  }
}

main().catch((e) => {
  console.error("❌ サムネイル生成に失敗:", e);
  process.exit(1);
});
