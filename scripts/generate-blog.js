import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const POSTS_PATH = path.join(__dirname, "..", "data", "blog-posts.json");
const PRODUCTS_PATH = path.join(__dirname, "..", "data", "products.json");

function loadPosts() {
  try {
    return JSON.parse(fs.readFileSync(POSTS_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function loadProducts() {
  return JSON.parse(fs.readFileSync(PRODUCTS_PATH, "utf-8"));
}

async function generateArticle(products, existingTitles) {
  const brands = [...new Set(products.map((p) => p.brand))];
  const recentProducts = products
    .filter((p) => p.releaseWeek)
    .sort((a, b) => (b.releaseWeek || "").localeCompare(a.releaseWeek || ""))
    .slice(0, 30);

  const productsSummary = recentProducts
    .map((p) => `${p.name} (${p.brand}, ¥${p.price}, ${p.types}種, ${p.releaseWeek}) [ID: ${p.id}]`)
    .join("\n");

  const today = new Date().toISOString().split("T")[0];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `あなたはカプセルトイ（ガチャガチャ）の情報ライターです。以下の商品データをもとに、SEO検索流入を狙ったブログ記事を1本書いてください。

今日の日付: ${today}

ブランド一覧: ${brands.join("、")}

最新商品データ（直近30件）:
${productsSummary}

既存記事タイトル（重複を避けてください）:
${existingTitles.map((t) => `- ${t}`).join("\n") || "（なし）"}

記事のテーマ例（検索ボリュームが大きいものを優先）:
- 「{ブランド名} ガチャ 新作 まとめ」
- 「{キャラ名} カプセルトイ 一覧」
- 「今週の新作ガチャ おすすめ5選」
- 「{月}月発売 ガチャガチャ まとめ」
- 「大人向けガチャガチャ おすすめ」
- 「{場所}のガチャガチャ設置場所」

以下のJSON形式で返してください:
{
  "title": "記事タイトル（30-50文字、SEOキーワード含む）",
  "slug": "url-safe-slug-in-english",
  "description": "記事の説明文（80-120文字）",
  "content": "マークダウン形式の記事本文（1000-1500文字。h2、h3、リスト、太字を使用。具体的な商品名・価格・種類数を含める）"
}

contentの追加ルール:
- 記事中で商品を紹介した直後に、その商品の商品カードを挿入するため「[product:商品ID]」という行を単独で入れてください（例: [product:skzoo--6830bc0e]）
- IDは上記の商品データに記載された [ID: ...] の値をそのまま正確にコピーしてください。創作・変更は禁止です
- 商品カードは記事全体で3〜5箇所入れてください
- 商品データに存在しない商品をカードにしないでください

JSONのみ返してください。`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Failed to parse response JSON");
  return JSON.parse(match[0]);
}

async function main() {
  const products = loadProducts();
  const posts = loadPosts();
  const existingTitles = posts.map((p) => p.title);

  console.log(`Products: ${products.length}, Existing posts: ${posts.length}`);

  const article = await generateArticle(products, existingTitles);
  const today = new Date().toISOString().split("T")[0];

  // 存在しない商品IDのカードタグを除去（AIの転記ミス対策）
  const validIds = new Set(products.map((p) => p.id));
  article.content = article.content
    .split("\n")
    .filter((line) => {
      const m = line.trim().match(/^\[product:([^\]]+)\]$/);
      if (m && !validIds.has(m[1])) {
        console.warn(`Removed invalid product tag: ${m[1]}`);
        return false;
      }
      return true;
    })
    .join("\n");

  const newPost = {
    slug: article.slug,
    title: article.title,
    description: article.description,
    content: article.content,
    publishedAt: today,
  };

  posts.push(newPost);
  fs.writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2));

  console.log(`Generated: ${article.title}`);
  console.log(`Total posts: ${posts.length}`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
