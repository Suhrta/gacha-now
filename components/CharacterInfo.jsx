import Link from "next/link";
import { buildHubInfo } from "../lib/hub-info";

// キャラ別ページの「読み物」ブロック。
// 編集文（手書き）＋ 自社データから算出した概要・統計・FAQ を表示する。
// すべて掲載中の商品データ起点なので、公式にない網羅的な独自情報になる。
//
// 表示する統計・FAQの中身は lib/hub-info.js に集約している。
// 各 layout.jsx が同じ関数から FAQPage の構造化データを組み立てるため、
// ここの文面を変えると検索エンジンへの申告も自動で追従する（食い違わない）。
export default function CharacterInfo({ name, items, intro }) {
  const info = buildHubInfo({ name, items });
  if (!info) return null;

  const { stats, faq } = info;

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
          {faq.map((f) => (
            <div key={f.q}>
              <dt className="text-[11px] font-bold text-brand-text">Q. {f.q}</dt>
              <dd className="text-[11px] text-brand-sub leading-relaxed">
                A.{" "}
                {f.a.map((seg, i) =>
                  seg.href ? (
                    <Link key={i} href={seg.href} className="text-brand-accent no-underline">
                      {seg.t}
                    </Link>
                  ) : (
                    <span key={i}>{seg.t}</span>
                  )
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
