import ProductLinkCard from "./ProductLinkCard";
import products from "../data/products.json";

// 直帰対策の回遊セクション。収集日時が新しい商品を「今週の新着」として出す。
// サーバー/クライアントどちらのページからも使えるようフックは持たない。
export default function NewArrivalsSection({
  excludeIds = [],
  excludeBrandSlug = null,
  limit = 6,
  title = "🆕 新着ガチャ情報",
  className = "px-1 mt-10 relative z-[1]",
  gridClass = "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
}) {
  const exclude = new Set(excludeIds);
  const items = products
    .filter(
      (p) =>
        p.img &&
        !exclude.has(p.id) &&
        (!excludeBrandSlug || p.brandSlug !== excludeBrandSlug)
    )
    .sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt))
    .slice(0, limit);

  if (items.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="text-sm font-bold text-brand-text mb-3 border-l-4 border-brand-accent pl-3">
        {title}
      </h2>
      <div className={`grid ${gridClass} gap-3`}>
        {items.map((p) => (
          <ProductLinkCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
