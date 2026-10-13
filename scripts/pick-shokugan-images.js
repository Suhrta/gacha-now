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
import {
  MAX_MISSES,
  candKeys,
  costOf,
  hasNewCandidate,
  isPlaceholderImage,
  needsRecheck,
  parseChoice,
  requestOptions,
  sortByStaleness,
  todayStamp,
} from "./image-pick-state.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data", "shokugan.json");

const LIMIT = Number(process.env.LIMIT || 10);
const DRY_RUN = !!process.env.DRY_RUN;
// 1商品あたりモデルに見せる枚数の上限。増やすほど採用率は上がるがコストも増える。
const MAX_CANDIDATES = 6;

// 月あたりの判定コストの上限（USD）。超えそうならその月は判定を止める。
// 実測は1件$0.0035で、新商品は月40〜45件。候補が増えた時だけ再判定する作りなので
// 通常は月$0.15程度に収まる。収集元の仕様変更などで対象が急増したときに、
// 黙って課金が膨らむのを防ぐ。
const MONTHLY_BUDGET = Number(process.env.MONTHLY_BUDGET || 0.3);
// 1ランの上限。累計とは別に要る。
// 月初に累計がゼロの状態で収集元の仕様変更などで対象が急増すると、
// 累計上限だけでは1回のランで月ぶん全部を使い切ってしまう。
const MAX_SPEND = Number(process.env.MAX_SPEND || 0.1);
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

