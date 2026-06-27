"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import GachaMachine from "../../../components/GachaMachine";
import ReceiptPaper from "../../../components/ReceiptPaper";
import Footer from "../../../components/Footer";
import Breadcrumb from "../../../components/Breadcrumb";
import CharacterInfo from "../../../components/CharacterInfo";
import products from "../../../data/products.json";

export default function BrandPage() {
  const { slug } = useParams();
  const [selected, setSelected] = useState(null);

  const brandProducts = products.filter((p) => p.brandSlug === slug);
  const brandName = brandProducts.length > 0 ? brandProducts[0].brand : slug;

  return (
    <>
      <header className="bg-cream border-b-2 border-cream-border px-4 pt-4 pb-3">
        <Link href="/" className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
          ← トップにもどる
        </Link>
        <div className="text-center mt-2">
          <h1 className="font-pixel text-[12px] text-brand-accent animate-float">
            {brandName}
          </h1>
          <div className="font-pixel text-[10px] text-brand-sub mt-1">
            の ガチャ いちらん
          </div>
        </div>
      </header>

      <main className="px-2.5 pt-3 pb-20 relative" style={{ minHeight: "calc(100vh - 120px)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-50"
          style={{ backgroundImage: "radial-gradient(circle, #F0E6D6 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: `${brandName}の新作` }]} />

        <CharacterInfo name={brandName} items={brandProducts} intro={null} />

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
      </main>

      <Footer />

      {selected && <ReceiptPaper product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
