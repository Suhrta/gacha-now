import products from "../data/products.json";

const BASE_URL = "https://gacha-now.net";

export default function sitemap() {
  const productPages = products.map((p) => ({
    url: `${BASE_URL}/item/${p.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const brandSlugs = [...new Set(products.map((p) => p.brandSlug))];
  const brandPages = brandSlugs.map((slug) => ({
    url: `${BASE_URL}/brand/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.2 },
    ...productPages,
    ...brandPages,
  ];
}