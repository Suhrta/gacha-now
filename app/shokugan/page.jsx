import Link from "next/link";
import Footer from "../../components/Footer";
import Breadcrumb from "../../components/Breadcrumb";
import ShokuganCard from "../../components/ShokuganCard";
import shokugan from "../../data/shokugan.json";
import {
  isPublishable,
  upcoming,
  released,
  byReleaseAsc,
  imageFirst,
  byCollectedDesc,
  releaseMonths,
  releaseLabel,
  PAGE_SIZE,
} from "../../lib/shokugan";
import { DATA_UPDATED } from "../../lib/site-meta";

// 掲載に足るものだけを対象にする。紹介文も価格も無い商品はテンプレートだけの
// ページになるので出さない（lib/quality.js の isLowValueProduct と同じ考え方）。
const items = shokugan.filter(isPublishable);

export function generateMetadata() {
  const stamp = DATA_UPDATED ? `【${DATA_UPDATED.label}更新】` : "";
  const soon = upcoming(items).sort(imageFirst(byReleaseAsc));
  const next = soon[0];

  return {
    title: `食玩の新作・発売予定一覧【${DATA_UPDATED ? DATA_UPDATED.year : 2026}年最新】| ガチャなう`,
    description:
      `${stamp}バンダイのウエハース・シール付きなど食玩の新作${items.length}件を発売日順に掲載。` +
      (next ? `次は${releaseLabel(next)}の「${next.name}」。` : "") +
      `価格・発売日・通販の在庫をまとめて確認できます。`,
    alternates: { canonical: "https://gacha-now.net/shokugan" },
    openGraph: {
      title: `食玩の新作・発売予定一覧【${DATA_UPDATED ? DATA_UPDATED.year : 2026}年最新】`,
      description: `ウエハース・シール付きなど食玩の新作情報を価格・発売日つきで一覧表示。`,
    },
  };
}

export default function ShokuganPage() {
  // 同じ発売日の中では画像のある商品を先に出す（lib/shokugan.js の imageFirst）。
  const soon = upcoming(items).sort(imageFirst(byReleaseAsc)).slice(0, PAGE_SIZE);
  const latest = released(items).sort(imageFirst(byCollectedDesc)).slice(0, PAGE_SIZE);
  const months = releaseMonths(items);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "食玩の新作一覧",
    numberOfItems: items.length,
    itemListElement: items.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://gacha-now.net/shokugan/${p.id}`,
      name: p.name,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      <header className="bg-cream border-b-2 border-cream-border px-4 pt-4 pb-3">
        <Link
          href="/"
          className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors"
        >
          ← トップにもどる
        </Link>
        <div className="text-center mt-2">
          <h1 className="animate-float">
            <span className="block font-pixel text-[12px] text-brand-accent">食玩</span>
            <span className="block font-pixel text-[10px] text-brand-sub mt-1">新作・発売予定一覧</span>
          </h1>
        </div>
      </header>

      <main className="px-2.5 pt-3 pb-20 relative" style={{ minHeight: "calc(100vh - 120px)" }}>
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: "radial-gradient(circle, #F0E6D6 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "食玩" }]} />

        {months.length > 0 && (
          <section className="relative z-[1] mb-5">
            <h2 className="text-sm font-bold text-brand-text mb-2 px-1">発売月から探す</h2>
            <div className="flex flex-wrap gap-2">
              {months.map((ym) => {
                const [y, m] = ym.split("-").map(Number);
                return (
                  <Link
                    key={ym}
                    href={`/shokugan/release/${ym}`}
                    className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
                  >
                    {y}年{m}月
                    <span className="text-brand-sub ml-1">
                      {items.filter((i) => i.releaseYm === ym).length}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {soon.length > 0 && (
          <section className="relative z-[1] mb-6">
            <h2 className="text-sm font-bold text-brand-text mb-1 px-1">これから発売される食玩</h2>
            <p className="text-[10px] text-brand-sub mb-2 px-1">発売日の早い順に{soon.length}件</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {soon.map((item) => (
                <ShokuganCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {latest.length > 0 && (
          <section className="relative z-[1] mb-6">
            <h2 className="text-sm font-bold text-brand-text mb-1 px-1">発売中の食玩</h2>
            <p className="text-[10px] text-brand-sub mb-2 px-1">新しく掲載した順に{latest.length}件</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {latest.map((item) => (
                <ShokuganCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* 解説は一覧の下。/series/* が components/SeriesDetail.jsx で
            「グリッド → HubInfo」の順にしているのに揃えた。
            スマホで最初に出るのが説明文だと、商品にたどり着くまで1画面ぶん読まされる。 */}
        <section
          className="relative z-[1] mb-5 bg-white rounded-xl border-2 border-cream-border p-4"
          style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
        >
          <h2 className="text-base font-bold text-brand-text mb-2">食玩とは</h2>
          <p className="text-base text-brand-text leading-relaxed mb-3">
            食玩は、お菓子といっしょに玩具やカードが入った商品です。ウエハースにシールが付いたもの、
            グミとマスコットの組み合わせ、組み立て式のフィギュアなど種類は幅広く、
            スーパーやコンビニのお菓子売り場で買えます。
            ガチャガチャと違って専用の販売機を探す必要がなく、欲しい商品を選んで買えるのが特徴です。
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-0">
            <div className="flex flex-col py-1.5 border-b border-dotted border-cream-border">
              <dt className="text-xs text-brand-sub">掲載数</dt>
              <dd className="text-sm font-bold text-brand-text mt-0.5">{items.length}件</dd>
            </div>
            <div className="flex flex-col py-1.5 border-b border-dotted border-cream-border">
              <dt className="text-xs text-brand-sub">発売予定</dt>
              <dd className="text-sm font-bold text-brand-text mt-0.5">{upcoming(items).length}件</dd>
            </div>
          </dl>
          <p className="text-xs text-brand-sub leading-relaxed mt-3">
            ※ バンダイ キャンディ事業部の商品を掲載しています。発売日はメーカー公表のもので、
            店頭への入荷は前後することがあります。
          </p>
        </section>

        <Link
          href="/"
          className="relative z-[1] flex items-center gap-2 px-4 py-3 bg-white border-2 border-brand-accent rounded-xl no-underline hover:bg-cream-dark transition-colors"
        >
          <span className="text-lg shrink-0">🎰</span>
          <span className="text-xs font-bold text-brand-text leading-snug">
            ガチャガチャの新作もチェックする
          </span>
          <span className="text-brand-accent text-sm shrink-0 ml-auto">→</span>
        </Link>
      </main>

      <Footer />
    </>
  );
}
