/**
 * enrich-shokugan.js - 食玩に「価格」と「楽天の商品画像・購入導線」を足す
 *
 * 【2つの情報源を使い分ける理由】
 *
 * 1) 価格 … バンダイの商品詳細ページから取る。
 *    価格は事実であって創作的表現ではないので、著作権の問題にならない。
 *    公式の説明文は**全文を載せない**（情報源として使うだけ）。バンダイの
 *    「著作権・商標について」が複製・転載を明確に断っているため。
 *
 * 2) 画像と購入導線 … 楽天APIから取る。
 *    バンダイの画像を自サーバーへコピーしない代わりに、楽天の商品画像を
 *    アフィリエイトリンクと併せて直リンクで表示する。APIの利用目的と整合する。
 *    JANコードで引けるので、ガチャ側のキーワード推測より精度が高い
 *    （実測3件中3件が一致）。
 *
 * 【BOX（箱買い）を優先する】
 * 食玩は1個売りと10個入りBOXの両方が流通し、まとめ買い需要が大きい。
 * JAN単体の検索結果にはどちらも混ざるので、商品名＋BOX語でも引いて別導線にする。
 *
 * 【負荷】
 * 1商品あたり最大3リクエスト（公式詳細1＋楽天2）。楽天は1リクエスト/秒の制限がある。
 * 1ランの上限は LIMIT 件（既定30）。初回の流し込みはローカルで回す想定。
 */
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";
import { searchItems, hasCredentials, sleep } from "./rakuten-api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data", "shokugan.json");

const UA = "Mozilla/5.0 (compatible; gacha-now/1.0; +https://gacha-now.net)";
const LIMIT = Number(process.env.LIMIT || 30);
// 再取得の間隔。価格も在庫も頻繁には変わらないので長めでよい。
const MAX_AGE_DAYS = 30;
// この件数未満のヒットは「実在しない組み合わせ」とみなして導線を出さない。
// 0件リンクや無関係な商品に飛ばさないため（ガチャ側の MIN_HITS と同じ考え方）。
const MIN_HITS = 3;
// 価格の抽出ロジックを直したときに取り直すためのフラグ。
const FORCE_PRICE = String(process.env.FORCE_PRICE || "") === "1";

/** 楽天のサムネイルURLは _ex= で寸法を指定できる。一覧用に少し大きめを取る。 */
function upsizeRakutenImage(url) {
  if (!url) return null;
  return url.replace(/_ex=\d+x\d+/, "_ex=400x400");
}

/**
 * 商品価格ナビ（製品マスター）の画像を取る。
 *
 * 市場の商品検索(IchibaItem)が返すのは**店舗が作った出品画像**で、
 * 「送料無料」「500円OFFクーポン」「20個」といった販促バナーが焼き込まれていることが多い。
 * 商品情報ページに出すと内容を誤認させるので、まずカタログ側の画像を探す。
 * こちらは製品マスターの画像なのでバナーが乗らない。
 *
 * ただしカバレッジは低い（製品登録が無い商品、登録はあるが画像が無い商品がある）。
 * 取れなかった場合の扱いは表示側で決める。
 */
function fetchCatalogImage(jan) {
  return new Promise((resolve) => {
    const params = new URLSearchParams({
      applicationId: process.env.RAKUTEN_APP_ID,
      accessKey: process.env.RAKUTEN_ACCESS_KEY,
      keyword: jan,
      hits: "1",
      format: "json",
    });
    https
      .get(
        `https://openapi.rakuten.co.jp/ichibaproduct/api/Product/Search/20250801?${params}`,
        { headers: { Origin: "https://gacha-now.vercel.app" } },
        (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => {
            if (res.statusCode !== 200) return resolve(null);
            try {
              const data = JSON.parse(body);
              const first = (data.Products || [])[0];
              const p = first ? first.Product || first : null;
              resolve(p && p.mediumImageUrl ? upsizeRakutenImage(p.mediumImageUrl) : null);
            } catch {
              resolve(null);
            }
          });
        }
      )
      .on("error", () => resolve(null));
  });
}

