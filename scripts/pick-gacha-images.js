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
 * 実行例:
 *   DRY_RUN=1 LIMIT=5 node scripts/pick-gacha-images.js
 *   LIMIT=200 node scripts/pick-gacha-images.js
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { searchItems, hasCredentials, sleep } from "./rakuten-api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");
const SPEND_PATH = path.join(__dirname, "..", "data", "gacha-image-spend.json");

const LIMIT = Number(process.env.LIMIT || 20);
const DRY_RUN = !!process.env.DRY_RUN;
const MAX_CANDIDATES = 6;
const MONTHLY_BUDGET = Number(process.env.MONTHLY_BUDGET || 1);

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
    .filter((x) => x.url);
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
        `両方を満たすものがあればその番号だけを半角数字で、\n` +
        `無ければ none とだけ出力してください。それ以外は何も書かないでください。`,
    },
  ];
  for (const c of cands) content.push({ type: "image", source: { type: "url", url: c.url } });

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
    url: idx >= 0 && idx < cands.length ? cands[idx].url : null,
    matchedName: idx >= 0 && idx < cands.length ? cands[idx].name : null,
    raw: text,
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
  const targets = products
    .filter(
      (p) =>
        String(p.img || "").includes(TARGET_HOST) &&
        !p.rakutenThumb &&
        !p.rakutenThumbChecked
    )
    .slice(0, LIMIT);

  console.log(`🖼  タカラトミーアーツ商品の画像選定: 対象 ${targets.length}件`);
  console.log(`   今月の判定コスト: $${spend.usd.toFixed(3)} / 上限 $${MONTHLY_BUDGET}`);

  let picked = 0;
  let none = 0;
  let noCand = 0;
  let inTok = 0;
  let outTok = 0;

  for (const p of targets) {
    const cands = await candidates(p);
    await sleep();
    if (cands.length === 0) {
      noCand++;
      if (!DRY_RUN) p.rakutenThumbChecked = true;
      console.log(`   候補なし: ${p.name.slice(0, 32)}`);
      continue;
    }

    const spentSoFar = spend.usd + (inTok / 1e6) * 3 + (outTok / 1e6) * 15;
    if (spentSoFar >= MONTHLY_BUDGET) {
      console.error(`⛔ 上限 $${MONTHLY_BUDGET} に達したので打ち切ります`);
      break;
    }

    try {
      const r = await pick(p, cands);
      inTok += r.usage.input_tokens;
      outTok += r.usage.output_tokens;
      if (!DRY_RUN) p.rakutenThumbChecked = true;
      if (r.url) {
        if (!DRY_RUN) p.rakutenThumb = r.url;
        picked++;
        console.log(`   ✅ ${p.name.slice(0, 28)}`);
        console.log(`      → ${String(r.matchedName).slice(0, 52)}`);
      } else {
        none++;
        console.log(`   ─ ${p.name.slice(0, 28)} … 候補${cands.length}件すべて不採用`);
      }
    } catch (e) {
      console.error(`   ⚠️ ${p.name.slice(0, 28)}: ${e.message}`);
    }
  }

  const judged = picked + none;
  const cost = (inTok / 1e6) * 3 + (outTok / 1e6) * 15;

  if (!DRY_RUN) {
    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf-8");
    spend.usd += cost;
    spend.judged += judged;
    saveSpend(spend);
  }

  console.log(`\n✅ 採用 ${picked}件 / 不採用 ${none}件 / 候補なし ${noCand}件`);
  if (judged > 0) console.log(`   採用率: ${Math.round((picked / judged) * 100)}%`);
  console.log(`   コスト: $${cost.toFixed(4)}（1件 $${judged ? (cost / judged).toFixed(4) : "-"}）`);
  if (DRY_RUN) console.log("   ※ DRY_RUN のため保存していません");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
