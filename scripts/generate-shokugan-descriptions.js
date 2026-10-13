/**
 * generate-shokugan-descriptions.js - 食玩の紹介文を生成する
 *
 * 【公式説明文の扱い】
 * バンダイの商品詳細ページにある説明文を**生成時のコンテキストとしてのみ**使い、
 * データにもページにも保存しない。理由は2つ:
 *   1. バンダイの「著作権・商標について」が複製・転載を明確に断っている
 *   2. 公式文をそのまま載せると重複コンテンツになり、[[adsense-recovery]] で受けた
 *      「有用性の低いコンテンツ」判定を繰り返すリスクがある
 * 保存するのは生成した独自の紹介文だけ。
 *
 * 【なぜ公式文を材料に渡すのか】
 * 商品単体の確定情報は名前・価格・発売日しかなく、それだけで150文字以上書かせると
 * 推測（＝捏造）が必ず混ざる。ガチャ側では data/series.js の人手で書いたシリーズ解説を
 * 材料にしてこれを回避している（scripts/generate-descriptions.js）。
 * 食玩にはそれが無いので、公式の説明文を「検証済みの事実」として使う。
 *
 * コスト: 実測で1件あたり約$0.0047。85件で約$0.40（2026-10-13にユーザー承認済み）。
 *
 * 実行例:
 *   DRY_RUN=1 LIMIT=3 node scripts/generate-shokugan-descriptions.js
 *   LIMIT=10 node scripts/generate-shokugan-descriptions.js
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { releaseLabel } from "../lib/shokugan.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data", "shokugan.json");

const UA = "Mozilla/5.0 (compatible; gacha-now/1.0; +https://gacha-now.net)";
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;
const DRY_RUN = !!process.env.DRY_RUN;
const MIN_LENGTH = Number(process.env.MIN_LENGTH || 120);

const client = new Anthropic();

/** 公式詳細ページから説明文を取り出す。保存はしない（プロンプトに渡すだけ）。 */
async function fetchOfficialText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const meta = html.match(/name="description"\s+content="([^"]*)"/);
  return meta ? meta[1].replace(/\s+/g, " ").trim() : "";
}

function buildPrompt(item, officialText) {
  const facts = [
    `商品名: ${item.name}`,
    typeof item.price === "number" ? `価格: ${item.price}円` : null,
    item.releaseYm ? `発売時期: ${releaseLabel(item)}` : null,
    `メーカー: バンダイ（キャンディ事業部）`,
    item.releaseKind === "ship"
      ? `販売形態: プレミアムバンダイ等の通販（店頭では購入できない）`
      : `販売形態: 店頭販売`,
  ]
    .filter(Boolean)
    .join("\n");

  const officialBlock = officialText
    ? `\n## メーカー公式サイトの説明（検証済みの事実。**丸写し禁止**）\n${officialText}\n\n` +
      `この内容は事実として使ってよいが、**言い回しをそのまま使ってはいけない**。` +
      `公式の文章を転載すると著作権上の問題になり、重複コンテンツにもなる。` +
      `事実だけを取り出して、自分の言葉で組み立て直すこと。`
    : "";

  return `食玩（お菓子付き玩具）の情報ページに載せる紹介文を書いてください。

## 確定している情報
${facts}
${officialBlock}

## 書き方
- 150〜250文字。改行なしの続き文。
- 「です・ます」体。サイト全体がこの文体で統一されています。
- 「食玩」という語を自然に含める。
- 何の商品か → 何が入っているか → いつ出るか、を基本の並びとしつつ、
  毎回まったく同じ順序・同じ言い回しにはしないこと。同じ形式で何十件も生成されるため、
  定型文の連続になると検索エンジンから「量産された無価値なページ」とみなされます。

## 絶対に書いてはいけないこと
上に与えられた情報だけが根拠です。次は与えられていないので、
知っているつもりでも、もっともらしく思えても、書いてはいけません。

- **ラインナップの内訳**（どのキャラクターが何種類入っているか）。公式説明に明記が
  ある場合のみ、その範囲で書いてよい。
- **お菓子の種類・味・内容量**（公式説明に明記がある場合のみ可）
- **サイズ・素材・付属品**
- **作品やキャラクターの設定**（舞台、肩書き、世界観）
- **商品名に含まれる略語・数字の意味の推測**
  例:「vol.7」が何の7かは分かりません。展開しないでください。
- 価格・発売日以外の数字
- **この商品を「カプセルトイ」「ガチャガチャ」「ガシャポン」と呼ぶこと。**
  これらは専用の販売機で売る別のジャンルの商品です。この商品は食玩（お菓子付き玩具）で、
  お菓子売り場やコンビニの棚に並びます。混同すると事実誤りになります。
  （初回の生成で実際に「カプセルトイとして店頭で販売されます」と誤って書いた例がある）

## 締め方と禁止フレーズ
最後の一文まで事実で終えてください。「ぜひチェックしてみてください」「要チェックです」
「見逃せません」「必見です」のような、中身の無い呼びかけで締めないこと。

紹介文だけを出力してください。前置きも見出しも不要です。`;
}

async function generateOne(item) {
  let officialText = "";
  if (item.officialUrl) {
    try {
      officialText = await fetchOfficialText(item.officialUrl);
    } catch {
      // 取れなくても確定情報だけで書かせる（短くなるが捏造はしない）
    }
  }

  const res = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 800,
    messages: [{ role: "user", content: buildPrompt(item, officialText) }],
  });

  const text = res.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();

  return {
    text,
    usage: res.usage,
    hadOfficial: Boolean(officialText),
  };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY がありません");
    process.exit(1);
  }

  const items = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const targets = items
    .filter((i) => !i.description || i.description.trim().length < MIN_LENGTH)
    .slice(0, LIMIT === Infinity ? undefined : LIMIT);

  console.log(`🍬 紹介文の生成: 対象 ${targets.length}件 / 全${items.length}件`);
  if (targets.length === 0) return;

  let inTok = 0;
  let outTok = 0;
  let ok = 0;
  let failed = 0;
  let withOfficial = 0;

  for (const [i, item] of targets.entries()) {
    try {
      const r = await generateOne(item);
      if (r.text.length < MIN_LENGTH) {
        failed++;
        console.error(`   ⚠️ 短すぎる(${r.text.length}字): ${item.name.slice(0, 30)}`);
      } else {
        if (!DRY_RUN) item.description = r.text;
        ok++;
      }
      if (r.hadOfficial) withOfficial++;
      inTok += r.usage.input_tokens;
      outTok += r.usage.output_tokens;
      if (DRY_RUN) console.log(`\n--- ${item.name}\n${r.text}`);
    } catch (e) {
      failed++;
      console.error(`   ⚠️ ${item.name.slice(0, 30)}: ${e.message}`);
    }
    if ((i + 1) % 10 === 0) console.log(`   …${i + 1}/${targets.length}`);
  }

  if (!DRY_RUN) fs.writeFileSync(DATA_PATH, JSON.stringify(items, null, 2), "utf-8");

  // Sonnet の料金（$3/Mトークン入力・$15/Mトークン出力）で概算する。
  const cost = (inTok / 1e6) * 3 + (outTok / 1e6) * 15;
  console.log(`\n✅ 生成 ${ok}件 / 失敗 ${failed}件 / 公式説明を使えた ${withOfficial}件`);
  console.log(`   トークン: 入力${inTok.toLocaleString()} / 出力${outTok.toLocaleString()}`);
  console.log(`   概算コスト: $${cost.toFixed(3)}${DRY_RUN ? "（DRY_RUN・保存していません）" : ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