async function fetchOfficialPrice(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // 公式の書式は「160円（税込:176円）」。全角コロンの場合もあるので両方許容する。
  // 最初は /税込\s*([0-9,]+)円/ としていてコロンに阻まれ、税抜だけを保存していた。
  // 日本では総額表示が求められるので、税込を取り損ねると実害になる。
  const taxIn = html.match(/税込[:：]?\s*([0-9,]+)\s*円/);
  const base = html.match(/([0-9,]+)\s*円/);
  return {
    price: base ? Number(base[1].replace(/,/g, "")) : null,
    priceTaxIn: taxIn ? Number(taxIn[1].replace(/,/g, "")) : null,
  };
}

function isStale(item) {
  if (!item.enrichedAt) return true;
  return Date.now() - item.enrichedAt > MAX_AGE_DAYS * 86400 * 1000;
}

async function main() {
  if (!hasCredentials()) {
    console.error("❌ 楽天APIの認証情報がありません（RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY）");
    process.exit(1);
  }

  const items = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  // FORCE_PRICE のときは enrichedAt の新しさで弾かない（取り直しが目的なので）。
  const targets = items.filter((i) => FORCE_PRICE || isStale(i)).slice(0, LIMIT);
  console.log(`🍬 食玩の情報付与: 対象 ${targets.length}件 / 全${items.length}件`);

  let priced = 0;
  let matched = 0;
  let boxed = 0;
  let errors = 0;
  let catalogHits = 0;

  for (const item of targets) {
    // --- 価格（公式・事実のみ） ---
    // FORCE_PRICE=1 で取り直す（抽出ロジックを直したときに使う）。
    const needPrice =
      FORCE_PRICE || (item.price === undefined && Boolean(item.officialUrl));
    if (needPrice && item.officialUrl) {
      try {
        const p = await fetchOfficialPrice(item.officialUrl);
        item.price = p.price;
        if (p.priceTaxIn) item.priceTaxIn = p.priceTaxIn;
        else delete item.priceTaxIn;
        if (item.price) priced++;
      } catch (e) {
        item.price = null;
        errors++;
      }
      await new Promise((r) => setTimeout(r, 800));
    }

    // --- 楽天（画像・単品導線） ---
    // JANが無いものはプレミアムバンダイ限定などで、楽天に無いことが多い。
    // 商品名で引くと別物に当たるので、JANが無い場合は引かない。
    if (item.jan) {
      const single = await searchItems(item.jan, { hits: 3 });
      await sleep();
      if (!single.error && single.count >= 1 && single.items.length > 0) {
        const top = single.items[0];
        // shopImage は販促バナー入りのことが多い。表示に使うかは表示側で決める。
        item.shopImage = upsizeRakutenImage(top.image);
        item.rakutenCount = single.count;
        matched++;

        // カタログ画像（バナーなし）を探す。取れたらこちらを表示に使う。
        const catalog = await fetchCatalogImage(item.jan);
        await sleep();
        if (catalog) {
          item.catalogImage = catalog;
          catalogHits++;
        } else {
          delete item.catalogImage;
        }

        // --- BOX（箱買い） ---
        const box = await searchItems(`${item.jan} BOX`, { hits: 1 });
        await sleep();
        if (!box.error && box.count >= MIN_HITS) {
          item.rakutenBoxCount = box.count;
          boxed++;
        } else {
          delete item.rakutenBoxCount;
        }
      } else {
        delete item.shopImage;
        delete item.catalogImage;
        delete item.rakutenCount;
        delete item.rakutenBoxCount;
      }
    }

    item.enrichedAt = Date.now();
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");

  console.log(
    `\n✅ 価格取得 ${priced}件 / 楽天一致 ${matched}件 / カタログ画像 ${catalogHits}件 / BOXあり ${boxed}件 / エラー ${errors}件`
  );
  const withCatalog = items.filter((p) => p.catalogImage).length;
  const withShop = items.filter((p) => p.shopImage).length;
  const withPrice = items.filter((p) => typeof p.price === "number").length;
  console.log(`   カタログ画像(バナーなし)      : ${withCatalog}/${items.length}`);
  console.log(`   店舗画像(バナー入りの可能性)  : ${withShop}/${items.length}`);
  console.log(`   価格あり                      : ${withPrice}/${items.length}`);
  console.log(`💾 ${DATA_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
