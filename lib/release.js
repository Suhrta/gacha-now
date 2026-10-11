// releaseWeek（例: "6月 22日週", "6月 上旬", "発売中", "未定"）には年がないため、
// collectedAt（収集日時）に近い年月として解釈する
export function getReleaseYearMonth(product) {
  const m = (product.releaseWeek || "").match(/(\d+)月/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const collected = product.collectedAt ? new Date(product.collectedAt) : new Date();
  let year = collected.getFullYear();
  const diff = month - (collected.getMonth() + 1);
  if (diff < -6) year += 1;
  if (diff > 6) year -= 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatYearMonth(ym) {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}

// releaseWeek が示す「その月の何日から売り場に出るか」。
//
// 収集元の表記は7種類しかない（2026-10-12に全875件で実測）:
//   発売中 571 / 未定 103 / M月 第5週 56 / M月 第4週 49 / M月 下旬 32 /
//   M月 第3週 23 / M月 D日週 21 / M月 20
// 「第N週」は第1週=1〜7日として扱う。旬は上旬=1 / 中旬=11 / 下旬=21。
// 月だけで週が無いものは月初扱い（それ以上の情報が無いため）。
function releaseStartDay(releaseWeek) {
  const rw = releaseWeek || "";
  const day = rw.match(/(\d+)日/);
  if (day) return parseInt(day[1], 10);
  const week = rw.match(/第(\d+)週/);
  if (week) return (parseInt(week[1], 10) - 1) * 7 + 1;
  if (rw.includes("上旬")) return 1;
  if (rw.includes("中旬")) return 11;
  if (rw.includes("下旬")) return 21;
  return 1;
}

export function isReleased(product) {
  const rw = product.releaseWeek || "";
  if (rw === "発売中") return true;
  const ym = getReleaseYearMonth(product);
  if (!ym) return false;
  const [y, m] = ym.split("-").map(Number);
  const now = new Date();
  const relIndex = y * 12 + m;
  const nowIndex = now.getFullYear() * 12 + (now.getMonth() + 1);
  if (relIndex !== nowIndex) return relIndex < nowIndex;
  // 発売月が今月のときは「日」まで見る。
  //
  // 以前はここで週表記を見ておらず、「◯日」を含まない表記（第N週・下旬など）を
  // 無条件に発売済みとして返していた。2026-10-12時点で875件中138件が該当し、
  // まだ売り場に無い商品が商品ページで「発売中」と表示されていた（タイトルにも出る）。
  // 影響は表示だけでなく、構造化データの availability と
  // scripts/build-rakuten-links.js の「コンプ/予約」の出し分けにも及んでいた。
  return releaseStartDay(rw) <= now.getDate();
}

// 発売前のものだけを、発売が近い順に返す。
// 「未定」は月が取れないので最後にまとめる（除外はしない。予約導線の対象にはなる）。
export function upcomingProducts(products) {
  const dated = [];
  const undated = [];
  for (const p of products) {
    if (isReleased(p)) continue;
    const ym = getReleaseYearMonth(p);
    if (ym) dated.push({ product: p, ym, day: releaseStartDay(p.releaseWeek) });
    else undated.push({ product: p, ym: null, day: null });
  }
  dated.sort((a, b) => (a.ym === b.ym ? a.day - b.day : a.ym < b.ym ? -1 : 1));
  return { dated, undated, total: dated.length + undated.length };
}

export function getAllReleaseMonths(products) {
  const months = new Set();
  products.forEach((p) => {
    const ym = getReleaseYearMonth(p);
    if (ym) months.add(ym);
  });
  return [...months].sort();
}
