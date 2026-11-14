import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "../../../components/Footer";
import Breadcrumb from "../../../components/Breadcrumb";
import ProductLinkCard from "../../../components/ProductLinkCard";
import products from "../../../data/products.json";
import { AREAS, VERIFIED_AT, getAreaBySlug, getChain, storeCount } from "../../../data/areas";
import { getReleaseYearMonth, isReleased, formatYearMonth } from "../../../lib/release";
import { buildFaqLd } from "../../../lib/hub-info";
import { DATA_UPDATED } from "../../../lib/site-meta";

// 店舗情報は手で確認したもの（data/areas.js）。商品一覧だけ毎日のデータから組む。
export const dynamicParams = false;

export function generateStaticParams() {
  return AREAS.map((a) => ({ slug: a.slug }));
}

// 「いま売り場に並んでいる今月の新作」。店に行く人が知りたいのは
// 「今行くと何が新しいか」なので、発売済みかつ今月発売のものを新しい順に出す。
// 月初で今月分がまだ少ないときは先月分で埋める。
const NEW_ITEMS_LIMIT = 8;

function currentYm() {
  if (DATA_UPDATED) return `${DATA_UPDATED.year}-${String(DATA_UPDATED.month).padStart(2, "0")}`;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function prevYm(ym) {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

function newArrivals() {
  const ym = currentYm();
  const byNewest = (a, b) => new Date(b.collectedAt) - new Date(a.collectedAt);
  const released = products.filter((p) => p.img && isReleased(p));
  const thisMonth = released.filter((p) => getReleaseYearMonth(p) === ym).sort(byNewest);
  const lastMonth = released.filter((p) => getReleaseYearMonth(p) === prevYm(ym)).sort(byNewest);
  return { ym, items: [...thisMonth, ...lastMonth].slice(0, NEW_ITEMS_LIMIT) };
}

function buildFaq(area) {
  const all = area.groups.flatMap((g) => g.stores);
  const biggest = all.filter((s) => s.machines).sort((a, b) => parseCount(b.machines) - parseCount(a.machines))[0];
  const faq = [];
  if (biggest) {
    faq.push({
      q: `${area.name}で一番大きいガチャガチャ専門店は？`,
      a: [
        {
          t:
            `各チェーンが公表している設置数では「${biggest.name}」（${biggest.machines}）が最大です。` +
            "チェーンによって「台数」「ボックス数」「面」と数え方が違うため、目安として見てください。",
        },
      ],
    });
  }
  faq.push({
    q: `${area.name}のガチャガチャ専門店は何時まで開いている？`,
    a: [
      {
        t:
          all
            .filter((s) => s.hours && !area.groups.find((g) => g.compact && g.stores.includes(s)))
            .map((s) => `${s.name}は${s.hours}`)
            .join("、") +
          "です。施設の営業時間に合わせて変わることがあるため、来店前に各店の公式情報を確認してください。",
      },
    ],
  });
  faq.push({
    q: "欲しいガチャガチャがどの店にあるか調べられる？",
    a: [
      {
        t:
          "入荷する商品は店舗ごとに異なります。ガシャポンのデパートは公式サイトやアプリで設置商品を探せます。" +
          "発売時期を確認したいときは、",
      },
      { t: "ガチャなうの発売月別一覧", href: "/release" },
      { t: "で新作の発売週をチェックできます。" },
    ],
  });
  return faq;
}

function parseCount(s) {
  const m = (s || "").replace(/,/g, "").match(/\d+/);
  return m ? Number(m[0]) : 0;
}

function pageTitle(area) {
  return `${area.name}のガチャガチャ専門店まとめ｜${storeCount(area)}店の場所・営業時間・台数`;
}

export function generateMetadata({ params }) {
  const area = getAreaBySlug(params.slug);
  if (!area) return { title: "ページが見つかりません | ガチャなう" };
  const main = area.groups.flatMap((g) => (g.compact ? [] : g.stores)).map((s) => s.name).slice(0, 2);
  return {
    title: `${pageTitle(area)} | ガチャなう`,
    description:
      `【${VERIFIED_AT.label}確認】${area.name}でガチャガチャ・カプセルトイを回せる専門店${storeCount(area)}店を、` +
      `台数・営業時間・アクセスつきでまとめました。${main.join("、")}など。今月の新作もチェックできます。`,
    alternates: { canonical: `https://gacha-now.net/area/${area.slug}` },
    openGraph: {
      title: pageTitle(area),
      description: `${area.name}のガチャガチャ専門店を台数・営業時間つきで紹介。`,
    },
  };
}

function StoreCard({ store }) {
  const chain = getChain(store.chain);
  const rows = [
    ["住所", store.address],
    ["営業時間", store.hours],
    ["規模", store.machines],
    ["アクセス", store.access],
  ].filter(([, v]) => v);
  return (
    <article className="bg-white rounded-xl border-2 border-cream-border p-4 mb-3">
      <h3 className="text-sm font-bold text-brand-text leading-snug">{store.name}</h3>
      {chain?.operator && <p className="text-[10px] text-brand-sub mt-0.5">運営: {chain.operator}</p>}
      {store.note && <p className="text-xs text-brand-text leading-relaxed mt-2">{store.note}</p>}
      <dl className="mt-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3 py-1.5 border-b border-dotted border-cream-border last:border-b-0">
            <dt className="text-[11px] text-brand-sub w-14 shrink-0">{k}</dt>
            <dd className="text-xs text-brand-text leading-relaxed">{v}</dd>
          </div>
        ))}
      </dl>
      {(store.officialUrl || chain) && (
        <a
          href={store.officialUrl || chain.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-[11px] text-brand-accent no-underline"
        >
          公式の店舗情報を見る →
        </a>
      )}
    </article>
  );
}

