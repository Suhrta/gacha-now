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

  return `カプセルトイ（ガチャガチャ）情報サイト「ガチャなう」の商品ページに載せる紹介文を書いてください。

## 確定している情報
${facts}

## 書き方
- 200〜350文字。改行なしの続き文（段落分けしない）。
- 1文目でこの商品が何かを言い切る。「〜です」で終わる説明的な文体。
- 「${product.brand}」と「ガチャガチャ」または「カプセルトイ」という語を自然に含める。
- 発売時期・種類数・価格のうち、上に書かれているものは文中に織り込む。
- 読者はこのIPのファンで、買うかどうかを判断しようとしている。何が魅力かを具体的に書く。

## 禁止事項（重要）
- 上の「確定している情報」に無い仕様を書かないこと。特に、サイズ・寸法・素材・重さ・
  ラインナップの内訳（どのキャラが入っているか）・付属品は一切与えられていないので、
  推測して書いてはいけません。
- 「全◯種」以外の数字を創作しないこと。
- 絵文字、感嘆符の連打、「必見！」「話題沸騰」のような煽り文句は使わないこと。
- 商品名をそのまま丸写しした文で始めないこと。

紹介文の本文だけを出力してください。前置きや説明は不要です。`;
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
