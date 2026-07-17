// 回遊リンク用のブランド集計。掲載数の多い順に人気ブランドとして扱う。
// 「その他」等の未分類ブランドは行き先ページが薄いため候補から外す。
const GENERIC_BRANDS = new Set(["その他", "New", "キャラクター"]);

export function getPopularBrands(products, { excludeSlug = null, limit = 12 } = {}) {
  const counts = new Map();
  products.forEach((p) => {
    if (GENERIC_BRANDS.has(p.brand) || p.brandSlug === excludeSlug) return;
    const cur = counts.get(p.brandSlug);
    if (cur) cur.count += 1;
    else counts.set(p.brandSlug, { slug: p.brandSlug, name: p.brand, count: 1 });
  });
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
