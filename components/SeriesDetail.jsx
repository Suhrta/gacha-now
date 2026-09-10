"use client";
// シリーズ詳細ページの本体（旧 app/series/[slug]/page.jsx）。
//
// クライアント側に置いているのは商品カードの開閉（ReceiptPaper）のためだけ。
// 構造化データは app/series/[slug]/page.jsx（サーバー側）が出す。
// もともと layout.jsx が出していたが、layout は /series/[slug]/history にも
// 適用されるため、歴代ページに「シリーズの新作ItemList」と
// 「シリーズページを現在地とするパンくず」が混入していた。
import { Fragment, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import GachaMachine from "./GachaMachine";
import ReceiptPaper from "./ReceiptPaper";
import Footer from "./Footer";
import Breadcrumb from "./Breadcrumb";
import AdUnit, { useInFeedGrid } from "./AdUnit";
import { HubLead, HubDetails } from "./HubInfo";
import products from "../data/products.json";
import { browsableSeries, getSeriesBySlug, filterProductsBySeries } from "../data/series";

export default function SeriesDetail({ historyTotal = null }) {
  const { slug } = useParams();
  const [selected, setSelected] = useState(null);
  const { isBandAt, firstBandAt } = useInFeedGrid();

  const series = getSeriesBySlug(slug);
  const items = series ? filterProductsBySeries(products, series) : [];
  const name = series ? series.name : decodeURIComponent(slug);
  const intro = series ? series.intro : null;
  const others = browsableSeries().filter((s) => s.slug !== slug);

  return (
    <>
      <header className="bg-cream border-b-2 border-cream-border px-4 pt-4 pb-3">
        <Link href="/" className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
          ← トップにもどる
        </Link>
        <div className="text-center mt-2">
          <h1 className="animate-float">
            <span className="block font-pixel text-[12px] text-brand-accent">{name}</span>
            <span className="block font-pixel text-[10px] text-brand-sub mt-1">シリーズ 新作・全種一覧</span>
          </h1>
        </div>
      </header>

      <main className="px-2.5 pt-3 pb-20 relative" style={{ minHeight: "calc(100vh - 120px)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-50"
          style={{ backgroundImage: "radial-gradient(circle, #F0E6D6 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "シリーズ特集", href: "/series" }, { name: name }]} />

        <HubLead name={name} items={items} intro={intro} />

        {/* 「歴代」「過去」意図のクエリは約1,270表示ある（lib/series-history.js）。
            このページは掲載中しか出していないので、専用ページへ明示的に送る。 */}
        {series && series.history && historyTotal ? (
          <Link
            href={`/series/${slug}/history`}
            className="relative z-[1] flex items-center gap-2 mb-3 px-4 py-3 bg-white border-2 border-brand-accent rounded-xl no-underline hover:bg-cream-dark transition-colors"
          >
            <span className="text-lg shrink-0">🗂️</span>
            <span className="text-xs font-bold text-brand-text leading-snug">
              歴代の{name}を見る（掲載終了分ふくむ全{historyTotal}件）
            </span>
            <span className="text-brand-accent text-sm shrink-0 ml-auto">→</span>
          </Link>
        ) : null}

        {series && series.guide && (
          <Link
            href={series.guide.url}
            className="relative z-[1] flex items-center gap-2 mb-4 px-4 py-3 bg-white border-2 border-brand-accent rounded-xl no-underline hover:bg-cream-dark transition-colors"
          >
            <span className="text-lg shrink-0">🎀</span>
            <span className="text-xs font-bold text-brand-text leading-snug">{series.guide.label}</span>
            <span className="text-brand-accent text-sm shrink-0 ml-auto">→</span>
          </Link>
        )}

        <div className="font-pixel text-[10px] text-brand-sub mb-2.5 px-1 relative">{items.length}けん</div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 relative z-[1]">
          {items.map((p, i) => (
            <Fragment key={p.id}>
              {isBandAt(i) && <AdUnit name="inFeed" className="col-span-full my-2" insClass="min-h-[280px] md:min-h-[120px]" />}
              <GachaMachine product={p} index={i} onClick={setSelected} />
            </Fragment>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-10 text-brand-sub font-pixel text-[11px] leading-[2.2]">
            😢<br />このシリーズの<br />しんさくは まだ ないよ
          </div>
        )}

        {/* 掲載が少なくて帯を挟む行が無いページ。ここだけグリッドの直下に落とす */}
        {items.length > 0 && items.length <= firstBandAt && <AdUnit name="inFeed" />}

        <HubDetails name={name} items={items} intro={intro} extraFaq={series ? series.faq : null} />

        <section className="mt-10 px-1 relative z-[1]">
          <h2 className="text-sm font-bold text-brand-text mb-3">ほかのシリーズ特集</h2>
          <div className="flex flex-wrap gap-2">
            {others.map((s) => (
              <Link
                key={s.slug}
                href={`/series/${s.slug}`}
                className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </section>
        <AdUnit name="pageBottom" />
      </main>

      <Footer />

      {selected && <ReceiptPaper product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
