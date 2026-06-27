import Link from "next/link";
import { getReleaseYearMonth, formatYearMonth } from "../lib/release";

// キャラ別ページの「読み物」ブロック。
// 編集文（手書き）＋ 自社データから算出した概要・統計・FAQ を表示する。
// すべて掲載中の商品データ起点なので、公式にない網羅的な独自情報になる。
export default function CharacterInfo({ name, items, intro }) {
  if (!items || items.length === 0) return null;

  const prices = items.map((p) => p.price).filter((n) => typeof n === "number" && n > 0);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;

  const typeCounts = items.map((p) => p.types).filter((n) => typeof n === "number" && n > 0);
  const avgTypes = typeCounts.length
    ? Math.round((typeCounts.reduce((a, b) => a + b, 0) / typeCounts.length) * 10) / 10
    : null;

  const makers = [...new Set(items.map((p) => (p.source || "").replace("公式", "")).filter(Boolean))];

  const months = items
    .map((p) => getReleaseYearMonth(p))
    .filter(Boolean)
    .sort();
  const latestMonth = months.length ? months[months.length - 1] : null;

  const priceText =
    minPrice == null
      ? "—"
      : minPrice === maxPrice
      ? `¥${minPrice}`
      : `¥${minPrice}〜¥${maxPrice}`;

  const stats = [
    { label: "掲載中の新作", value: `${items.length}件` },
    { label: "価格帯", value: priceText },
    ...(avgTypes ? [{ label: "平均種類数", value: `約${avgTypes}種` }] : []),
    ...(makers.length ? [{ label: "主なメーカー", value: makers.join("・") }] : []),
    ...(latestMonth ? [{ label: "最新の発売月", value: formatYearMonth(latestMonth) }] : []),
  ];

  return (
    <section className="relative z-[1] mb-5 bg-white rounded-xl border-2 border-cream-border p-4" style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}>
      <h2 className="text-sm font-bold text-brand-text mb-2">
        {name}のガチャガチャ・カプセルトイ最新情報
      </h2>

      {intro && (
        <p className="text-xs text-brand-text leading-relaxed mb-3">{intro}</p>
      )}

      {/* データ起点の概要 */}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-0 mb-1">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col py-1.5 border-b border-dotted border-cream-border">
            <dt className="text-[10px] text-brand-sub">{s.label}</dt>
            <dd className="text-xs font-bold text-brand-text mt-0.5">{s.value}</dd>
          </div>
        ))}
      </dl>

      {/* よくある質問（内部リンク付き） */}
      <div className="mt-3 pt-3 border-t border-dashed border-cream-border">
        <h3 className="text-xs font-bold text-brand-text mb-1.5">{name}のガチャ・よくある質問</h3>
        <dl className="space-y-2">
          <div>
            <dt className="text-[11px] font-bold text-brand-text">Q. {name}の最新ガチャは？</dt>
            <dd className="text-[11px] text-brand-sub leading-relaxed">
              A. 現在 {items.length} 件の新作を掲載中です{latestMonth ? `（最新は${formatYearMonth(latestMonth)}発売）` : ""}。下の一覧から価格・種類数・発売日つきでチェックできます。
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold text-brand-text">Q. 値段はどのくらい？</dt>
            <dd className="text-[11px] text-brand-sub leading-relaxed">
              A. {name}のガチャは{priceText}が中心です。相場やコンプ予算の目安は
              <Link href="/blog/gachagacha-price-guide" className="text-brand-accent no-underline">値段相場ガイド</Link>
              で解説しています。
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold text-brand-text">Q. どこで買える？</dt>
            <dd className="text-[11px] text-brand-sub leading-relaxed">
              A. 各商品ページの店舗検索・通販リンクから探せます。買える場所は
              <Link href="/blog/gachagacha-where-to-buy-guide" className="text-brand-accent no-underline">どこで買えるガイド</Link>
              にまとめています。
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
