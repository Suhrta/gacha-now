/**
 * pick-shokugan-images.js - 楽天の候補画像から「バナーの無いきれいな画像」をAIで選ぶ
 *
 * 【なぜ必要か】
 * 楽天の市場API(IchibaItem)が返すのは店舗が作った出品画像で、
 * 「送料無料」「500円OFFクーポン」「20個」といった販促バナーが焼き込まれていることが多い。
 * 商品情報ページに出すと内容を誤認させるうえ、AdSense広告の隣に並ぶと広告に見える。
 *
 * カタログ側（商品価格ナビ）の画像はバナーが無いが、カバレッジが実測6/85しかなかった。
 * 一方で市場APIはJANごとに複数店舗がヒットし、候補画像が平均5枚ある。
 * その中にはバナー無しのものが混じっているので、見て選べば採用率を上げられる。
 *
 * 【やり方】
 * JANで検索して候補画像を集め、1リクエストにまとめてモデルに渡し、
 * 「販促文字・バナーが焼き込まれていないもの」を選ばせる。
 * 選べたものだけ cleanImage に保存する。選べなければ画像なしのまま。
 *
 * 実行例:
 *   LIMIT=10 node scripts/pick-shokugan-images.js        … 10件だけ試す
 *   DRY_RUN=1 LIMIT=3 node scripts/pick-shokugan-images.js
 */
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data", "shokugan.json");

const LIMIT = Number(process.env.LIMIT || 10);
const DRY_RUN = !!process.env.DRY_RUN;
// 1商品あたりモデルに見せる枚数の上限。増やすほど採用率は上がるがコストも増える。
const MAX_CANDIDATES = 6;

// 月あたりの判定コストの上限（USD）。超えそうならその月は判定を止める。
// 実測は1件$0.0049で、新商品は月40〜45件なので通常は月$0.20程度に収まる。
// 収集元の仕様変更などで対象が急増したときに、黙って課金が膨らむのを防ぐ。
const MONTHLY_BUDGET = Number(process.env.MONTHLY_BUDGET || 1);
const SPEND_PATH = path.join(__dirname, "..", "data", "shokugan-image-spend.json");

/** その月に使った額を読む。月が変わったらゼロから数え直す。 */
function loadSpend() {
  const month = new Date().toISOString().slice(0, 7);
  try {
    const s = JSON.parse(fs.readFileSync(SPEND_PATH, "utf8"));
    if (s.month === month) return s;
  } catch {}
  return { month, usd: 0, judged: 0 };
}

function saveSpend(spend) {
  fs.writeFileSync(SPEND_PATH, JSON.stringify(spend, null, 2) + "\n", "utf-8");
}

const client = new Anthropic();

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

