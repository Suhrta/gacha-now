// LLMO対策: AIクローラ/LLM向けのサイト概要ファイル (https://llmstxt.org/ 形式)
// 商品データから動的生成し、日次リビルドで自動的に最新化される。
import products from "../../data/products.json";
import { CHARACTERS } from "../../data/characters";
import { SERIES } from "../../data/series";
import blogPosts from "../../data/blog-posts.json";
import { getAllReleaseMonths, formatYearMonth } from "../../lib/release";

export const dynamic = "force-static";

const BASE = "https://gacha-now.net";

// 掲載2件以上のブランド(=作品/メーカー)ハブを商品数順に。GSCで転スラ・ハイキュー等の
// brandページが上位流入源になっているため、AIクローラにも明示する
function topBrands() {
  const counts = {};
  for (const p of products) {
    if (!p.brandSlug || p.brand === "その他") continue;
    counts[p.brandSlug] = counts[p.brandSlug] || { slug: p.brandSlug, name: p.brand, n: 0 };
    counts[p.brandSlug].n += 1;
  }
  return Object.values(counts)
    .filter((b) => b.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 20);
}

export function GET() {
  const months = getAllReleaseMonths(products).sort().reverse().slice(0, 4);
  const guides = blogPosts.filter((p) => p.evergreen);

  const lines = [
    "# ガチャなう (Gacha Now)",
    "",
    `> 日本のガチャガチャ（カプセルトイ）の新作・発売予定・発売中情報を毎日自動更新でまとめるデータベースサイト。現在${products.length}件の商品を掲載し、各商品の価格・全種数・発売週・メーカー公式ページへのリンクを、発売月別・キャラクター別・メーカー別・シリーズ別に整理している。`,
    "",
    "- 商品データはバンダイ・タカラトミーアーツ・奇譚クラブ等の公式情報源から毎日収集・更新される",
    `- 運営者情報: ${BASE}/operator / お問い合わせ: ${BASE}/contact`,
    "",
    "## 主要ページ",
    "",
    `- [ガチャガチャ新作・最新情報一覧](${BASE}/): 全${products.length}件。新作・発売予定・発売中で絞り込み可能`,
    ...months.map((m) => `- [${formatYearMonth(m)}発売のガチャガチャ一覧](${BASE}/release/${m})`),
    "",
    "## キャラクター別 新作ガチャ一覧",
    "",
    ...CHARACTERS.map((c) => `- [${c.name}のガチャガチャ新作](${BASE}/character/${c.slug})`),
    "",
    "## 作品・メーカー別 新作ガチャ一覧",
    "",
    ...topBrands().map((b) => `- [${b.name}のガチャガチャ新作一覧](${BASE}/brand/${b.slug})`),
    "",
    "## シリーズ特集",
    "",
    ...SERIES.map((s) => `- [${s.name}の一覧・全種情報](${BASE}/series/${s.slug})`),
    "",
    "## ガイド記事（編集部執筆）",
    "",
    ...guides.map((g) => `- [${g.title}](${BASE}/blog/${g.slug})`),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
