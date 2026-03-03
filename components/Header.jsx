"use client";
import FilterTabs from "./FilterTabs";
import products from "../data/products.json";

function HeaderCapsule({ size, color, style }) {
  return (
    <div style={{
      width: size, height: size * 1.2,
      position: "absolute", pointerEvents: "none", opacity: 0.15, ...style,
    }}>
      <div style={{
        width: size, height: size * 0.55,
        borderRadius: `${size}px ${size}px 0 0`,
        background: `${color}`,
      }} />
      <div style={{
        width: size, height: size * 0.65,
        borderRadius: `0 0 ${size}px ${size}px`,
        background: color,
        opacity: 0.7,
      }} />
    </div>
  );
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

  return (
    <header className="sticky top-0 z-50 border-b-2 border-cream-border relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #FFFAF3 0%, #FFF4E8 100%)" }}>

      <HeaderCapsule size={28} color="#E8756D" style={{ top: 8, left: 10, transform: "rotate(-15deg)" }} />
      <HeaderCapsule size={22} color="#FFD54F" style={{ top: 14, right: 16, transform: "rotate(20deg)" }} />
      <HeaderCapsule size={18} color="#4FC3F7" style={{ bottom: 18, left: 50, transform: "rotate(-30deg)" }} />
      <HeaderCapsule size={20} color="#A5D6A7" style={{ bottom: 12, right: 60, transform: "rotate(10deg)" }} />
      <HeaderCapsule size={16} color="#CE93D8" style={{ top: 40, left: "45%", transform: "rotate(25deg)" }} />

      <div className="px-3.5 pt-4 pb-2.5 relative z-10">
        <div className="text-center mb-2">
          <div className="text-[22px] text-brand-accent tracking-[3px] animate-float"
            style={{ textShadow: "0 2px 0 #E8756D22" }}>
            ガチャなう
          </div>
          <div className="text-[10px] text-brand-sub mt-1 tracking-[1px]">
            毎日更新！カプセルトイ新作情報
          </div>
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
