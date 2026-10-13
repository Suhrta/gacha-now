/**
 * pick-gacha-images.js - タカラトミーアーツ商品の一覧用画像を楽天から選ぶ
 *
 * 【なぜ】
 * タカラトミーアーツのサイトポリシーに
 *   「本サイトに掲載のキャラクターやイラストの画像、文章、データなどすべての情報について、
 *     無断で転用、転載することはご遠慮ください」
 *   「企業等が非営利目的で使用する場合、個人的な使用を目的とする場合…を除き、
 *     許諾なく使用することは出来ません」
 * とある。当サイトは広告・アフィリエイト収益があり非営利に当たらないため、
 * 自サーバー（R2）に縮小コピーを置く構成をやめる。
 *
 * 直リンクにもしない。タカラトミーアーツのCDNは解像度バリアントが無く、
 * 実測で平均714KB。一覧（40〜90枚）に出すと数十MBになる。
 * （バンダイは /model/m/ が8.9KBなので直リンクにできた。事情が違う）
 *
 * 代わりに楽天の商品画像を直リンクで表示する。アフィリエイトリンクと併せて
 * 出すのでAPIの利用目的と整合する。見つからない商品は画像なしにする。
 *
 * 【JANが無いことへの対処】
 * 食玩やバンダイと違い、タカラトミーアーツ商品にはJANが無く、商品名で引くしかない。
 * 別商品の画像を出すのは画像なしより悪いので、AI判定に
 * 「販促バナーが無いか」だけでなく「商品名と一致する商品の画像か」の確認も含める。
 *
 * 【再判定のコストを抑える仕組み】
 * 判定した候補セットを記録し、新しい候補が増えた時だけAIを呼ぶ。
 * 判定の要否・間隔・打ち切りの規則は scripts/image-pick-state.js に集約している。
 *
 * 実行例:
 *   DRY_RUN=1 LIMIT=5 node scripts/pick-gacha-images.js
 *   LIMIT=200 node scripts/pick-gacha-images.js
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { searchItems, hasCredentials, sleep } from "./rakuten-api.js";
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
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");
const SPEND_PATH = path.join(__dirname, "..", "data", "gacha-image-spend.json");

const LIMIT = Number(process.env.LIMIT || 20);
const DRY_RUN = !!process.env.DRY_RUN;
const MAX_CANDIDATES = 6;
// その月の累計の上限。到達したらその月は判定しない（exit 78 でCIが通知する）。
const MONTHLY_BUDGET = Number(process.env.MONTHLY_BUDGET || 0.3);
// 1ランの上限。累計とは別に要る。
// 月初に累計がゼロの状態で収集元の仕様変更などで対象が急増すると、
// 累計上限だけでは1回のランで月ぶん全部を使い切ってしまう。
const MAX_SPEND = Number(process.env.MAX_SPEND || 0.1);

// 対象の仕入れ元。ここに無い仕入れ元は触らない。
// キタンクラブ・ブシロードは明示的な禁止が無く、今回は現状維持と判断した。
const TARGET_HOST = "takaratomy-arts.co.jp";

const client = new Anthropic();

function loadSpend() {
  const month = new Date().toISOString().slice(0, 7);
  try {
    const s = JSON.parse(fs.readFileSync(SPEND_PATH, "utf8"));
    if (s.month === month) return s;
  } catch {}
  return { month, usd: 0, judged: 0 };
}

function saveSpend(s) {
  fs.writeFileSync(SPEND_PATH, JSON.stringify(s, null, 2) + "\n", "utf-8");
}

/** 検索に使うキーワード。商品名そのままだと長すぎて0件になりやすい。 */
function searchKeyword(product) {
  const name = String(product.name || "")
    .replace(/【[^】]*】/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name;
}

async function candidates(product) {
  const r = await searchItems(searchKeyword(product), { hits: MAX_CANDIDATES });
  if (r.error || !r.items?.length) return [];
  return r.items
    .map((i) => ({
      url: String(i.image || "").replace(/_ex=\d+x\d+/, "_ex=400x400"),
      name: i.name,
    }))
    .filter((x) => x.url && !isPlaceholderImage(x.url));
}

async function pick(product, cands) {
  const content = [
    {
      type: "text",
      text:
        `カプセルトイ（ガチャガチャ）の商品一覧に載せる画像を選びます。\n\n` +
        `## 掲載する商品\n` +
        `商品名: ${product.name}\n` +
        (product.brand ? `作品/ブランド: ${product.brand}\n` : "") +
        (product.types ? `全${product.types}種\n` : "") +
        `メーカー: タカラトミーアーツ\n\n` +
        `## 候補\n` +
        cands.map((c, i) => `${i}: ${c.name}`).join("\n") +
        `\n\n候補の画像を順番に渡します。\n\n` +
        `## 2つの条件を**両方**満たすものを選んでください\n\n` +
        `### 条件1: 同じ商品であること\n` +
        `通販サイトの検索結果なので、名前が似ているだけの別商品が混じります。\n` +
        `- シリーズ名が同じでも**第2弾・続編・別バージョン**なら違う商品です\n` +
        `- 同じ作品の**別シリーズ**（別の商品名）も違います\n` +
        `- 確信が持てないときは選ばないでください。\n` +
        `  別商品の画像を出すのは、画像を出さないことより悪い結果になります\n\n` +
        `### 条件2: 販促の文字が焼き込まれていないこと\n` +
        `- 「送料無料」「ポイント◯倍」「◯円OFF」「クーポン」などの文字\n` +
        `- 「全◯種セット」「1BOX」など店舗が付けた数量バッジ\n` +
        `- 店舗のロゴ、帯、枠飾りの合成\n` +
        `- 複数商品のコラージュ、比較表\n` +
        `（商品パッケージ自体に印刷されている文字や絵は問題ありません。\n` +
        `　店舗が後から合成した要素だけを見てください）\n\n` +
        `両方を満たすものがあればその番号を、無ければ "none" を choice に入れて返してください。`,
    },
  ];
  for (const c of cands) content.push({ type: "image", source: { type: "url", url: c.url } });

  const res = await client.messages.create({
    ...requestOptions(cands.length),
    messages: [{ role: "user", content }],
  });

  const { idx, raw } = parseChoice(res, cands.length);
  return {
    url: idx >= 0 ? cands[idx].url : null,
    matchedName: idx >= 0 ? cands[idx].name : null,
    raw,
    usage: res.usage,
  };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY がありません");
    process.exit(1);
  }
  if (!hasCredentials()) {
    console.error("❌ 楽天APIの認証情報がありません");
    process.exit(1);
  }

  const spend = loadSpend();
  if (spend.usd >= MONTHLY_BUDGET) {
    console.error(
      `⛔ 今月(${spend.month})の判定コストが $${spend.usd.toFixed(3)} で上限 $${MONTHLY_BUDGET} に達しています。`
    );
    process.exit(78);
  }

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf8"));

  // 採用済みは触らない。見送りが続いた商品は打ち切る。
  // 残りのうち、前回の確認から RECHECK_DAYS 経ったものだけを今回見る。
  const pool = products.filter(
    (p) =>
      String(p.img || "").includes(TARGET_HOST) &&
      !p.rakutenThumb &&
      (p.rakutenThumbMisses || 0) < MAX_MISSES
  );
  // 確認が古い順。配列順のままだと先頭の商品だけを毎回見てしまい、
  // 後ろに積まれた新商品にいつまでも画像が付かない。
  const targets = sortByStaleness(pool, "rakutenThumbCheckedAt")
    .filter((p) => needsRecheck(p.rakutenThumbCheckedAt))
    .slice(0, LIMIT);

  const excluded = products.filter(
    (p) =>
      String(p.img || "").includes(TARGET_HOST) &&
      !p.rakutenThumb &&
      (p.rakutenThumbMisses || 0) >= MAX_MISSES
  ).length;

  console.log(`🖼  タカラトミーアーツ商品の画像選定: 対象 ${targets.length}件`);
  console.log(`   未採用 ${pool.length}件 / 見送り${MAX_MISSES}回で除外 ${excluded}件`);
  console.log(
    `   今月の累計 $${spend.usd.toFixed(3)} / 上限 $${MONTHLY_BUDGET}（1ラン上限 $${MAX_SPEND}）`
  );

  let picked = 0;
  let none = 0;
  let noCand = 0;
  let unchanged = 0;
  let inTok = 0;
  let outTok = 0;

  // 判定1件ごとに書く。以前は最後にまとめて書いていたため、途中で停止すると
  // 消費したコストだけが残り、再実行で同じ商品に二重に課金していた。
  const flush = () => {
    if (DRY_RUN) return;
    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf-8");
    saveSpend({ ...spend, usd: spend.usd + costOf(inTok, outTok), judged: spend.judged + picked + none });
  };

  for (const p of targets) {
    const cands = await candidates(p);
    await sleep();
    const freshKeys = candKeys(cands.map((c) => c.url));

    if (cands.length === 0) {
      noCand++;
      if (!DRY_RUN) {
        p.rakutenThumbChecked = true;
        p.rakutenThumbCheckedAt = todayStamp();
        p.rakutenThumbCands = [];
      }
      console.log(`   候補なし: ${p.name.slice(0, 32)}`);
      flush();
      continue;
    }

    // 前回見た候補セットから増えていないなら、同じ答えになるのでAIを呼ばない。
    if (!hasNewCandidate(freshKeys, p.rakutenThumbCands)) {
      unchanged++;
      if (!DRY_RUN) p.rakutenThumbCheckedAt = todayStamp();
      flush();
      continue;
    }

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
      const r = await pick(p, cands);
      inTok += r.usage.input_tokens;
      outTok += r.usage.output_tokens;
      if (!DRY_RUN) {
        p.rakutenThumbChecked = true;
        p.rakutenThumbCheckedAt = todayStamp();
        p.rakutenThumbCands = freshKeys;
      }
      if (r.url) {
        if (!DRY_RUN) {
          p.rakutenThumb = r.url;
          delete p.rakutenThumbMisses;
        }
        picked++;
        console.log(`   ✅ ${p.name.slice(0, 28)}`);
        console.log(`      → ${String(r.matchedName).slice(0, 52)}`);
      } else {
        none++;
        if (!DRY_RUN) p.rakutenThumbMisses = (p.rakutenThumbMisses || 0) + 1;
        const n = (p.rakutenThumbMisses || 0);
        console.log(
          `   ─ ${p.name.slice(0, 28)} … 候補${cands.length}件すべて不採用（${n}/${MAX_MISSES}回目）`
        );
      }
      flush();
    } catch (e) {
      console.error(`   ⚠️ ${p.name.slice(0, 28)}: ${e.message}`);
    }
  }

  const judged = picked + none;
  const cost = costOf(inTok, outTok);

  console.log(`\n✅ 採用 ${picked}件 / 不採用 ${none}件 / 候補なし ${noCand}件 / 候補に変化なし ${unchanged}件`);
  if (judged > 0) console.log(`   採用率: ${Math.round((picked / judged) * 100)}%`);
  console.log(`   コスト: $${cost.toFixed(4)}（1件 $${judged ? (cost / judged).toFixed(4) : "-"}）`);
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
