import products from "../data/products.json";
import blogPosts from "../data/blog-posts.json";
import { CHARACTERS, filterProductsByCharacter } from "../data/characters";
import { getAllReleaseMonths, getReleaseYearMonth } from "../lib/release";
import { indexableProducts, indexableBlogPosts } from "../lib/quality";

const BASE_URL = "https://gacha-now.net";

function latestCollectedAt(list) {
  const times = list
    .map((p) => new Date(p.collectedAt).getTime())
    .filter((t) => !Number.isNaN(t));
  return times.length ? new Date(Math.max(...times)) : new Date();
}

export default function sitemap() {
  // 古くなった「○月まとめ」など非常緑の記事はサイトマップから除外（noindexと同期）
  const blogPages = indexableBlogPosts(blogPosts).map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // 薄い長尾ページ（noindex対象）はサイトマップにも載せない
  const productPages = indexableProducts(products).map((p) => ({
    url: `${BASE_URL}/item/${p.id}`,
    lastModified: p.collectedAt ? new Date(p.collectedAt) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const brandSlugs = [...new Set(products.map((p) => p.brandSlug))];
  const brandPages = brandSlugs.map((slug) => ({
    url: `${BASE_URL}/brand/${slug}`,
    lastModified: latestCollectedAt(products.filter((p) => p.brandSlug === slug)),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const characterPages = CHARACTERS.map((c) => {
    const items = filterProductsByCharacter(products, c);
    if (items.length === 0) return null;
    return {
      url: `${BASE_URL}/character/${c.slug}`,
      lastModified: latestCollectedAt(items),
      changeFrequency: "weekly",
      priority: 0.7,
    };
  }).filter(Boolean);

  const releasePages = getAllReleaseMonths(products).map((ym) => ({
    url: `${BASE_URL}/release/${ym}`,
    lastModified: latestCollectedAt(products.filter((p) => getReleaseYearMonth(p) === ym)),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/operator`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.2 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    ...blogPages,
    ...productPages,
    ...brandPages,
    ...characterPages,
    ...releasePages,
  ];
}
