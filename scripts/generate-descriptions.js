/**
 * generate-descriptions.js
 * products.json の商品にClaude APIで説明文を生成する。
 *
 * 【なぜ作り直したか（2026-08-06）】
 * 旧版は「1〜2文（40〜80文字程度）のキャッチーな紹介文」を生成する仕様だった。
 * その結果、インデックス対象680ページの内訳は
 *   説明文0文字: 368ページ / 100文字以上: 0ページ（平均29文字）
 * となり、商品ページの実体が「画像＋商品名＋価格＋楽天ボタン」しかない状態だった。
 *
 * GSC実測（2026-08-06・直近28日）はこれが順位に直結していることを示している:
 *   上位1000クエリのうち3位以内はわずか14件。683件が4〜10位、274件が11〜20位。
 *   そして自サイトのCTRは 3.9位=12.9% / 4.6位=7.5% に対し 8〜10位=1〜5%。
 * つまり伸びしろは「掲載を増やす」ではなく「今4〜10位にいるページを上げる」で、
 * そのためにはページ本体に読む価値のある情報が要る。
 *
 * 【捏造させない】
 * products.json が持っているのは 商品名 / ブランド / 価格 / 種類数 / 発売時期 / メーカー だけ。
 * サイズ・素材・ラインナップの内訳は持っていないので、プロンプト側で明示的に禁止する。
 * 存在しない仕様を書くとページの信頼性が落ち、AdSense審査にも不利になる。
 *
 * 実行:
 *   node scripts/generate-descriptions.js            # 対象すべて
 *   LIMIT=10 node scripts/generate-descriptions.js   # 先頭10件だけ（品質確認用）
 *   DRY_RUN=1 LIMIT=3 node scripts/generate-descriptions.js  # 保存せず出力だけ
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { seriesForProduct } from "../data/series.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");

// ローカル実行用にリポジトリ直下の .env を読む（.gitignore 済み）。
// GitHub Actions では secrets が環境変数として入るので .env は存在せず、ここは黙って抜ける。
try {
  process.loadEnvFile(path.join(__dirname, "..", ".env"));
} catch {
  /* .env が無い環境（CI）では何もしない */
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY が未設定です。");
  console.error("   リポジトリ直下の .env に次の行を追加してください:");
  console.error("   ANTHROPIC_API_KEY=sk-ant-...");
  process.exit(1);
}

// lib/quality.js の GENERIC_BRANDS と対応。noindex のページは検索に出ないので
// 説明文を生成してもSEO上の効果がなく、APIコストだけがかかる。
const GENERIC_BRANDS = new Set(["その他", "New", "キャラクター"]);

// 既存の説明文がこの文字数未満なら作り直す。
// 旧版は40〜80文字仕様だったため、既存分もすべてこの閾値を下回る。
const MIN_LENGTH = 120;

const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;
const DRY_RUN = !!process.env.DRY_RUN;
const CONCURRENCY = 4;

const client = new Anthropic();

function makerOf(product) {
  return (product.source || "").replace(/公式$/, "").trim();
}

