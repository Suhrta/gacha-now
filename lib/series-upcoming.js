// シリーズの「発売予定（まだ売り場に出ていない分）」を組み立てる。
//
// 【なぜ必要か】
// GSC実測（2026-10-12取得・直近3か月／着地は /series/mejirushi）で、
// 「発売予定」意図のクエリが合計およそ2,000表示ある:
//   めじるしアクセサリー 発売予定 822imp 6.2% 7.2位 ／ めじるしアクセサリー 販売予定 220imp 3.2% 5.8位
//   めじるし 発売予定 251imp 8.0% 5.3位 ／ めじるしチャーム 発売予定 249imp 4.0% 7.5位
//   めじるしチャーム 販売予定 83imp ／ めじるしチャーム 予定 78imp ／ 目印チャーム 発売予定 69imp
//   めじるしアクセサリー 今後発売予定 33imp 24.2% 4.8位 ほか
// 着地先の /series/mejirushi は発売済みと発売前を同じ一覧に混ぜているため、
// この意図に対して専用の答えになっていない。
//
// 同じ形の先行事例が /series/[slug]/history で、9/8投入後に
// 「歴代」クエリが 4.3位・CTR13.7% まで上がった（サイト平均は7.7位・4.7%）。
// 意図ごとに専用ページを立てる型が効くことは実測で確認できている。
//
// 【データの精度について】
// 発売前かどうかの判定は lib/release.js の isReleased に寄せている。
// 2026-10-12にそこのバグ（週表記に「◯日」が無いと今月扱いで無条件に発売済みとしていた）を
// 直すまで、875件中138件が発売前なのに「発売中」と表示されていた。
// このページはその判定結果をそのまま見せるので、判定が狂うと嘘の一覧になる。
// 拡張子つきで書く（data/series.js の先頭の注記と同じ理由。素の Node ESM からも読める）。
import { filterProductsBySeries } from "../data/series.js";
import { isReleased, formatYearMonth, upcomingProducts } from "./release.js";
import { stripLeadingNote } from "./hub-info.js";

// 「10月 第4週」から見出し用の短いラベルを作る。月は見出し側に出すので落とす。
function timingLabel(releaseWeek) {
  const rw = (releaseWeek || "").trim();
  const withoutMonth = rw.replace(/^\d+月\s*/, "").trim();
  return withoutMonth || rw;
}

export function buildSeriesUpcoming({ series, products }) {
  if (!series) return null;

  const all = filterProductsBySeries(products, series);
  const { dated, undated, total } = upcomingProducts(all);
  if (total === 0) return null;

  // 発売時期ごとにまとめる。upcomingProducts が発売の早い順に並べているので
  // 出てきた順にグループを作れば、そのまま時系列になる。
  const groups = [];
  let current = null;
  for (const row of dated) {
    const key = `${row.ym}|${row.product.releaseWeek}`;
    if (!current || current.key !== key) {
      current = {
        key,
        ym: row.ym,
        monthLabel: formatYearMonth(row.ym),
        timing: timingLabel(row.product.releaseWeek),
        items: [],
      };
      groups.push(current);
    }
    current.items.push(row.product);
  }

  if (undated.length > 0) {
    groups.push({
      key: "undated",
      ym: null,
      monthLabel: null,
      timing: "発売時期の公表待ち",
      items: undated.map((r) => r.product),
    });
  }

  const liveCount = all.filter((p) => isReleased(p)).length;
  const nearest = dated.length > 0 ? dated[0] : null;

  // 「今月中に出る分」は検索者が一番知りたい数字なので別に数える。
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthCount = dated.filter((r) => r.ym === thisMonth).length;

  return {
    groups,
    total,
    datedCount: dated.length,
    undatedCount: undated.length,
    liveCount,
    thisMonthCount,
    thisMonthLabel: formatYearMonth(thisMonth),
    nearest: nearest
      ? {
          monthLabel: formatYearMonth(nearest.ym),
          timing: timingLabel(nearest.product.releaseWeek),
          name: stripLeadingNote(nearest.product.name),
        }
      : null,
  };
}

export function buildUpcomingFaq({ series, upcoming }) {
  const { total, datedCount, undatedCount, liveCount, thisMonthCount, thisMonthLabel, nearest } =
    upcoming;

  const faq = [
    {
      q: `${series.name}の次の新作はいつ？`,
      a: [
        {
          t: nearest
            ? `いちばん近いのは${nearest.monthLabel}${nearest.timing}発売の「${nearest.name}」です。発売週はメーカー公表のもので、店舗への入荷は前後することがあります。`
            : `発売時期が公表されている商品が現在ありません。公表され次第このページに反映します。`,
        },
      ],
    },
    {
      q: `これから出る${series.name}は何件ある？`,
      a: [
        {
          t: `${total}件です。うち${datedCount}件は発売時期が決まっており、${undatedCount}件はメーカーが時期を公表していません。${
            thisMonthCount > 0 ? `${thisMonthLabel}中に出るのは${thisMonthCount}件です。` : ""
          }`,
        },
      ],
    },
    {
      q: `${series.name}は予約できる？`,
      a: [
        {
          t: "カプセルトイは店頭の設置台で回す商品のため、基本的にメーカー公式の予約はありません。各商品ページから通販サイトの予約・在庫を探せます。設置店舗の探し方は",
        },
        { t: "どこで買えるガイド", href: "/blog/gachagacha-where-to-buy-guide" },
        { t: "にまとめています。" },
      ],
    },
    {
      q: `いま買える${series.name}を見たい`,
      a: [
        { t: `発売済みの${liveCount}件は` },
        { t: `${series.name}の新作一覧`, href: `/series/${series.slug}` },
        { t: "で、価格・種類数つきで確認できます。" },
      ],
    },
  ];

  return faq;
}
