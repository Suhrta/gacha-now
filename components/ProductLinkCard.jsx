import Link from "next/link";
import ProductThumb from "./ProductThumb";

// 回遊セクション（新着・人気）で共通に使う商品カード。
// 同じ見た目を2箇所で書き分けると片方だけ崩れるので1つにまとめている。
export default function ProductLinkCard({ product }) {
  return (
    <Link
      href={`/item/${product.id}`}
      className="block p-3 bg-white rounded-lg border border-cream-border no-underline hover:border-brand-accent transition-colors"
    >
      <ProductThumb
        src={product.img}
        alt={product.name}
        className="w-full aspect-square object-cover rounded-md bg-cream-dark"
      />
      <div className="text-xs font-bold text-brand-text leading-snug mt-2 line-clamp-2">
        {product.name}
      </div>
      <div className="text-[10px] text-brand-sub mt-1">
        ¥{product.price}
        {product.types ? `・全${product.types}種` : ""}・{product.releaseWeek}
      </div>
    </Link>
  );
}
