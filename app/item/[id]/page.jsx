import Link from "next/link";
import ReceiptPaper from "../../../components/ReceiptPaper";
import products from "../../../data/products.json";

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export function generateMetadata({ params }) {
  const product = products.find((p) => p.id === params.id);
  if (!product) return { title: "商品が見つかりません | ガチャなう" };
  return {
    title: `${product.name} | ガチャなう`,
    description: `${product.name}（¥${product.price}・全${product.types}種）の新作ガチャ情報。${product.releaseWeek}発売予定。`,
    openGraph: {
      title: `${product.name} | ガチャなう`,
      description: `¥${product.price}・全${product.types}種 ── ${product.releaseWeek}発売`,
      images: [product.img],
    },
  };
}

export default function ItemPage({ params }) {
  const product = products.find((p) => p.id === params.id);

  if (!product) {
    return (
      <div className="text-center py-20">
        <div className="font-pixel text-[10px] text-brand-sub mb-4">😢 みつかりません</div>
        <Link href="/" className="font-pixel text-[11px] text-brand-accent no-underline">
          ← トップにもどる
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pt-4">
        <Link href="/" className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
          ← トップにもどる
        </Link>
      </div>
      <ReceiptPaper product={product} isPage={true} />
    </>
  );
}
