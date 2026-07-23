import Link from "next/link";
import products from "../../data/products.json";

export const metadata = {
  title: "ガチャガチャ ブランド・作品一覧｜サンリオ・ポケモン・ちいかわ ほか | ガチャなう",
  description:
    "サンリオ・ポケモン・ちいかわ・たまごっちなど、ガチャガチャ（カプセルトイ）のブランド・作品を一覧でまとめました。ブランドごとに最新作・発売中の商品をチェックできます。",
  alternates: { canonical: "https://gacha-now.net/brand" },
};

// 商品が2件以上あるブランドを商品数順に。トップページの導線と同じ基準。
function getBrandList() {
  return Object.values(
    products.reduce((acc, p) => {
      if (!p.brandSlug || p.brand === "その他") return acc;
      if (!acc[p.brandSlug]) acc[p.brandSlug] = { slug: p.brandSlug, name: p.brand, count: 0 };
      acc[p.brandSlug].count += 1;
      return acc;
    }, {})
  )
    .filter((b) => b.count >= 2)
    .sort((a, b) => b.count - a.count);
}

export default function BrandIndexPage() {
  const list = getBrandList();

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <Link href="/" className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
        ← トップにもどる
      </Link>

      <div className="mt-6 text-center">
        <h1 className="font-pixel text-[14px] text-brand-accent">🏭 ブランド・作品から探す</h1>
        <p className="font-pixel text-[10px] text-brand-sub mt-2 tracking-[1px]">
          ぜんぶで {list.length} ブランド
        </p>
      </div>

      <p className="text-xs text-brand-text leading-relaxed mt-6 mb-5">
        ガチャガチャは<strong className="font-bold">作品・ブランドごとに新作が展開されます</strong>。推しのブランドを選ぶと、そのブランドの発売中・発売予定の商品をまとめて確認できます。
      </p>

      <div className="flex flex-wrap gap-2">
        {list.map((b) => (
          <Link
            key={b.slug}
            href={`/brand/${b.slug}`}
            className="px-3 py-2 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
          >
            {b.name}
            <span className="text-[10px] text-brand-sub ml-1.5">{b.count}</span>
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
