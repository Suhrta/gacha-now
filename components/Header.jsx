"use client";
import FilterTabs from "./FilterTabs";

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

export default function Header({ brands, selected, onSelect }) {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-cream-border relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #FFFAF3 0%, #FFF4E8 100%)" }}>

      {/* カプセル装飾 */}
      <HeaderCapsule size={28} color="#E8756D" style={{ top: 8, left: 10, transform: "rotate(-15deg)" }} />
      <HeaderCapsule size={22} color="#FFD54F" style={{ top: 14, right: 16, transform: "rotate(20deg)" }} />
      <HeaderCapsule size={18} color="#4FC3F7" style={{ bottom: 18, left: 50, transform: "rotate(-30deg)" }} />
      <HeaderCapsule size={20} color="#A5D6A7" style={{ bottom: 12, right: 60, transform: "rotate(10deg)" }} />
      <HeaderCapsule size={16} color="#CE93D8" style={{ top: 40, left: "45%", transform: "rotate(25deg)" }} />

      <div className="px-3.5 pt-4 pb-2.5 relative z-10">
        <div className="text-center mb-2">
          <div className="text-[22px] text-brand-accent tracking-[3px] animate-float"
            style={{ textShadow: "0 4px 0 #E8756D22" }}>
            ガチャなう
          </div>
          <div className="text-[10px] text-brand-sub mt-1 tracking-[1px]">
            新作カプセルトイ情報
          </div>
        </div>

        <div className="bg-cream-dark border border-cream-border rounded-md py-1.5 overflow-hidden mb-2.5">
          <div className="text-[10px] text-brand-accent whitespace-nowrap animate-marquee">
            🔥 3月新作ぞくぞく！ ── ちいかわ パジャマ 3月第2週！ ── ポケモン テラスタル Vol.3 予約開始！ ── mofusand カフェ 新作！ 🔥
          </div>
        </div>

        <FilterTabs brands={brands} selected={selected} onSelect={onSelect} />
      </div>
    </header>
  );
}
