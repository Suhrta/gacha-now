import products from "../data/products.json";
import ProductLinkCard from "./ProductLinkCard";
import { getStatus } from "../lib/product-status";

// 「いま買える人気ガチャ」＝ hot 判定が付いていて、かつ発売済み（available）の商品。
//
// 【なぜ必要か】
// 発売月ページ（/release/YYYY-MM）は releaseWeek に「○月」を含む商品しか出さない。
// 「発売中」表記の商品は月が特定できず月ページに一切載らないため、
// 先の月ほど「マイナーIPの数十件だけ」という薄い見た目になる。
// 実際 2026-08 は20件・うち hot は2件しかないのに、GSC実測（2026-07-27・直近28日）では
// サイト最大の流入ページ（136クリック / 4,127表示）で、平均滞在は25秒と最短クラスだった。
// ＝「人気商品が並んでいない一覧に着地して即離脱」している状態。
// 埋もれている人気商品（hot かつ発売中は48件）をここで見せて回遊先を作る。
export default function PopularNowSection({
  excludeIds = [],
  excludeBrandSlug = null,
  limit = 8,
  title = "🔥 いま買える人気ガチャ",
  className = "px-1 mt-10 relative z-[1]",
  gridClass = "grid-cols-2 md:grid-cols-4 lg:grid-cols-8",
}) {
  const exclude = new Set(excludeIds);
  const items = products
    .filter(
      (p) =>
        p.hot &&
        p.img &&
        getStatus(p) === "available" &&
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
