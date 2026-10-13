import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "../../../../components/Footer";
import Breadcrumb from "../../../../components/Breadcrumb";
import ShokuganCard from "../../../../components/ShokuganCard";
import shokugan from "../../../../data/shokugan.json";
import {
  isPublishable,
  isReleased,
  releaseLabel,
  releaseMonths,
  byReleaseAsc,
} from "../../../../lib/shokugan";
import { DATA_UPDATED } from "../../../../lib/site-meta";

const items = shokugan.filter(isPublishable);

export function generateStaticParams() {
  return releaseMonths(items).map((month) => ({ month }));
}

export const dynamicParams = false;

function load(month) {
  const list = items.filter((i) => i.releaseYm === month).sort(byReleaseAsc);
  if (list.length === 0) return null;
  const [y, m] = month.split("-").map(Number);
  return { list, year: y, month: m };
}

export function generateMetadata({ params }) {
  const data = load(params.month);
  if (!data) return { title: "ページが見つかりません | ガチャなう" };
  const { list, year, month } = data;
  const stamp = DATA_UPDATED ? `【${DATA_UPDATED.label}更新】` : "";
  const first = list[0];

  return {
    title: `${year}年${month}月発売の食玩一覧｜全${list.length}件 | ガチャなう`,
    description:
      `${stamp}${year}年${month}月に発売される食玩${list.length}件を発売日順に掲載。` +
      (first ? `${releaseLabel(first)}の「${first.name}」から。` : "") +
      `価格・発売日・通販の在庫をまとめて確認できます。`,
    alternates: { canonical: `https://gacha-now.net/shokugan/release/${params.month}` },
    openGraph: {
      title: `${year}年${month}月発売の食玩一覧｜全${list.length}件`,
      description: `${year}年${month}月の食玩新作を価格・発売日つきで一覧表示。`,
    },
  };
}

export default function ShokuganMonthPage({ params }) {
  const data = load(params.month);
  if (!data) notFound();
  const { list, year, month } = data;

  const months = releaseMonths(items);
  const upcomingCount = list.filter((i) => !isReleased(i)).length;

  return (
    <>
      <header className="bg-cream border-b-2 border-cream-border px-4 pt-4 pb-3">
        <Link
          href="/shokugan"
          className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors"
        >
          ← 食玩の一覧にもどる
        </Link>
        <div className="text-center mt-2">
          <h1 className="animate-float">
            <span className="block font-pixel text-[12px] text-brand-accent">
              {year}年{month}月の食玩
            </span>
            <span className="block font-pixel text-[10px] text-brand-sub mt-1">
              発売日順・全{list.length}件
            </span>
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

        <Breadcrumb
          items={[
            { name: "ホーム", href: "/" },
            { name: "食玩", href: "/shokugan" },
            { name: `${year}年${month}月` },
          ]}
        />

        <section
          className="relative z-[1] mb-5 bg-white rounded-xl border-2 border-cream-border p-4"
          style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
        >
          <p className="text-xs text-brand-text leading-relaxed">
            {year}年{month}月に発売される食玩を{list.length}件、発売日の早い順にまとめています。
            {upcomingCount > 0 ? `このうち${upcomingCount}件はまだ発売前です。` : ""}
            発売日はメーカー公表のもので、店頭への入荷は前後することがあります。
          </p>
        </section>

        <section className="relative z-[1] mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {list.map((item) => (
              <ShokuganCard key={item.id} item={item} />
            ))}
          </div>
        </section>

        {months.length > 1 && (
          <section className="relative z-[1]">
            <h2 className="text-sm font-bold text-brand-text mb-2 px-1">ほかの月</h2>
            <div className="flex flex-wrap gap-2">
              {months
                .filter((ym) => ym !== params.month)
                .map((ym) => {
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
      </main>

      <Footer />
    </>
  );
}
