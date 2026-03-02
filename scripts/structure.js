/**
 * structure.js - Claude APIで記事から商品データを構造化する
 * 
 * 【なぜAIが必要か】
 * プレスリリースは自然言語（日本語の文章）で書かれている。
 * そこから「商品名」「価格」「種類数」「発売日」「ブランド」を
 * 正確に抜き出すのは、正規表現やルールベースでは難しい。
 * （表記がバラバラだから）
 * 
 * Claude APIに「この記事から商品情報をJSON形式で抽出して」と
 * 頼むことで、どんな書き方のプレスリリースでも構造化できる。
 * 
 * 【コスト】
 * Claude Haiku（最安モデル）を使うので、1記事あたり約¥0.3〜1円。
 * 月100記事処理しても月¥30〜100円程度。
 */

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// APIキーは環境変数から取得（セキュリティのためコードに直書きしない）
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * ブランドスラッグを自動生成する
 * （URLに使えるアルファベット文字列に変換）
 */
function toBrandSlug(brand) {
  const map = {
    "ポケモン": "pokemon",
    "サンリオ": "sanrio",
    "ちいかわ": "chiikawa",
    "カービィ": "kirby",
    "ディズニー": "disney",
    "アニメ": "anime",
    "キャラクター": "character",
    "おもしろ": "omoshiro",
    "アニマル": "animal",
    "ゲーム": "game",
    "特撮": "tokusatsu",
  };
  return map[brand] || brand.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * テーマカラーをブランドから自動割り当て
 */
function getBrandColor(brand) {
  const colors = {
    "ポケモン": "#FFD54F",
    "サンリオ": "#F06292",
    "ちいかわ": "#4FC3F7",
    "カービィ": "#F48FB1",
    "ディズニー": "#CE93D8",
    "アニメ": "#E57373",
    "キャラクター": "#81D4FA",
    "おもしろ": "#FFB74D",
    "アニマル": "#A5D6A7",
    "ゲーム": "#90CAF9",
  };
  return colors[brand] || "#9E9E9E";
}

/**
 * 1つの記事からClaude APIを使って商品データを抽出する
 */
async function structureArticle(article) {
  const prompt = `以下のプレスリリース/記事から、カプセルトイ（ガチャガチャ）の新商品情報を抽出してください。
複数商品が含まれる場合は全て抽出してください。

抽出するフィールド：
- name: 商品名（正式名称）
- brand: ブランド/キャラクター名（例：ポケモン、サンリオ、ちいかわ、カービィ、ディズニー、アニメ、キャラクター、おもしろ）
- price: 1回の価格（円、数値のみ）
- types: 種類数（全X種のX、数値のみ）
- releaseWeek: 発売時期（例：「3月 第1週」「3月 中旬」「4月」）
- hot: 注目度が高いかどうか（人気キャラクター、コラボ、話題性がある場合はtrue）

JSON配列で返してください。商品情報が見つからない場合は空配列 [] を返してください。
JSONのみ返してください。説明文は不要です。

---
タイトル: ${article.title}
内容: ${article.summary}
---`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001", // 最安モデル
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].text.trim();
    // JSONを抽出（```json ... ``` で囲まれている場合に対応）
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const products = JSON.parse(jsonStr);

    // IDとスラッグを自動付与
    return products.map((p) => ({
      id: p.name
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 40),
      name: p.name,
      brand: p.brand,
      brandSlug: toBrandSlug(p.brand),
      price: Number(p.price) || 300,
      types: Number(p.types) || 4,
      releaseWeek: p.releaseWeek || "未定",
      color: getBrandColor(p.brand),
      hot: Boolean(p.hot),
      img: `https://placehold.co/300x200/F5F5F5/999?text=${encodeURIComponent(p.name.slice(0, 10))}&font=monospace`,
      affiliateUrl: "#",
      sourceUrl: article.url,
      collectedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.error(`❌ 構造化失敗: ${article.title} - ${err.message}`);
    return [];
  }
}

/**
 * メイン実行
 * collected.jsonを読み込み、各記事を構造化してstructured.jsonに保存
 */
async function main() {
  const collectedPath = path.join(__dirname, "../data/collected.json");

  if (!fs.existsSync(collectedPath)) {
    console.error("❌ data/collected.json が見つかりません。先に npm run collect を実行してください。");
    process.exit(1);
  }

  const articles = JSON.parse(fs.readFileSync(collectedPath, "utf-8"));
  console.log(`📝 ${articles.length}件の記事を構造化します...\n`);

  const allProducts = [];

  for (const article of articles) {
    console.log(`🔍 処理中: ${article.title.slice(0, 50)}...`);
    const products = await structureArticle(article);
    allProducts.push(...products);
    console.log(`   → ${products.length}件の商品を抽出`);

    // API レート制限対策（1秒待つ）
    await new Promise((r) => setTimeout(r, 1000));
  }

  // 重複排除（商品名が同じものは最初のものだけ残す）
  const seen = new Set();
  const unique = allProducts.filter((p) => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });

  const outputPath = path.join(__dirname, "../data/structured.json");
  fs.writeFileSync(outputPath, JSON.stringify(unique, null, 2), "utf-8");

  console.log(`\n✅ ${unique.length}件の商品データを抽出（重複排除済み）`);
  console.log(`💾 ${outputPath} に保存しました`);
}

main().catch(console.error);

export { structureArticle };
