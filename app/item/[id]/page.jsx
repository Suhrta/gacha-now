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
    title: `${product.name}｜¥${product.price}・全${product.types}種【${product.releaseWeek}発売】| ガチャなう`,
    description: `${product.name}（${product.brand}）のカプセルトイ情報。¥${product.price}・全${product.types}種。${product.releaseWeek}発売予定。ラインナップ・取扱店舗をチェック。`,
    openGraph: {
      title: `${product.name}｜¥${product.price}・全${product.types}種【${product.releaseWeek}】`,
      description: `${product.brand}のカプセルトイ「${product.name}」¥${product.price}・全${product.types}種 ── ${product.releaseWeek}発売`,
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

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images && product.images.length > 0 ? product.images : (product.img ? [product.img] : undefined),
    description: product.description || `${product.name}（全${product.types}種）のカプセルトイ新作情報。${product.releaseWeek}発売。`,
    brand: { "@type": "Brand", name: product.brand },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "JPY",
      availability: "https://schema.org/InStock",
      url: `https://gacha-now.net/item/${product.id}`,
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: "https://gacha-now.net" },
      { "@type": "ListItem", position: 2, name: product.brand, item: `https://gacha-now.net/brand/${product.brandSlug}` },
      { "@type": "ListItem", position: 3, name: product.name, item: `https://gacha-now.net/item/${product.id}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="px-4 pt-4">
        <Link href="/" className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
          ← トップにもどる
        </Link>
      </div>
      <ReceiptPaper product={product} isPage={true} />
    </>
  );
}
