"use client";
import FilterTabs from "./FilterTabs";
import products from "../data/products.json";

function HeaderCapsule({ size, color, style, delay = 0 }) {
  return (
    <div style={{
      width: size, height: size * 1.2,
      position: "absolute", pointerEvents: "none", opacity: 0.42,
      animation: `float 3s ease-in-out ${delay}s infinite`,
      ...style,
    }}>
      <div style={{
        width: size, height: size * 0.55,
        borderRadius: `${size}px ${size}px 0 0`,
        background: `${color}`,
        boxShadow: `0 1px 2px ${color}44`,
      }} />
      <div style={{
        width: size, height: size * 0.65,
        borderRadius: `0 0 ${size}px ${size}px`,
        background: color,
        opacity: 0.75,
      }} />
    </div>
  );
}

function getLiveCounts() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  let available = 0;
  let thisMonth = 0;
  products.forEach((p) => {
    const rw = p.releaseWeek || "";
    if (rw === "発売中") { available += 1; return; }
    const m = rw.match(/(\d+)月/);
    if (!m) return;
    const mo = parseInt(m[1]);
    if (mo < currentMonth) available += 1;
    if (mo === currentMonth) thisMonth += 1;
  });
  return { available, thisMonth, total: products.length };
}

/* マーキーテキストをproducts.jsonから自動生成 */
function generateMarquee() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  // 今月発売のHOT商品をピックアップ
  const hotThisMonth = products.filter((p) => {
    if (!p.hot) return false;
    const m = p.releaseWeek?.match(/(\d+)月/);
    return m && parseInt(m[1]) === currentMonth;
  });

  // HOTから最大4件、発売週順で取得
  const picks = hotThisMonth
    .sort((a, b) => {
      const aW = a.releaseWeek?.match(/第(\d+)週/);
      const bW = b.releaseWeek?.match(/第(\d+)週/);
      return (aW ? parseInt(aW[1]) : 9) - (bW ? parseInt(bW[1]) : 9);
    })
    .slice(0, 4);

  if (picks.length === 0) {
    return `🔥 ${currentMonth}月の新作をチェック！ 🔥`;
  }

  const items = picks.map((p) => `${p.name} ${p.releaseWeek || ""}！`).join(" ── ");
  return `🔥 ${currentMonth}月新作ぞくぞく！ ── ${items} 🔥`;
}

export default function Header({ brands, selected, onSelect }) {
  const marqueeText = generateMarquee();
  const { available, thisMonth, total } = getLiveCounts();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  return (
    <header className="sticky top-0 z-50 border-b-2 border-cream-border relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #FFFAF3 0%, #FFF4E8 100%)" }}>

      <HeaderCapsule size={32} color="#E8756D" style={{ top: 6, left: 8, transform: "rotate(-15deg)" }} delay={0} />
      <HeaderCapsule size={26} color="#F5B82E" style={{ top: 10, right: 14, transform: "rotate(20deg)" }} delay={0.5} />
      <HeaderCapsule size={22} color="#6DB4C8" style={{ bottom: 16, left: 44, transform: "rotate(-30deg)" }} delay={1} />
      <HeaderCapsule size={24} color="#9BC471" style={{ bottom: 10, right: 52, transform: "rotate(10deg)" }} delay={1.5} />
      <HeaderCapsule size={18} color="#CE93D8" style={{ top: 52, left: "46%", transform: "rotate(25deg)" }} delay={0.8} />

      <div className="px-3.5 pt-4 pb-2.5 relative z-10">
        <div className="text-center mb-2">
          <div className="text-[34px] text-brand-accent tracking-[3px] animate-float leading-[1.1]"
            style={{
              textShadow: "0 2px 0 #C5534D, 0 4px 0 #E8756D33, 2px 4px 12px #E8756D22",
              fontWeight: 400,
            }}>
            ガチャなう
          </div>
          <div className="text-[12px] text-brand-text mt-2 tracking-[1px]">
            今日の新作ガチャ、ぜんぶチェック
          </div>
        </div>

        <div className="flex justify-center gap-1.5 mb-2.5 flex-wrap">
          <span className="font-pixel text-[10px] px-2 py-1 rounded-full"
            style={{ background: "#FFF4E8", border: "1.5px solid #F5B82E", color: "#A07018" }}>
            🎪 {currentMonth}月新作 <b style={{ color: "#E8756D" }}>{thisMonth}</b>件
          </span>
          <span className="font-pixel text-[10px] px-2 py-1 rounded-full"
            style={{ background: "#FFF4E8", border: "1.5px solid #6DB4C8", color: "#2E6F80" }}>
            🎯 発売中 <b style={{ color: "#E8756D" }}>{available}</b>件
          </span>
          <span className="font-pixel text-[10px] px-2 py-1 rounded-full"
            style={{ background: "#FFF4E8", border: "1.5px solid #9BC471", color: "#3E6B2C" }}>
            📦 全 <b style={{ color: "#E8756D" }}>{total}</b>件
          </span>
        </div>

        <div className="bg-cream-dark border border-cream-border rounded-md py-1.5 overflow-hidden mb-2.5">
          <div className="text-[14px] text-brand-accent whitespace-nowrap animate-marquee">
            {marqueeText}
          </div>
        </div>

        <FilterTabs brands={brands} selected={selected} onSelect={onSelect} />
      </div>
    </header>
  );
}
