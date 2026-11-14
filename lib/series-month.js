// シリーズページの「今月発売の◯◯」欄（/series/[slug] の中の1セクション）。
//
// 2026-11-14のGA4実測（Search Console連携、10/17〜11/11）で、めじるしの月別クエリが
// メインクエリ（3位前後）より明確に低いまま残っていた:
//   11月 めじるしアクセサリー 225imp 9.1位 ／ 10月めじるしチャーム 315imp 8.1位 ／
//   めじ る しアクセサリー 11月 165imp 8.5位 ／ めじるしチャーム11月 101imp 8.2位 ほか
// 10/12に入れた発売予定ページ（/upcoming）はこの意図を拾えていなかった。
// ページ内に「◯月発売」とまとまった答えが無いのが原因と見て、
// 別ページを増やさず、メインのページに今月分を発売週ごとに並べる。
//
// 月は releaseWeek から取る。「発売中」としか書かれていない商品は月が分からないので
// 入れない（[[release-week-shape]]。めじるしは139件中40件が11月と分かる）。
import { filterProductsBySeries } from "../data/series.js";
import { getReleaseYearMonth } from "./release.js";

function timingLabel(releaseWeek) {
  const rw = (releaseWeek || "").trim();
  return rw.replace(/^\d+月\s*/, "").trim() || "発売週未定";
}

// 「第3週」「16日週」「下旬」などを並べ替え用の日に直す（lib/release.js と同じ解釈）
function startDay(label) {
  const day = label.match(/(\d+)日/);
  if (day) return parseInt(day[1], 10);
  const week = label.match(/第(\d+)週/);
  if (week) return (parseInt(week[1], 10) - 1) * 7 + 1;
  if (label.includes("上旬")) return 1;
  if (label.includes("中旬")) return 11;
  if (label.includes("下旬")) return 21;
  return 99;
}

export function buildMonthLineup({ series, products, ym }) {
  if (!series || !series.monthly || !ym) return null;
  const items = filterProductsBySeries(products, series).filter((p) => getReleaseYearMonth(p) === ym);
  // 数件しか無い月は欄を出さない（見出しだけ立派で中身の薄い欄になる）
  if (items.length < 5) return null;

  const byTiming = new Map();
  for (const p of items) {
    const t = timingLabel(p.releaseWeek);
    if (!byTiming.has(t)) byTiming.set(t, []);
    byTiming.get(t).push({ id: p.id, name: p.name, price: p.price });
  }
  const groups = [...byTiming.entries()]
    .map(([timing, list]) => ({ timing, items: list }))
    .sort((a, b) => startDay(a.timing) - startDay(b.timing));

  const month = Number(ym.split("-")[1]);
  return { ym, month, total: items.length, groups };
}
