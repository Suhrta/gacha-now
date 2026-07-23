import Link from "next/link";
import products from "../../data/products.json";
import { getAllReleaseMonths, formatYearMonth, getReleaseYearMonth } from "../../lib/release";

export const metadata = {
  title: "ガチャガチャ 発売月から探す｜今月・来月の新作カレンダー | ガチャなう",
  description:
    "ガチャガチャ（カプセルトイ）を発売月から探せる一覧です。今月の新作、来月の発売予定をまとめてチェックできます。",
  alternates: { canonical: "https://gacha-now.net/release" },
};

export default function ReleaseIndexPage() {
  const months = getAllReleaseMonths(products);
  const counts = products.reduce((acc, p) => {
    const ym = getReleaseYearMonth(p);
    if (ym) acc[ym] = (acc[ym] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <Link href="/" className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
        ← トップにもどる
      </Link>

      <div className="mt-6 text-center">
        <h1 className="font-pixel text-[14px] text-brand-accent">📅 発売月から探す</h1>
        <p className="font-pixel text-[10px] text-brand-sub mt-2 tracking-[1px]">
          ぜんぶで {months.length} かげつ
        </p>
      </div>

      <p className="text-xs text-brand-text leading-relaxed mt-6 mb-5">
        ガチャガチャは<strong className="font-bold">毎月たくさんの新作が入れ替わります</strong>。「今月なにが出る？」「来月の発売予定は？」を月ごとにまとめました。
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {months.map((m) => (
          <Link
            key={m}
            href={`/release/${m}`}
            className="block p-4 bg-white rounded-xl border-2 border-cream-border no-underline hover:border-brand-accent transition-colors text-center"
            style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
          >
            <div className="text-sm font-bold text-brand-text">{formatYearMonth(m)}</div>
            <div className="text-[10px] text-brand-sub mt-1">{counts[m] || 0}件</div>
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
