"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import GachaMachine from "../../../components/GachaMachine";
import ReceiptPaper from "../../../components/ReceiptPaper";
import Footer from "../../../components/Footer";
import Breadcrumb from "../../../components/Breadcrumb";
import CharacterInfo from "../../../components/CharacterInfo";
import NewArrivalsSection from "../../../components/NewArrivalsSection";
import PopularNowSection from "../../../components/PopularNowSection";
import products from "../../../data/products.json";
import { getBrandIntro } from "../../../data/character-intros";
import { getPopularBrands } from "../../../lib/browse";
import { getAllReleaseMonths, formatYearMonth } from "../../../lib/release";

export default function BrandPage() {
  const { slug } = useParams();
  const [selected, setSelected] = useState(null);

  const brandProducts = products.filter((p) => p.brandSlug === slug);
  const brandName = brandProducts.length > 0 ? brandProducts[0].brand : slug;
  const popularBrands = getPopularBrands(products, { excludeSlug: slug });
  const releaseMonths = getAllReleaseMonths(products);

  return (
    <>
      <header className="bg-cream border-b-2 border-cream-border px-4 pt-4 pb-3">
        <Link href="/" className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
          ← トップにもどる
        </Link>
        <div className="text-center mt-2">
          <h1 className="animate-float">
            <span className="block font-pixel text-[12px] text-brand-accent">{brandName}</span>
            <span className="block font-pixel text-[10px] text-brand-sub mt-1">
              のガチャガチャ 新作・最新情報
            </span>
          </h1>
        </div>
      </header>

      <main className="px-2.5 pt-3 pb-20 relative" style={{ minHeight: "calc(100vh - 120px)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-50"
          style={{ backgroundImage: "radial-gradient(circle, #F0E6D6 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: `${brandName}の新作` }]} />

        {/* 手書きの紹介文はキャラページでしか使われていなかった。
            ブランドページは掲載2〜5件でも検索流入が多く（転スラ1,888表示・ハイキュー1,367表示/直近28日）、
            商品グリッドだけだと読むものが無く数秒で離脱するため、同じ文章をここでも出す */}
        <CharacterInfo name={brandName} items={brandProducts} intro={getBrandIntro(slug)} />

        <div className="font-pixel text-[10px] text-brand-sub mb-2.5 px-1 relative">
          {brandProducts.length}けん
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 relative z-[1]">
          {brandProducts.map((p, i) => (
            <GachaMachine key={p.id} product={p} index={i} onClick={setSelected} />
          ))}
        </div>

        {brandProducts.length === 0 && (
          <div className="text-center py-10 text-brand-sub font-pixel text-[11px] leading-[2.2]">
            😢<br />この ブランドの<br />しんさくは まだ ないよ
          </div>
        )}

        <PopularNowSection excludeBrandSlug={slug} limit={6} gridClass="grid-cols-2 md:grid-cols-3 lg:grid-cols-6" />

        <NewArrivalsSection excludeBrandSlug={slug} />

        <section className="mt-10 px-1 relative z-[1]">
          <h2 className="text-sm font-bold text-brand-text mb-3">ほかの人気キャラ・ブランドから探す</h2>
          <div className="flex flex-wrap gap-2">
            {popularBrands.map((b) => (
              <Link
                key={b.slug}
                href={`/brand/${b.slug}`}
                className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
              >
                {b.name} ({b.count})
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 px-1 relative z-[1]">
          <h2 className="text-sm font-bold text-brand-text mb-3">発売月から探す</h2>
          <div className="flex flex-wrap gap-2">
            {releaseMonths.map((m) => (
              <Link
                key={m}
                href={`/release/${m}`}
                className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
              >
                📅 {formatYearMonth(m)}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      {selected && <ReceiptPaper product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