function candidateImages(jan) {
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
                .map((u) => u.replace(/_ex=\d+x\d+/, "_ex=400x400"));
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

async function pickClean(item, urls) {
  const content = [
    {
      type: "text",
      text:
        `食玩「${item.name}」の商品画像の候補です。\n` +
        `通販サイトの出品画像なので、店舗が付けた販促の文字やバナーが焼き込まれているものが混じります。\n\n` +
        `商品情報ページに載せるのにふさわしい画像を1枚選んでください。\n\n` +
        `## ふさわしくないもの（除外する）\n` +
        `- 「送料無料」「ポイント◯倍」「◯円OFF」「クーポン」などの販促文字が画像内にある\n` +
        `- 「20個」「1BOX」など数量を示すバッジが貼られている\n` +
        `- 店舗のロゴや帯、枠飾りが合成されている\n` +
        `- 複数商品のコラージュ、比較表、説明文が大きく入っているもの\n\n` +
        `## ふさわしいもの\n` +
        `- 商品パッケージそのものを写した写真\n` +
        `- 背景が白または無地で、合成された文字が無いもの\n` +
        `（商品パッケージ自体に印刷されている商品名やキャラクターの絵は問題ありません。\n` +
        `　あくまで「店舗が後から合成した要素」を見てください）\n\n` +
        `画像は0から${urls.length - 1}の番号で渡します。\n` +
        `ふさわしいものが1枚でもあれば、その番号だけを半角数字で出力してください。\n` +
        `どれもふさわしくなければ none とだけ出力してください。\n` +
        `番号か none 以外は何も書かないでください。`,
    },
  ];
  for (const url of urls) {
    content.push({ type: "image", source: { type: "url", url } });
  }

  const res = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 16,
    messages: [{ role: "user", content }],
  });

  const text = res.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();

  const idx = /^\d+$/.test(text) ? Number(text) : -1;
  return {
    url: idx >= 0 && idx < urls.length ? urls[idx] : null,
    raw: text,
    usage: res.usage,
  };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY がありません");
    process.exit(1);
  }

  const spend = loadSpend();
  if (spend.usd >= MONTHLY_BUDGET) {
    // 上限に当たったらこのランでは何もしない。呼び出し側（ワークフロー）が
    // この終了コードを見てDiscordに通知する。
    console.error(
      `⛔ 今月(${spend.month})の画像判定コストが $${spend.usd.toFixed(3)} に達しており、` +
        `上限 $${MONTHLY_BUDGET} を超えています。今月はこれ以上判定しません。`
    );
    process.exit(78);
  }

  const items = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  // 判定済み（cleanImage がある）と、カタログ画像がある商品は対象外。
  // 一度判定したものを再判定しないので、毎ラン同じコストはかからない。
  //
  // 「判定したが採用できなかった」ものは記録していないため、候補が全部バナー入りだった
  // 商品は翌日も判定し直される。実測で8件中1件なので許容する
  //（記録を足すほうが複雑になり、採用できる画像が後から出品される可能性もある）。
  const targets = items
    .filter((i) => i.jan && !i.catalogImage && !i.cleanImage)
    .slice(0, LIMIT);

  console.log(`🍬 画像の選定: 対象 ${targets.length}件`);
  console.log(`   今月の判定コスト: $${spend.usd.toFixed(3)} / 上限 $${MONTHLY_BUDGET}`);

  let picked = 0;
  let none = 0;
  let noCandidates = 0;
  let inTok = 0;
  let outTok = 0;

  for (const item of targets) {
    const urls = await candidateImages(item.jan);
    await new Promise((r) => setTimeout(r, 1200));
    if (urls.length === 0) {
      noCandidates++;
      console.log(`   候補なし: ${item.name.slice(0, 32)}`);
      continue;
    }

    // ラン中にも上限を見る。1ランで大量に処理するときに超過してから気づくのを防ぐ。
    const spentSoFar = spend.usd + (inTok / 1e6) * 3 + (outTok / 1e6) * 15;
    if (spentSoFar >= MONTHLY_BUDGET) {
      console.error(`⛔ 上限 $${MONTHLY_BUDGET} に達したのでここで打ち切ります`);
      break;
    }

    try {
      const r = await pickClean(item, urls);
      inTok += r.usage.input_tokens;
      outTok += r.usage.output_tokens;
      if (r.url) {
        if (!DRY_RUN) item.cleanImage = r.url;
        picked++;
        console.log(`   ✅ ${item.name.slice(0, 30)} … 候補${urls.length}枚中 #${r.raw}`);
      } else {
        none++;
        console.log(`   ─ ${item.name.slice(0, 30)} … 候補${urls.length}枚すべて不採用`);
      }
    } catch (e) {
      console.error(`   ⚠️ ${item.name.slice(0, 30)}: ${e.message}`);
    }
  }

  if (!DRY_RUN) fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");

  const judged = picked + none;
  const cost = (inTok / 1e6) * 3 + (outTok / 1e6) * 15;

  if (!DRY_RUN) {
    spend.usd += cost;
    spend.judged += judged;
    saveSpend(spend);
    console.log(`   今月の累計: $${spend.usd.toFixed(3)} / 上限 $${MONTHLY_BUDGET}（${spend.judged}件判定）`);
  }
  console.log(`\n✅ 採用 ${picked}件 / 不採用 ${none}件 / 候補なし ${noCandidates}件`);
  if (judged > 0) {
    console.log(`   採用率: ${Math.round((picked / judged) * 100)}%（判定できた${judged}件中）`);
  }
  console.log(`   トークン: 入力${inTok.toLocaleString()} / 出力${outTok.toLocaleString()}`);
  console.log(`   コスト: $${cost.toFixed(4)}（1件あたり $${judged ? (cost / judged).toFixed(4) : "-"}）`);
  if (DRY_RUN) console.log("   ※ DRY_RUN のため保存していません");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
