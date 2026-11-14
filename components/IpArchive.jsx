// ブランドページの「これまでに発売された◯◯のガチャ」欄。
// データは scripts/collect-ip-archive.js がガシャポン公式の検索から集める（理由もそこに）。
// 掲載中の商品は自サイトの商品ページへ、掲載が終わった商品は公式の商品ページへ送る。
// 古い商品1件ごとのページは作らない（中身の薄いページを量産しない）。
import Link from "next/link";
import archive from "../data/ip-archive.json";

export function getIpArchive(slug, products) {
  const entry = archive[slug];
  if (!entry || !entry.items || entry.items.length === 0) return null;
  const listed = new Map();
  for (const p of products) {
    const jan = (p.sourceUrl || "").match(/jan_code=(\d+)/);
    if (jan) listed.set(jan[1], p.id);
  }
  const items = entry.items
    .map((i) => ({ ...i, itemId: listed.get(i.jan) || null }))
    .sort((a, b) => (b.ym || "").localeCompare(a.ym || ""));
  const byYear = new Map();
  for (const i of items) {
    const y = i.ym ? i.ym.slice(0, 4) : "発売時期不明";
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(i);
  }
  return {
    total: items.length,
    checkedAt: entry.checkedAt,
    years: [...byYear.entries()].map(([year, list]) => ({ year, items: list })),
  };
}

function monthLabel(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}

function Row({ item }) {
  const body = (
    <>
      {item.img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.img}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          className="w-12 h-12 shrink-0 rounded-md object-cover bg-cream"
        />
      ) : (
        <span className="w-12 h-12 shrink-0 rounded-md bg-cream" />
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] text-brand-text leading-snug">{item.name}</span>
        <span className="block text-[10px] text-brand-sub mt-0.5">
          {monthLabel(item.ym)}
          {item.price ? ` ・ ¥${item.price}` : ""}
          {item.itemId ? (
            <span className="ml-1.5 px-1.5 py-px rounded bg-brand-accent text-white text-[9px]">掲載中</span>
          ) : null}
        </span>
      </span>
    </>
  );
  const cls = "flex items-center gap-2.5 py-2 no-underline hover:opacity-80 transition-opacity";
  return (
    <li className="border-b border-dotted border-cream-border last:border-b-0">
      {item.itemId ? (
        <Link href={`/item/${item.itemId}`} className={cls}>
          {body}
        </Link>
      ) : (
        <a
          href={`https://gashapon.jp/products/detail.php?jan_code=${item.jan}`}
          target="_blank"
          rel="noopener"
          className={cls}
        >
          {body}
        </a>
      )}
    </li>
  );
}

export default function IpArchive({ name, archive }) {
  if (!archive) return null;
  return (
    <section
      id="archive"
      className="relative z-[1] mt-6 bg-white rounded-xl border-2 border-cream-border p-4 scroll-mt-4"
    >
      <h2 className="text-sm font-bold text-brand-text mb-1">
        これまでに発売された{name}のガチャ（{archive.total}件）
      </h2>
      <p className="text-[11px] text-brand-sub leading-relaxed mb-3">
        バンダイ（ガシャポン）から発売された{name}のガチャを、新しい順にまとめています。
        掲載が終わった商品は公式の商品ページにつながります。
      </p>
      {archive.years.map((g) => (
        <div key={g.year} className="mb-3 last:mb-0">
          <h3 className="text-xs font-bold text-brand-text mt-3 mb-0.5">
            {g.year === "発売時期不明" ? g.year : `${g.year}年`}
            <span className="text-brand-sub font-normal ml-2">{g.items.length}件</span>
          </h3>
          <ul>
            {g.items.map((i) => (
              <Row key={i.jan} item={i} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
