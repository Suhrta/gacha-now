import Link from "next/link";
import { buildHubInfo } from "../lib/hub-info";

// ブランド／キャラ／シリーズの各ハブページに出す「読み物」ブロック。
// 編集文（手書きの intro）＋ 自社データから算出した概要・統計・FAQ を表示する。
// すべて掲載中の商品データ起点なので、公式にない網羅的な独自情報になる。
//
// 表示する統計・FAQの中身は lib/hub-info.js に集約している。
// 各ページが同じ関数から FAQPage の構造化データを組み立てるため、
// ここの文面を変えると検索エンジンへの申告も自動で追従する（食い違わない）。
//
// ── 2026-09-08: 一覧の上下に分割した ────────────────────────────
// もとは定義文・統計・FAQを1枚のカードにまとめて商品グリッドの上に置いていた。
// intro が長い /series/mejirushi ではカードだけでモバイル約770pxあり、
// ヘッダーとパンくずを足すと商品が1件もファーストビューに入らなかった。
//
// このページに実際に来ているのは一覧を見に来た人が大半で、
// 「めじるしチャーム 新作」系の表記ゆれクエリだけで1,000表示を超える
// （data/series.js のメモ。「◯◯とは」意図はGSCに出ていない）。
// 一方で定義文そのものは残す価値がある。「フロッキーマスコットとは」等の
// 定義クエリは170表示あり（lib/hub-info.js）、この一文が FAQPage の
// 1問目としてそのまま構造化データにも出ているため。
//
// そこで「答えの一文」だけを一覧の上に残し、残りは一覧の下へ送る:
//   HubLead    … 「◯◯とは？」＋ intro の1文目。グリッドの上。
//   HubDetails … intro の残り・統計・FAQ。グリッドの下。
// 構造化データは各ページ側で出しているので、DOMの位置を動かしても影響しない。

// 一覧の上に置く最小限のブロック。定義文が取れないハブでは何も出さない
// （見出しだけが残ってファーストビューを削るのを避ける）。
export function HubLead({ name, items, intro }) {
  const info = buildHubInfo({ name, items, intro });
  if (!info || !info.definition) return null;

  return (
    <section
      className="relative z-[1] mb-4 bg-white rounded-xl border-2 border-cream-border px-4 py-3"
      style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
    >
      <h2 className="text-sm font-bold text-brand-text mb-1.5">{name}とは？</h2>
      <p className="text-xs text-brand-text leading-relaxed">{info.definition}</p>
    </section>
  );
}

// 一覧の下に置く本体。intro が無いハブでも統計とFAQは出す。
export function HubDetails({ name, items, intro, extraFaq }) {
  const info = buildHubInfo({ name, items, intro, extraFaq });
  if (!info) return null;

  const { stats, faq, introRest } = info;

  return (
    <section
      className="relative z-[1] mt-10 bg-white rounded-xl border-2 border-cream-border p-4"
      style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
    >
      <h2 className="text-sm font-bold text-brand-text mb-2">
        {name}のガチャガチャ・カプセルトイ最新情報
      </h2>

      {introRest && (
        <p className="text-xs text-brand-text leading-relaxed mb-3">{introRest}</p>
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
