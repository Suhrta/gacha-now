// シリーズの「歴代（掲載終了分を含む全ラインナップ）」を組み立てる。
//
// 【なぜ必要か】
// GSC実測（2026-09-07・直近28日／着地は /series/mejirushi）で、
// 「歴代・過去」意図のクエリが合計およそ1,270表示あった:
//   歴代めじるしアクセサリー 491imp 6.3% 7.3位 / めじるしアクセサリー 歴代 202imp 9.4% 6.1位
//   めじるしアクセサリー歴代 161imp 8.8% / めじるし アクセサリー歴代 115imp 8.7%
//   めじ る しアクセサリー 一覧 過去 65imp 15.4% 5.2位 …
// 平均6位・CTR6〜9%と、このサイトでは高い水準（[[gsc-baseline]] の5位以内=7〜13%）で
// 噛み合っているのに、着地先は掲載中105件しか出していない。
// 過去分は data/retired-items.json に132件あり、これまで next.config.js が
// 301リダイレクトの送り先を決めるためだけに読んでいた。現行と合わせて237件になる。
//
// 【データの範囲に注意】
// retired-items.json は「products.json から消えた商品」をgit履歴から復元したもので、
// 最も古い lastSeen が 2026-03-02。それ以前に販売されたものは持っていない。
// ページ側では必ず収集開始時期を明示すること。「全ての歴代」と書くと事実と違う。
import { filterProductsBySeries } from "../data/series";
import { GENERIC_BRANDS } from "./quality";
import { formatYearMonth } from "./release";
import { stripLeadingNote } from "./hub-info";

function yearMonth(iso) {
  return typeof iso === "string" && iso.length >= 7 ? iso.slice(0, 7) : null;
}

// 並べ替え用のキー。商品名の頭に付く販路の但し書きや引用符を落とす。
// これを外さないと【ガシャポンバンダイオフィシャルショップ限定再販】…や
// “ディズニーキャラクター”… が先頭に固まって、50音順として読めなくなる。
function sortKey(name) {
  return stripLeadingNote(name || "")
    .replace(/^["'“”„‘’「『]+/, "")
    .trim();
}

export function buildSeriesHistory({ series, products, retired }) {
  if (!series) return null;

  const live = filterProductsBySeries(products, series);
  const re = new RegExp(series.pattern);

  // 一度 products.json から消えた商品が再入荷で戻ることがあり、
  // その場合は両方に同名で存在する（めじるしで実測16件）。掲載中を正とする。
  //
  // 「消える→再掲載→また消える」を繰り返した商品は retired 側にも同名で
  // 複数残る（例: A Netflix Series: ONE PIECE めじるしアクセサリー が
  // 〜2026/03 と 〜2026/06 の2件）。歴代一覧では同じ商品なので1件にまとめ、
  // いちばん新しく確認できた時期を採る。
  const liveNames = new Set(live.map((p) => p.name));
  const matchedRetired = retired.filter((p) => re.test(p.name || ""));
  const pastByName = new Map();
  for (const p of matchedRetired) {
    if (liveNames.has(p.name)) continue;
    const prev = pastByName.get(p.name);
    if (!prev || (p.lastSeen || "") > (prev.lastSeen || "")) pastByName.set(p.name, p);
  }
  const past = [...pastByName.values()];

  const entries = [
    ...live.map((p) => ({
      key: `live-${p.id}`,
      name: p.name,
      brand: p.brand,
      brandSlug: p.brandSlug,
      href: `/item/${p.id}`,
      status: "live",
    })),
    ...past.map((p) => ({
      key: `past-${p.id}`,
      name: p.name,
      brand: p.brand,
      brandSlug: p.brandSlug,
      // 「販売終了日」ではなく「当サイトで最後に確認できた日」。表記もそう書く。
      lastSeen: p.lastSeen,
      status: "past",
    })),
  ].sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name), "ja"));

  // ブランド（作品）別の件数。ブランドが判定できていないものは数えない。
  // retired 側は収集当時の BRAND_MAP で凍結されているため未判定が多く残る
  // （めじるしの過去132件中86件が「その他」。[[brand-map-bottleneck]]）。
  const counts = new Map();
  for (const e of entries) {
    if (!e.brand || GENERIC_BRANDS.has(e.brand) || !e.brandSlug) continue;
    const cur = counts.get(e.brand) || { brand: e.brand, brandSlug: e.brandSlug, count: 0 };
    cur.count += 1;
    counts.set(e.brand, cur);
  }
  const brands = [...counts.values()].sort(
    (a, b) => b.count - a.count || a.brand.localeCompare(b.brand, "ja")
  );

  // 収集できている範囲の開始月。掲載中の collectedAt と過去の lastSeen の最小値。
  // past ではなく重複排除前の matchedRetired から取る。past は同名で新しい方を
  // 残すため、いちばん古い記録（めじるしなら2026-03）が落ちて範囲を短く見せてしまう。
  const dates = [
    ...live.map((p) => yearMonth(p.collectedAt)),
    ...matchedRetired.map((p) => yearMonth(p.lastSeen)),
  ].filter(Boolean);
  const since = dates.length ? dates.sort()[0] : null;

  return {
    entries,
    brands,
    liveCount: live.length,
    pastCount: past.length,
    total: entries.length,
    since,
    sinceLabel: since ? formatYearMonth(since) : null,
  };
}

export function buildHistoryFaq({ series, history }) {
  const { total, liveCount, pastCount, sinceLabel } = history;
  const range = sinceLabel ? `${sinceLabel}以降に当サイトで確認できた範囲で` : "";

  return [
    {
      q: `${series.name}は今までに何種類出ている？`,
      a: [
        {
          t: `${range}${total}件です（掲載中 ${liveCount}件／掲載終了 ${pastCount}件）。1商品あたり数種のラインナップがあるため、単品の総数はこれを上回ります。`,
        },
      ],
    },
    {
      q: `過去の${series.name}は今も買える？`,
      a: [
        {
          t: "カプセルトイは基本的に再生産されず、設置台から無くなり次第終了です。掲載終了分は通販やフリマの在庫を探すことになります。現在ガチャガチャ本体を回せる場所は",
        },
        { t: "どこで買えるガイド", href: "/blog/gachagacha-where-to-buy-guide" },
        { t: "にまとめています。" },
      ],
    },
    {
      q: `いま回せる${series.name}を見たい`,
      a: [
        { t: `掲載中の${liveCount}件は` },
        { t: `${series.name}の新作一覧`, href: `/series/${series.slug}` },
        { t: "で、価格・種類数・発売週つきで確認できます。" },
      ],
    },
  ];
}
