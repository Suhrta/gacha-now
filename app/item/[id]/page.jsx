import Link from "next/link";
import { notFound } from "next/navigation";
import ReceiptPaper from "../../../components/ReceiptPaper";
import RakutenLinks from "../../../components/RakutenLinks";
import Breadcrumb from "../../../components/Breadcrumb";
import products from "../../../data/products.json";
import rakutenLinks from "../../../data/rakuten-links.json";
import { charactersForProduct } from "../../../data/characters";
import { seriesForProduct } from "../../../data/series";
import { isReleased, getReleaseYearMonth, formatYearMonth } from "../../../lib/release";
import { isLowValueProduct } from "../../../lib/quality";

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

// 削除済み商品など未知のIDは200の「みつかりません」画面ではなく
// 本物の404を返す（ソフト404を防ぐ）
export const dynamicParams = false;

export function generateMetadata({ params }) {
  const product = products.find((p) => p.id === params.id);
  if (!product) return { title: "商品が見つかりません | ガチャなう" };
  const typesText = product.types ? `・全${product.types}種` : "";
  // 薄い長尾ページは検索インデックスから外す（サイト全体の品質を底上げ）
  const lowValue = isLowValueProduct(product);
  // 発売済みは過去の週表記だと「古い情報」に見えCTRが落ちるため「発売中」に切り替える
  const released = isReleased(product);
  const releaseTag = released ? "発売中" : `${product.releaseWeek}発売`;
  // 汎用テンプレより実際の商品紹介文の方がSERPで訴求できるため優先して使う
  const descLead = product.description
    ? product.description.slice(0, 80)
    : `${product.name}（${product.brand}）のカプセルトイ。`;
  return {
    title: `${product.name}｜¥${product.price}${typesText}【${releaseTag}】| ガチャなう`,
    description: `${descLead}¥${product.price}${typesText}／${releaseTag}。ラインナップ・価格・取扱店舗をチェック。`,
    robots: lowValue ? { index: false, follow: true } : { index: true, follow: true },
    alternates: { canonical: `https://gacha-now.net/item/${product.id}` },
    openGraph: {
      title: `${product.name}｜¥${product.price}${typesText}【${releaseTag}】`,
      description: `${product.brand}のカプセルトイ「${product.name}」¥${product.price}${typesText} ── ${releaseTag}`,
      images: [product.img],
    },
  };
}

export default function ItemPage({ params }) {
  const product = products.find((p) => p.id === params.id);

  if (!product) notFound();

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images && product.images.length > 0 ? product.images : (product.img ? [product.img] : undefined),
    description: product.description || `${product.name}${product.types ? `（全${product.types}種）` : ""}のカプセルトイ新作情報。${product.releaseWeek}発売。`,
    brand: { "@type": "Brand", name: product.brand },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "JPY",
      availability: isReleased(product)
        ? "https://schema.org/InStock"
        : "https://schema.org/PreOrder",
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

  const characters = charactersForProduct(product);
  const series = seriesForProduct(product);
  const characterIds = new Set();
  const related = products.filter((p) => p.id !== product.id && p.brand === product.brand);
  related.forEach((p) => characterIds.add(p.id));
  characters.forEach((c) => {
    const re = new RegExp(c.pattern);
    products.forEach((p) => {
      if (p.id !== product.id && !characterIds.has(p.id) && re.test(p.name)) {
        characterIds.add(p.id);
        related.push(p);
      }
    });
  });
  const relatedItems = related.slice(0, 6);
  const releaseMonth = getReleaseYearMonth(product);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="px-4 pt-4">
        <Breadcrumb
          items={[
            { name: "ホーム", href: "/" },
            { name: product.brand, href: `/brand/${product.brandSlug}` },
            { name: product.name },
          ]}
        />
      </div>
      <ReceiptPaper product={product} isPage={true} />

      <RakutenLinks product={product} links={rakutenLinks[product.id]} />

      {relatedItems.length > 0 && (
        <section className="px-4 mt-8 max-w-2xl mx-auto w-full">
          <h2 className="text-lg font-bold text-brand-text mb-3 border-l-4 border-brand-accent pl-3">
            関連するガチャ
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {relatedItems.map((p) => (
              <Link
                key={p.id}
                href={`/item/${p.id}`}
                className="block p-3 bg-white rounded-lg border border-cream-border no-underline hover:border-brand-accent transition-colors"
              >
                {p.img && (
                  <img
                    src={p.img}
                    alt={p.name}
                    loading="lazy"
                    className="w-full aspect-square object-cover rounded-md bg-cream-dark"
                  />
                )}
                <div className="text-xs font-bold text-brand-text leading-snug mt-2 line-clamp-2">
                  {p.name}
                </div>
                <div className="text-[10px] text-brand-sub mt-1">
                  ¥{p.price}{p.types ? `・全${p.types}種` : ""}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 mt-6 mb-10 max-w-2xl mx-auto w-full">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/brand/${product.brandSlug}`}
            className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
          >
            {product.brand}の新作一覧 →
          </Link>
          {characters.map((c) => (
            <Link
              key={c.slug}
              href={`/character/${c.slug}`}
              className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
            >
              #{c.name}のガチャ一覧
            </Link>
          ))}
          {series.map((s) => (
            <Link
              key={s.slug}
              href={`/series/${s.slug}`}
              className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
            >
              🎁 {s.name}シリーズ一覧
            </Link>
          ))}
          {releaseMonth && (
            <Link
              href={`/release/${releaseMonth}`}
              className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
            >
              📅 {formatYearMonth(releaseMonth)}発売の一覧
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
