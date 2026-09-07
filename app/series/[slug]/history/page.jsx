import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "../../../../components/Footer";
import Breadcrumb from "../../../../components/Breadcrumb";
import products from "../../../../data/products.json";
import retired from "../../../../data/retired-items.json";
import { SERIES, getSeriesBySlug } from "../../../../data/series";
import { buildSeriesHistory, buildHistoryFaq } from "../../../../lib/series-history";
import { buildFaqLd } from "../../../../lib/hub-info";
import { DATA_UPDATED } from "../../../../lib/site-meta";

// history: true のシリーズだけ。全シリーズに出さない理由は data/series.js に書いてある。
export function generateStaticParams() {
  return SERIES.filter((s) => s.history).map((s) => ({ slug: s.slug }));
}

function load(slug) {
  const series = getSeriesBySlug(slug);
  if (!series || !series.history) return null;
  const history = buildSeriesHistory({ series, products, retired });
  if (!history || history.total === 0) return null;
  return { series, history };
}

export function generateMetadata({ params }) {
  const data = load(params.slug);
  if (!data) return { title: "ページが見つかりません | ガチャなう" };
  const { series, history } = data;
  const updated = DATA_UPDATED ? `【${DATA_UPDATED.label}更新】` : "";

  return {
    title: `${series.name}の歴代一覧｜過去〜最新の全${history.total}件 | ガチャなう`,
    description:
      `${updated}${series.name}の歴代ラインナップを一覧化。` +
      `掲載中${history.liveCount}件と掲載終了${history.pastCount}件、あわせて${history.total}件を50音順で掲載。` +
      `${history.sinceLabel ? `${history.sinceLabel}以降に確認できた分を、` : ""}掲載終了の時期つきでたどれます。`,
    alternates: { canonical: `https://gacha-now.net/series/${series.slug}/history` },
    openGraph: {
      title: `${series.name}の歴代一覧｜過去〜最新の全${history.total}件`,
      description: `${series.name}の過去ラインナップを掲載終了分までまとめた一覧。`,
    },
  };
}

