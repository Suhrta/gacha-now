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
        product={product}
        className="w-full aspect-square object-cover rounded-md bg-cream-dark"
      />
      <div className="text-sm font-bold text-brand-text leading-snug mt-2 line-clamp-2">
        {product.name}
      </div>
      {/* 価格・発売日はこのカードで一番よく読まれる情報なのに 10px / 薄灰で、
          スマホだと読み取れなかった。12px未満にしない方針に合わせて上げ、
          色も brand-sub（薄灰）から brand-text（濃）にしてある。
          商品名を 14px にしているのは、両方 12px だと階層が消えるため。
          **ShokuganCard と同じ値にしてあるので、片方だけ変えないこと。** */}
      <div className="text-xs text-brand-text mt-1">
        ¥{product.price}
        {product.types ? `・全${product.types}種` : ""}・{product.releaseWeek}
      </div>
    </Link>
  );
}
