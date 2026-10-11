import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "../../../../components/Footer";
import Breadcrumb from "../../../../components/Breadcrumb";
import products from "../../../../data/products.json";
import { SERIES, getSeriesBySlug } from "../../../../data/series";
import { buildSeriesUpcoming, buildUpcomingFaq } from "../../../../lib/series-upcoming";
import { buildFaqLd } from "../../../../lib/hub-info";
import { DATA_UPDATED } from "../../../../lib/site-meta";

// upcoming: true のシリーズだけ。歴代ページと同じ方針で、
// GSCで「発売予定」意図の表示回数が確認できたものにだけ付ける（data/series.js に理由）。
export function generateStaticParams() {
  return SERIES.filter((s) => s.upcoming).map((s) => ({ slug: s.slug }));
}

function load(slug) {
  const series = getSeriesBySlug(slug);
  if (!series || !series.upcoming) return null;
  const upcoming = buildSeriesUpcoming({ series, products });
  // 発売前の商品が1件も無い時期は、空ページを出さず404にする。
  // 「発売予定0件」のページはSERPに出ても価値が無く、薄いページとして残るだけ。
  if (!upcoming) return null;
  return { series, upcoming };
}

export function generateMetadata({ params }) {
  const data = load(params.slug);
  if (!data) return { title: "ページが見つかりません | ガチャなう" };
  const { series, upcoming } = data;
  const stamp = DATA_UPDATED ? `【${DATA_UPDATED.label}更新】` : "";

  // タイトルは検索語（◯◯ 発売予定）を先頭に、件数を具体で出す。
  // 「今後出る全◯件」は歴代ページの「過去〜最新の全◯件」と対の形。
  return {
    title: `${series.name}の発売予定｜これから出る全${upcoming.total}件 | ガチャなう`,
    description:
      `${stamp}${series.name}のこれから発売される${upcoming.total}件を発売時期順に掲載。` +
      (upcoming.nearest
        ? `次は${upcoming.nearest.monthLabel}${upcoming.nearest.timing}発売の「${upcoming.nearest.name}」。`
        : "") +
      (upcoming.thisMonthCount > 0
        ? `${upcoming.thisMonthLabel}中に${upcoming.thisMonthCount}件が登場します。`
        : "") +
      `発売時期未定の${upcoming.undatedCount}件もあわせて確認できます。`,
    alternates: { canonical: `https://gacha-now.net/series/${series.slug}/upcoming` },
    openGraph: {
      title: `${series.name}の発売予定｜これから出る全${upcoming.total}件`,
      description: `${series.name}の次の新作を発売時期順にまとめた一覧。`,
    },
  };
}

export default function SeriesUpcomingPage({ params }) {
  const data = load(params.slug);
  if (!data) notFound();
  const { series, upcoming } = data;
  const { groups, total, datedCount, undatedCount, liveCount, thisMonthCount, thisMonthLabel } =
    upcoming;

  const faq = buildUpcomingFaq({ series, upcoming });

  const stats = [
    { label: "発売予定", value: `${total}件` },
    { label: "発売時期が確定", value: `${datedCount}件` },
    ...(thisMonthCount > 0 ? [{ label: `${thisMonthLabel}中に発売`, value: `${thisMonthCount}件` }] : []),
    { label: "時期未定", value: `${undatedCount}件` },
  ];

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
            <span className="block font-pixel text-[10px] text-brand-sub mt-1">発売予定・これから出るラインナップ</span>
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
            { name: "発売予定" },
          ]}
        />

        <section
          className="relative z-[1] mb-5 bg-white rounded-xl border-2 border-cream-border p-4"
          style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
        >
          <h2 className="text-sm font-bold text-brand-text mb-2">{series.name}のこれからの発売予定</h2>
          <p className="text-xs text-brand-text leading-relaxed mb-3">
            {series.name}のうち、まだ売り場に出ていない{total}件を発売時期の早い順にまとめています。
            発売週はメーカーが公表しているもので、店舗への入荷は前後することがあります。
          </p>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-0 mb-1">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col py-1.5 border-b border-dotted border-cream-border">
                <dt className="text-[10px] text-brand-sub">{s.label}</dt>
                <dd className="text-xs font-bold text-brand-text mt-0.5">{s.value}</dd>
              </div>
            ))}
          </dl>

          <p className="text-[10px] text-brand-sub leading-relaxed mt-3">
            ※「時期未定」はメーカーが商品情報を公開済みで、発売時期だけまだ公表していないものです。
            時期が判明し次第このページに反映します。
          </p>
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

        {groups.map((g) => (
          <section key={g.key} className="relative z-[1] mb-5">
            <h2 className="text-sm font-bold text-brand-text mb-1 px-1">
              {g.monthLabel ? `${g.monthLabel}${g.timing}` : g.timing}
              <span className="text-brand-sub font-normal ml-2 text-xs">{g.items.length}件</span>
            </h2>
            <ol className="bg-white border-2 border-cream-border rounded-xl overflow-hidden">
              {g.items.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start gap-2 px-3 py-2 border-b border-dotted border-cream-border last:border-b-0"
                >
                  <span className="text-[11px] leading-relaxed flex-1">
                    <Link
                      href={`/item/${p.id}`}
                      className="text-brand-text no-underline hover:text-brand-accent transition-colors"
                    >
                      {p.name}
                    </Link>
                  </span>
                  {typeof p.price === "number" && p.price > 0 && (
                    <span className="shrink-0 text-[9px] text-brand-sub border border-cream-border rounded px-1.5 py-0.5">
                      ¥{p.price}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}

        {series.history && (
          <Link
            href={`/series/${series.slug}/history`}
            className="relative z-[1] flex items-center gap-2 mb-5 px-4 py-3 bg-white border-2 border-cream-border rounded-xl no-underline hover:border-brand-accent transition-colors"
          >
            <span className="text-lg shrink-0">📚</span>
            <span className="text-xs font-bold text-brand-text leading-snug">
              過去に出た{series.name}の歴代一覧を見る
            </span>
            <span className="text-brand-accent text-sm shrink-0 ml-auto">→</span>
          </Link>
        )}

        <section
          className="relative z-[1] bg-white rounded-xl border-2 border-cream-border p-4"
          style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
        >
          <h2 className="text-xs font-bold text-brand-text mb-1.5">{series.name}の発売予定について・よくある質問</h2>
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
