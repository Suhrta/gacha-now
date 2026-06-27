import Link from "next/link";
import products from "../../data/products.json";
import { SERIES, filterProductsBySeries } from "../../data/series";

export const metadata = {
  title: "ガチャガチャ シリーズ特集一覧｜肩ズン・カプセルラバーマスコット ほか | ガチャなう",
  description:
    "肩ズンFig.・カプセルラバーマスコット・フロッキー・豆ガシャ本など、作品をまたいで展開されるガチャガチャ（カプセルトイ）の人気シリーズを特集。シリーズごとに新作・全種を一覧でチェックできます。",
  alternates: { canonical: "https://gacha-now.net/series" },
};

export default function SeriesIndexPage() {
  const list = SERIES.map((s) => ({
    ...s,
    count: filterProductsBySeries(products, s).length,
  }));

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <Link href="/" className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
        ← トップにもどる
      </Link>

      <div className="mt-6 text-center">
        <h1 className="font-pixel text-[14px] text-brand-accent">🎁 シリーズ特集</h1>
        <p className="font-pixel text-[10px] text-brand-sub mt-2 tracking-[1px]">
          さくひんを またぐ にんき シリーズ
        </p>
      </div>

      <p className="text-xs text-brand-text leading-relaxed mt-6 mb-5">
        「肩ズンFig.」や「カプセルラバーマスコット」のように、ガチャガチャには<strong className="font-bold">同じコンセプトで作品をまたいで展開される人気シリーズ</strong>があります。推しキャラとは別に「このシリーズで集めたい」という楽しみ方ができるのが魅力。シリーズごとに最新作・全種をまとめました。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {list.map((s) => (
          <Link
            key={s.slug}
            href={`/series/${s.slug}`}
            className="block p-4 bg-white rounded-xl border-2 border-cream-border no-underline hover:border-brand-accent transition-colors"
            style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-sm font-bold text-brand-text">{s.name}</h2>
              <span className="text-[10px] text-brand-sub shrink-0 ml-2">{s.count}件</span>
            </div>
            <p className="text-[11px] text-brand-sub leading-relaxed line-clamp-3">{s.intro}</p>
            <div className="text-[11px] text-brand-accent font-bold mt-2">一覧を見る →</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-brand-accent text-white font-pixel text-[11px] rounded-lg no-underline"
          style={{ boxShadow: "0 3px 0 #C5534D, 0 4px 12px #E8756D33" }}
        >
          ← トップにもどる
        </Link>
      </div>
    </div>
  );
}
