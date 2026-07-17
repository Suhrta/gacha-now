"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import GachaMachine from "../../../components/GachaMachine";
import ReceiptPaper from "../../../components/ReceiptPaper";
import Footer from "../../../components/Footer";
import Breadcrumb from "../../../components/Breadcrumb";
import NewArrivalsSection from "../../../components/NewArrivalsSection";
import products from "../../../data/products.json";
import { getAllReleaseMonths, getReleaseYearMonth, formatYearMonth } from "../../../lib/release";
import { getPopularBrands } from "../../../lib/browse";

function releaseWeekToNum(str) {
  if (!str || str === "未定") return 8888;
  const w = str.match(/第(\d+)週/);
  const d = str.match(/(\d+)日/);
  if (w) return parseInt(w[1]);
  if (d) return Math.ceil(parseInt(d[1]) / 7);
  if (str.includes("上旬")) return 1;
  if (str.includes("中旬")) return 3;
  if (str.includes("下旬")) return 4;
  return 9;
}

export default function ReleaseMonthPage() {
  const { month } = useParams();
  const [selected, setSelected] = useState(null);

  const items = products
    .filter((p) => getReleaseYearMonth(p) === month)
    .sort((a, b) => releaseWeekToNum(a.releaseWeek) - releaseWeekToNum(b.releaseWeek));
  const label = /^\d{4}-\d{2}$/.test(month) ? formatYearMonth(month) : month;
  const otherMonths = getAllReleaseMonths(products).filter((m) => m !== month);
  const monthBrands = getPopularBrands(items, { limit: 10 });

  return (
    <>
      <header className="bg-cream border-b-2 border-cream-border px-4 pt-4 pb-3">
        <Link href="/" className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
          ← トップにもどる
        </Link>
        <div className="text-center mt-2">
          <h1 className="font-pixel text-[12px] text-brand-accent animate-float">
            {label}はつばい
          </h1>
          <div className="font-pixel text-[10px] text-brand-sub mt-1">
            の ガチャ いちらん
          </div>
        </div>
      </header>

      <main className="px-2.5 pt-3 pb-20 relative" style={{ minHeight: "calc(100vh - 120px)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-50"
          style={{ backgroundImage: "radial-gradient(circle, #F0E6D6 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: `${label}発売` }]} />

        {items.length > 0 && (
          <p className="text-xs text-brand-sub leading-relaxed mb-3 px-1 relative z-[1]">
            {label}発売のガチャガチャ・カプセルトイ新作{items.length}件まとめ。価格・種類数・発売週つきで毎日更新中。気になる新作を発売前にチェックしよう。
          </p>
        )}

        <div className="font-pixel text-[10px] text-brand-sub mb-2.5 px-1 relative">
          {items.length}けん
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 relative z-[1]">
          {items.map((p, i) => (
            <GachaMachine key={p.id} product={p} index={i} onClick={setSelected} />
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-10 text-brand-sub font-pixel text-[11px] leading-[2.2]">
            😢<br />このつきの<br />しんさくは まだ ないよ
          </div>
        )}

        {monthBrands.length > 0 && (
          <section className="mt-10 px-1 relative z-[1]">
            <h2 className="text-sm font-bold text-brand-text mb-3">{label}発売の人気キャラ・ブランドから探す</h2>
            <div className="flex flex-wrap gap-2">
              {monthBrands.map((b) => (
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
        )}

        <NewArrivalsSection excludeIds={items.map((p) => p.id)} />

        <section className="mt-10 px-1 relative z-[1]">
          <h2 className="text-sm font-bold text-brand-text mb-3">ほかの月から探す</h2>
          <div className="flex flex-wrap gap-2">
            {otherMonths.map((m) => (
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
