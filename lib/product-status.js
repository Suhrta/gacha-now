// 発売ステータス判定。app/page.jsx のタブ絞り込みと同じ判定基準
// (available=発売中 / new=当月発売 / upcoming=発売予定)。
export function getStatus(product) {
  const rw = product.releaseWeek || "未定";
  if (rw === "発売中") return "available";
  if (rw === "未定") return "upcoming";
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const monthMatch = rw.match(/(\d+)月/);
  if (!monthMatch) return "new";
  const releaseMonth = parseInt(monthMatch[1]);
  if (releaseMonth < currentMonth) return "available";
  if (releaseMonth === currentMonth) return "new";
  return "upcoming";
}
