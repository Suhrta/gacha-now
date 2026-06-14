/**
 * generate-descriptions.js
 * products.jsonの中でdescriptionが無い商品にClaude APIで紹介文を生成
 * 既存のdescriptionはスキップ（APIコスト節約）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");

const client = new Anthropic();

async function generateDescription(product) {
  const prompt = `あなたはカプセルトイ（ガチャ）の情報サイト「ガチャなう」のライターです。
以下の商品について、1〜2文（40〜80文字程度）のキャッチーな紹介文を書いてください。
絵文字は使わず、カジュアルで親しみやすい口調で。

商品名: ${product.name}
ブランド: ${product.brand}
価格: ${product.price}円${product.types ? `
種類数: 全${product.types}種` : ""}

紹介文だけを出力してください。`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 150,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0].text.trim();
}

async function main() {
  console.log("💬 AI紹介文を生成中...");

  const products = JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));

  // descriptionが無い商品を抽出
  const needDesc = products.filter((p) => !p.description);
  console.log(`  対象: ${needDesc.length}件 / 全${products.length}件`);

  if (needDesc.length === 0) {
    console.log("✅ 全商品にdescriptionがあります。スキップ。");
    return;
  }

  // 1日あたり最大20件に制限（API コスト管理）
  const batch = needDesc.slice(0, 20);
  console.log(`  今回生成: ${batch.length}件`);

  let count = 0;
  for (const product of batch) {
    try {
      const desc = await generateDescription(product);
      product.description = desc;
      count++;
      console.log(`  ✅ ${product.name}: ${desc}`);
      // レート制限対策
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.error(`  ❌ ${product.name}: ${e.message}`);
    }
  }

  // products.jsonに書き戻す
  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(products, null, 2), "utf-8");
  console.log(`\n✅ ${count}件のAI紹介文を生成しました`);
}

main().catch((e) => { console.error("❌ エラー:", e); process.exit(1); });
