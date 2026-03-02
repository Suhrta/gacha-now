"use client";
import FilterTabs from "./FilterTabs";

export default function Header({ brands, selected, onSelect }) {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-cream-border"
      style={{ background: "linear-gradient(180deg, #FFFAF3 0%, #FFF4E8 100%)" }}>
      <div className="px-3.5 pt-4 pb-2.5">
        <div className="text-center mb-2">
          <div className="text-[16px] text-brand-accent tracking-[3px] animate-float"
            style={{ textShadow: "0 2px 0 #E8756D22" }}>
            🏪 ガチャなう
          </div>
          <div className="text-[7px] text-brand-sub mt-1 tracking-[1px]">
            しんさく カプセルトイ じょうほう
          </div>
        </div>

        <div className="bg-cream-dark border border-cream-border rounded-md py-1.5 overflow-hidden mb-2.5">
          <div className="text-[7px] text-brand-accent whitespace-nowrap animate-marquee">
            🔥 3がつ しんさく ぞくぞく！ ── ちいかわ パジャマ 3がつ だい2しゅう！ ── ポケモン テラスタル Vol.3 よやく かいし！ ── mofusand カフェ しんさく！ 🔥
          </div>
        </div>

        <FilterTabs brands={brands} selected={selected} onSelect={onSelect} />
      </div>
    </header>
  );
}
