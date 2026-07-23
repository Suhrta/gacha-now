import products from "../data/products.json";
import blogPosts from "../data/blog-posts.json";
import { CHARACTERS, filterProductsByCharacter } from "../data/characters";
import { SERIES, filterProductsBySeries } from "../data/series";
import { getAllReleaseMonths, getReleaseYearMonth } from "../lib/release";
import { indexableProducts, indexableBlogPosts, isLowValueBrandPage } from "../lib/quality";

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

  // 商品が少なく noindex にしているブランドは、サイトマップにも載せない
  // （載せるとnoindexページを自分で申告することになり矛盾する）
  const brandSlugs = [...new Set(products.map((p) => p.brandSlug))];
  const brandPages = brandSlugs
    .map((slug) => ({ slug, items: products.filter((p) => p.brandSlug === slug) }))
    .filter(({ items }) => !isLowValueBrandPage(items))
    .map(({ slug, items }) => ({
      url: `${BASE_URL}/brand/${slug}`,
      lastModified: latestCollectedAt(items),
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

  const seriesPages = SERIES.map((s) => ({
    url: `${BASE_URL}/series/${s.slug}`,
    lastModified: latestCollectedAt(filterProductsBySeries(products, s)),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

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
    // 探索の入口となる一覧ページ。トップから全件のリンクを外した分、
    // ここが brand/character/release 各ページへの主要な内部リンク元になる
    { url: `${BASE_URL}/series`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/character`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/brand`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/release`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    ...blogPages,
    ...seriesPages,
    ...productPages,
    ...brandPages,
    ...characterPages,
    ...releasePages,
  ];
}
