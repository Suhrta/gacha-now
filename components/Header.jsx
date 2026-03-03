"use client";
import FilterTabs from "./FilterTabs";

export default function Header({ brands, selected, onSelect, sortByDate, onToggleSort }) {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-cream-border"
      style={{ background: "linear-gradient(180deg, #FFFAF3 0%, #FFF4E8 100%)" }}>
      <div className="px-3.5 pt-4 pb-2.5">
        <div className="text-center mb-2">
          <div className="text-[18px] text-brand-accent tracking-[3px] animate-float"
            style={{ textShadow: "0 2px 0 #E8756D22" }}>
            🏪 ガチャなう
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

        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 overflow-hidden">
            <FilterTabs brands={brands} selected={selected} onSelect={onSelect} />
          </div>
          <button onClick={onToggleSort}
            className="shrink-0 px-2.5 py-1.5 rounded-lg font-pixel text-[10px] border-2 transition-all duration-150 cursor-pointer"
            style={{
              background: sortByDate ? "#5B8C6D" : "#FFFFFF",
              borderColor: sortByDate ? "#5B8C6D" : "#F0E6D6",
              color: sortByDate ? "#fff" : "#9B8978",
              boxShadow: sortByDate ? "0 2px 8px #5B8C6D33" : "none",
            }}>
            📅 発売日順
          </button>
        </div>
      </div>
    </header>
  );
}