function buildPrompt(product) {
  const facts = [
    `商品名: ${product.name}`,
    `シリーズ／IP: ${product.brand}`,
    `価格: 1回${product.price}円`,
    product.types ? `種類数: 全${product.types}種` : null,
    product.releaseWeek ? `発売時期: ${product.releaseWeek}` : null,
    makerOf(product) ? `メーカー: ${makerOf(product)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // この商品が属する横断シリーズ（めじるしアクセサリー等）の解説を材料として渡す。
  // 商品単体の確定情報は数行しかなく、それだけで150文字以上書かせると
  // 推測（＝捏造）か定型文の水増しが必ず発生する。シリーズ解説は data/series.js に
  // 人手で書いた検証済みの事実なので、捏造せずに内容を増やせる唯一の材料になる。
  const series = seriesForProduct(product);
  const seriesBlock = series.length
    ? `\n## この商品が属するシリーズ（当サイトで検証済みの解説）\n` +
      series.map((s) => `### ${s.name}\n${s.intro}`).join("\n") +
      `\nこのシリーズ解説の内容は事実として引用してよい。ただし丸写しはせず、` +
      `この商品の説明として必要な部分だけを使うこと。`
    : "";

  return `カプセルトイ（ガチャガチャ）情報サイト「ガチャなう」の商品ページに載せる説明文を書いてください。

## 確定している情報
${facts}
${seriesBlock}

## 書き方
- 150〜250文字。改行なしの続き文。
- 「です・ます」体。サイト全体がこの文体で統一されています。
- 「${product.brand}」と「ガチャガチャ」または「カプセルトイ」を自然に含める。
- 何のシリーズか → 何種類あっていくらか → いつ出るか、を基本の並びとしつつ、
  毎回まったく同じ順序・同じ言い回しにはしないこと。この説明文は同じ形式で
  何百件も生成されるため、定型文の連続になると検索エンジンから
  「量産された無価値なページ」とみなされます。文の組み立てを商品ごとに変えること。
- 「${product.brand}」が広く知られた作品・ブランドである場合、それが何であるかの
  一般的な説明（どんなジャンルの作品か、といった程度）は書いてよい。
  ただしこの商品固有の内容に踏み込まないこと。

## 絶対に書いてはいけないこと
あなたに与えられた情報は上の数行だけです。次はすべて与えられていないので、
知っているつもりでも、もっともらしく思えても、書いてはいけません。

- **作品・キャラクターの設定**（舞台、所属、肩書き、公式/公認といった位置づけ、世界観の説明）
- **造形やポーズの描写**（どんな表情か、何をしている姿か、どんな仕掛けがあるか）
- **サイズ・素材・重さ・付属品**
- **ラインナップの内訳**（どのキャラクターが何番目に入っているか）
- **用途の断定**（「バッグに付けられる」「飾って楽しめる」など。商品名から確実に
  読み取れる場合を除く）
- **商品名に含まれる略語・記号・数字の意味の推測**
  例:「01 S」の「S」が何の略かは分かりません。展開しないでください。
  例:「キーボードチャーム」はキーボードがモチーフかもしれません。
  キーホルダーだと決めつけないでください。商品名は言い換えず、そのまま扱ってください。
- **「全◯種」「◯円」以外の数字**

## 締め方と禁止フレーズ
最後の一文まで事実で終えてください。次のような結びは使用禁止です:
「ぜひチェック」「見逃せない」「手に取ってみてください」「注目です」「おすすめです」
「必見」「お楽しみに」「狙ってみては」——読者への呼びかけ・感想・煽りで終わらないこと。
絵文字と感嘆符も使わないこと。

また、次の言い回しは中身が無いうえに何百件も繰り返されると悪目立ちするので使用禁止です:
「ガチャガチャならでは」「カプセルトイならでは」「〜が待たれます」
「コレクションの対象として」「コレクション性が高い」「ワクワク」「何が出るか分からない」
情報を足せないなら、無理に文を継ぎ足さず短く終えてください。

情報が少なくて短くなる場合は、短いままで構いません。
推測で文字数を埋めるくらいなら、150文字を下回っても構いません。

説明文の本文だけを出力してください。前置きは不要です。`;
}

async function generateDescription(product) {
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 800,
    // 定型の説明文生成に思考は不要。コストと待ち時間を抑える。
    thinking: { type: "disabled" },
    output_config: { effort: "low" },
    messages: [{ role: "user", content: buildPrompt(product) }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return { text, usage: message.usage };
}

// 同時実行数を CONCURRENCY に制限して items を処理する。
// 750件を直列で回すと1件2〜3秒でも30分以上かかるため。
async function pool(items, worker) {
  const queue = [...items.entries()];
  const runners = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      const [index, item] = next;
      await worker(item, index);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));

  const targets = products
    .filter((p) => !GENERIC_BRANDS.has(p.brand))
    .filter((p) => (p.description || "").trim().length < MIN_LENGTH)
    .slice(0, LIMIT === Infinity ? undefined : LIMIT);

  console.log(`💬 説明文を生成します`);
  console.log(`   対象: ${targets.length}件（全${products.length}件中）`);
  if (DRY_RUN) console.log(`   ⚠️  DRY_RUN: products.json には保存しません`);
  if (targets.length === 0) return;

  let done = 0;
  let failed = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  await pool(targets, async (product) => {
    try {
      const { text, usage } = await generateDescription(product);
      product.description = text;
      inputTokens += usage.input_tokens;
      outputTokens += usage.output_tokens;
      done++;
      console.log(`\n[${done}/${targets.length}] ${product.name.slice(0, 40)}`);
      console.log(`   ${text}`);
      console.log(`   (${text.length}文字)`);
    } catch (e) {
      failed++;
      console.error(`   ❌ ${product.name.slice(0, 40)}: ${e.message}`);
    }
  });

  if (!DRY_RUN && done > 0) {
    fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf-8");
  }

  // Sonnet 5 の導入価格（$2/$10 per MTok、2026-08-31まで）で概算する。
  const cost = (inputTokens / 1e6) * 2 + (outputTokens / 1e6) * 10;
  console.log(`\n─────────────────────────────`);
  console.log(`✅ 生成: ${done}件 / 失敗: ${failed}件`);
  console.log(`📊 入力 ${inputTokens.toLocaleString()}tok / 出力 ${outputTokens.toLocaleString()}tok`);
  console.log(`💰 概算コスト: $${cost.toFixed(3)}`);
  if (done > 0) {
    const per = cost / done;
    console.log(`   1件あたり $${per.toFixed(4)} → 残り全件の見込み: $${(per * 750).toFixed(2)}`);
  }
  if (!DRY_RUN && done > 0) console.log(`💾 ${PRODUCTS_PATH}`);
}

main().catch((e) => {
  console.error("❌ エラー:", e);
  process.exit(1);
});