export default function SeriesHistoryPage({ params }) {
  const data = load(params.slug);
  if (!data) notFound();
  const { series, history } = data;
  const { entries, brands, liveCount, pastCount, total, sinceLabel } = history;

  const faq = buildHistoryFaq({ series, history });

  const stats = [
    { label: "累計の掲載数", value: `${total}件` },
    { label: "いま掲載中", value: `${liveCount}件` },
    { label: "掲載終了", value: `${pastCount}件` },
    ...(sinceLabel ? [{ label: "収集開始", value: sinceLabel }] : []),
  ];

  const namedCount = brands.reduce((n, b) => n + b.count, 0);

  // 1件だけの作品までチップにすると60個以上並んで読めなくなる（めじるしで実測）。
  // 2件以上を出し、残りは件数だけ添える。
  const shownBrands = brands.filter((b) => b.count >= 2);
  const tailBrands = brands.length - shownBrands.length;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqLd(faq)) }}
      />

      <header className="bg-cream border-b-2 border-cream-border px-4 pt-4 pb-3">
        <Link
          href={`/series/${series.slug}`}
          className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors"
        >
          ← {series.name}の新作一覧にもどる
        </Link>
        <div className="text-center mt-2">
          <h1 className="animate-float">
            <span className="block font-pixel text-[12px] text-brand-accent">{series.name}</span>
            <span className="block font-pixel text-[10px] text-brand-sub mt-1">歴代・過去のラインナップ一覧</span>
          </h1>
        </div>
      </header>

      <main className="px-2.5 pt-3 pb-20 relative" style={{ minHeight: "calc(100vh - 120px)" }}>
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{ backgroundImage: "radial-gradient(circle, #F0E6D6 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        />

        <Breadcrumb
          items={[
            { name: "ホーム", href: "/" },
            { name: "シリーズ特集", href: "/series" },
            { name: series.name, href: `/series/${series.slug}` },
            { name: "歴代一覧" },
          ]}
        />

        <section
          className="relative z-[1] mb-5 bg-white rounded-xl border-2 border-cream-border p-4"
          style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
        >
          <h2 className="text-sm font-bold text-brand-text mb-2">{series.name}の歴代ラインナップ</h2>
          <p className="text-xs text-brand-text leading-relaxed mb-3">
            {series.name}のこれまでのラインナップを、いま掲載中のものと掲載が終わったものをあわせて{total}件まとめています。
            カプセルトイは再生産されないことがほとんどで、設置台から無くなると商品情報自体が公式サイトから消えてしまうため、
            当サイトで確認できた分を記録として残しています。
          </p>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-0 mb-1">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col py-1.5 border-b border-dotted border-cream-border">
                <dt className="text-[10px] text-brand-sub">{s.label}</dt>
                <dd className="text-xs font-bold text-brand-text mt-0.5">{s.value}</dd>
              </div>
            ))}
          </dl>

          {/* 収集できていない範囲があることを明示する。
              「全ての歴代」と書くと事実と違う（lib/series-history.js の注記）。 */}
          {sinceLabel && (
            <p className="text-[10px] text-brand-sub leading-relaxed mt-3">
              ※ 当サイトが商品情報の収集を始めた{sinceLabel}以降に掲載できた分です。
              それ以前に販売終了したものは含まれません。「掲載終了」の時期は販売終了日ではなく、
              各メーカーの新商品情報から確認できなくなった時期です。
            </p>
          )}
        </section>

        <Link
          href={`/series/${series.slug}`}
          className="relative z-[1] flex items-center gap-2 mb-5 px-4 py-3 bg-white border-2 border-brand-accent rounded-xl no-underline hover:bg-cream-dark transition-colors"
        >
          <span className="text-lg shrink-0">🎰</span>
          <span className="text-xs font-bold text-brand-text leading-snug">
            いま回せる{series.name}{liveCount}件を価格・発売週つきで見る
          </span>
          <span className="text-brand-accent text-sm shrink-0 ml-auto">→</span>
        </Link>

        {shownBrands.length > 0 && (
          <section className="relative z-[1] mb-5">
            <h2 className="text-sm font-bold text-brand-text mb-1 px-1">作品・ブランド別</h2>
            <p className="text-[10px] text-brand-sub mb-2 px-1">
              作品名を特定できた{namedCount}件のうち、2件以上ある作品です
              {tailBrands > 0 ? `（ほか1件のみの作品が${tailBrands}）` : ""}
              。各ブランドのガチャ一覧に移動できます。
            </p>
            <div className="flex flex-wrap gap-2">
              {shownBrands.map((b) => (
                <Link
                  key={b.brandSlug}
                  href={`/brand/${b.brandSlug}`}
                  className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
                >
                  {b.brand}
                  <span className="text-brand-sub ml-1">{b.count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="relative z-[1] mb-6">
          <h2 className="text-sm font-bold text-brand-text mb-1 px-1">歴代の全{total}件（50音順）</h2>
          <p className="text-[10px] text-brand-sub mb-2 px-1">
            「掲載中」は商品ページで価格・種類数・発売週を確認できます。
          </p>
          <ol className="bg-white border-2 border-cream-border rounded-xl overflow-hidden">
            {entries.map((e) => (
              <li
                key={e.key}
                className="flex items-start gap-2 px-3 py-2 border-b border-dotted border-cream-border last:border-b-0"
              >
                <span className="text-[11px] leading-relaxed flex-1">
                  {e.href ? (
                    <Link href={e.href} className="text-brand-text no-underline hover:text-brand-accent transition-colors">
                      {e.name}
                    </Link>
                  ) : (
                    <span className="text-brand-sub">{e.name}</span>
                  )}
                </span>
                {e.status === "live" ? (
                  <span className="shrink-0 text-[9px] font-bold text-brand-accent border border-brand-accent rounded px-1.5 py-0.5">
                    掲載中
                  </span>
                ) : (
                  <span className="shrink-0 text-[9px] text-brand-sub border border-cream-border rounded px-1.5 py-0.5">
                    {e.lastSeen ? `〜${e.lastSeen.slice(0, 7).replace("-", "/")}` : "掲載終了"}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section
          className="relative z-[1] bg-white rounded-xl border-2 border-cream-border p-4"
          style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
        >
          <h2 className="text-xs font-bold text-brand-text mb-1.5">{series.name}の歴代について・よくある質問</h2>
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
        </section>
      </main>

      <Footer />
    </>
  );
}
