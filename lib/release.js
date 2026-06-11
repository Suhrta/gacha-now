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
  const day = rw.match(/(\d+)日/);
  if (day) return parseInt(day[1], 10) <= now.getDate();
  return true;
}

export function getAllReleaseMonths(products) {
  const months = new Set();
  products.forEach((p) => {
    const ym = getReleaseYearMonth(p);
    if (ym) months.add(ym);
  });
  return [...months].sort();
}