function CompactStore({ store }) {
  return (
    <li className="px-3 py-2 border-b border-dotted border-cream-border last:border-b-0">
      <div className="text-xs font-bold text-brand-text">{store.name}</div>
      <div className="text-[11px] text-brand-sub leading-relaxed mt-0.5">
        {[store.access, store.machines, store.hours].filter(Boolean).join("・")}
      </div>
    </li>
  );
}

export default function AreaPage({ params }) {
  const area = getAreaBySlug(params.slug);
  if (!area) notFound();
  const faq = buildFaq(area);
  const { ym, items } = newArrivals();
  const others = AREAS.filter((a) => a.slug !== area.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqLd(faq)) }}
      />

      <header className="bg-cream border-b-2 border-cream-border px-4 pt-4 pb-3">
        <Link
          href="/"
          className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors"
        >
          ← ガチャなう トップにもどる
        </Link>
        <div className="text-center mt-2">
          <h1 className="animate-float">
            <span className="block font-pixel text-[12px] text-brand-accent">{pageTitle(area)}</span>
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
            { name: "エリア別の専門店", href: "/area" },
            { name: area.name },
          ]}
        />

        <section
          className="relative z-[1] mb-5 bg-white rounded-xl border-2 border-cream-border p-4"
          style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
        >
          <h2 className="text-sm font-bold text-brand-text mb-2">{area.name}でガチャガチャを回すなら</h2>
          <p className="text-xs text-brand-text leading-relaxed">{area.lead}</p>
          <ul className="mt-3 space-y-1.5">
            {area.tips.map((t) => (
              <li key={t} className="text-xs text-brand-text leading-relaxed pl-3 relative">
                <span className="absolute left-0 text-brand-accent">・</span>
                {t}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-brand-sub leading-relaxed mt-3">
            ※店舗情報は{VERIFIED_AT.label}に各チェーンの公式店舗一覧で確認したものです。
            営業時間・台数は変わることがあるため、来店前に公式情報もご確認ください。
          </p>
        </section>

        {area.groups.map((g) => (
          <section key={g.title} className="relative z-[1] mb-5">
            <h2 className="text-sm font-bold text-brand-text mb-2 px-1">
              {g.title}
              <span className="text-brand-sub font-normal ml-2 text-xs">{g.stores.length}店</span>
            </h2>
            {g.compact ? (
              <ul className="bg-white border-2 border-cream-border rounded-xl overflow-hidden">
                {g.stores.map((s) => (
                  <CompactStore key={s.name} store={s} />
                ))}
              </ul>
            ) : (
              g.stores.map((s) => <StoreCard key={s.name} store={s} />)
            )}
          </section>
        ))}

        {items.length > 0 && (
          <section className="relative z-[1] mb-5">
            <h2 className="text-sm font-bold text-brand-text mb-1 px-1">いま売り場に並んでいる新作</h2>
            <p className="text-[11px] text-brand-sub leading-relaxed mb-2 px-1">
              最近発売されたガチャガチャです。入荷は店舗ごとに異なります。
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {items.map((p) => (
                <ProductLinkCard key={p.id} product={p} />
              ))}
            </div>
            <Link
              href={`/release/${ym}`}
              className="flex items-center gap-2 mt-3 px-4 py-3 bg-white border-2 border-brand-accent rounded-xl no-underline hover:bg-cream-dark transition-colors"
            >
              <span className="text-lg shrink-0">🎰</span>
              <span className="text-xs font-bold text-brand-text leading-snug">
                {formatYearMonth(ym)}発売のガチャガチャをすべて見る
              </span>
              <span className="text-brand-accent text-sm shrink-0 ml-auto">→</span>
            </Link>
          </section>
        )}

        <section
          className="relative z-[1] mb-5 bg-white rounded-xl border-2 border-cream-border p-4"
          style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
        >
          <h2 className="text-xs font-bold text-brand-text mb-1.5">{area.name}のガチャガチャ専門店・よくある質問</h2>
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

        <nav className="relative z-[1] flex flex-wrap gap-2 px-1">
          <span className="text-[11px] text-brand-sub">ほかのエリア:</span>
          {others.map((a) => (
            <Link key={a.slug} href={`/area/${a.slug}`} className="text-[11px] text-brand-accent no-underline">
              {a.name}のガチャガチャ専門店
            </Link>
          ))}
        </nav>
      </main>

      <Footer />
    </>
  );
}