// クライアントは .env を読んだ**後**に作る。
// SDKは生成時にAPIキーを解決するので、順番が逆だとローカル実行で必ず
// 「Could not resolve authentication method」になる。
// CIでは ANTHROPIC_API_KEY が本物の環境変数として渡るため、この取り違えに気づけない。
const client = new Anthropic();

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
        `ふさわしいものが1枚でもあればその番号を、\n` +
        `どれもふさわしくなければ "none" を choice に入れて返してください。`,
    },
  ];
  for (const url of urls) {
    content.push({ type: "image", source: { type: "url", url } });
  }

  const res = await client.messages.create({
    ...requestOptions(urls.length),
    messages: [{ role: "user", content }],
  });

  const { idx, raw } = parseChoice(res, urls.length);
  return {
    url: idx >= 0 ? urls[idx] : null,
    idx,
    raw,
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

  // 採用済み（cleanImage がある）と、カタログ画像がある商品は対象外。
  // さらに、見送りが MAX_MISSES 回続いた商品は打ち切る。
  //
  // 【ここが以前の壊れ方】
  // 以前は「cleanImage が無い」だけを条件に配列順で先頭20件を取っていた。
  // 判定して見送った結果を記録していなかったため、
  //   - 候補が全部バナー入りだった22件 → 毎日AIを呼び直す（月$2超で14日目に上限）
  //   - 楽天に候補がゼロの25件        → 毎日楽天APIを叩く
  // の計47件が永久に消えず、LIMIT=20 の枠を毎日占め続けた。
  // 結果として**後から入る新商品は順番が回ってこない**。
  // いまは候補セットを記録し、増えた時だけ判定する（scripts/image-pick-state.js）。
  const pool = items.filter(
    (i) => i.jan && !i.catalogImage && !i.cleanImage && (i.cleanImageMisses || 0) < MAX_MISSES
  );
  // 確認が古い順。これをしないと上と同じ詰まりが再発する。
  const targets = sortByStaleness(pool, "cleanImageCheckedAt")
    .filter((i) => needsRecheck(i.cleanImageCheckedAt))
    .slice(0, LIMIT);

  const excluded = items.filter(
    (i) => i.jan && !i.catalogImage && !i.cleanImage && (i.cleanImageMisses || 0) >= MAX_MISSES
  ).length;

  console.log(`🍬 画像の選定: 対象 ${targets.length}件`);
  console.log(`   未採用 ${pool.length}件 / 見送り${MAX_MISSES}回で除外 ${excluded}件`);
  console.log(
    `   今月の累計 $${spend.usd.toFixed(3)} / 上限 $${MONTHLY_BUDGET}（1ラン上限 $${MAX_SPEND}）`
  );

  let picked = 0;
  let none = 0;
  let noCandidates = 0;
  let unchanged = 0;
  let inTok = 0;
  let outTok = 0;

  // 判定1件ごとに書く。以前は最後にまとめて書いていたため、途中で停止すると
  // 消費したコストだけが残り、再実行で同じ商品に二重に課金していた。
  const flush = () => {
    if (DRY_RUN) return;
    fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
    saveSpend({
      ...spend,
      usd: spend.usd + costOf(inTok, outTok),
      judged: spend.judged + picked + none,
    });
  };

  for (const item of targets) {
    const urls = await candidateImages(item.jan);
    await new Promise((r) => setTimeout(r, 1200));
    const freshKeys = candKeys(urls);

    if (urls.length === 0) {
      noCandidates++;
      if (!DRY_RUN) {
        item.cleanImageCheckedAt = todayStamp();
        item.cleanImageCands = [];
      }
      console.log(`   候補なし: ${item.name.slice(0, 32)}`);
      flush();
      continue;
    }

    // 前回見た候補セットから増えていないなら、同じ答えになるのでAIを呼ばない。
    if (!hasNewCandidate(freshKeys, item.cleanImageCands)) {
      unchanged++;
      if (!DRY_RUN) item.cleanImageCheckedAt = todayStamp();
      flush();
      continue;
    }

    // ラン中にも上限を見る。1ランで大量に処理するときに超過してから気づくのを防ぐ。
    const runCost = costOf(inTok, outTok);
    if (runCost >= MAX_SPEND) {
      console.error(`⛔ 1ラン上限 $${MAX_SPEND} に達したので打ち切ります（残りは次回）`);
      break;
    }
    if (spend.usd + runCost >= MONTHLY_BUDGET) {
      console.error(`⛔ 今月の累計上限 $${MONTHLY_BUDGET} に達したので打ち切ります`);
      break;
    }

    try {
      const r = await pickClean(item, urls);
      inTok += r.usage.input_tokens;
      outTok += r.usage.output_tokens;
      if (!DRY_RUN) {
        item.cleanImageCheckedAt = todayStamp();
        item.cleanImageCands = freshKeys;
      }
      if (r.url) {
        if (!DRY_RUN) {
          item.cleanImage = r.url;
          delete item.cleanImageMisses;
        }
        picked++;
        console.log(`   ✅ ${item.name.slice(0, 30)} … 候補${urls.length}枚中 #${r.idx}`);
      } else {
        none++;
        if (!DRY_RUN) item.cleanImageMisses = (item.cleanImageMisses || 0) + 1;
        console.log(
          `   ─ ${item.name.slice(0, 30)} … 候補${urls.length}枚すべて不採用` +
            `（${item.cleanImageMisses || 0}/${MAX_MISSES}回目）`
        );
      }
      flush();
    } catch (e) {
      console.error(`   ⚠️ ${item.name.slice(0, 30)}: ${e.message}`);
    }
  }

  const judged = picked + none;
  const cost = costOf(inTok, outTok);

  console.log(
    `\n✅ 採用 ${picked}件 / 不採用 ${none}件 / 候補なし ${noCandidates}件 / 候補に変化なし ${unchanged}件`
  );
  if (judged > 0) {
    console.log(`   採用率: ${Math.round((picked / judged) * 100)}%（判定できた${judged}件中）`);
  }
  console.log(`   トークン: 入力${inTok.toLocaleString()} / 出力${outTok.toLocaleString()}`);
  console.log(`   コスト: $${cost.toFixed(4)}（1件あたり $${judged ? (cost / judged).toFixed(4) : "-"}）`);
  if (!DRY_RUN) {
    console.log(`   今月の累計: $${(spend.usd + cost).toFixed(3)} / 上限 $${MONTHLY_BUDGET}`);
  } else {
    console.log("   ※ DRY_RUN のため保存していません");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
