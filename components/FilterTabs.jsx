"use client";
import { useRef, useEffect } from "react";

const BRAND_ICONS = {
  "すべて": "/icons/icon-brand-all.png",
  "サンリオ": "/icons/icon-brand-sanrio.png",
  "たまごっち": "/icons/icon-brand-tamagotchi.png",
  "ちいかわ": "/icons/icon-brand-chiikawa.png",
  "ポケモン": "/icons/icon-brand-pokemon.png",
  "その他": "/icons/icon-brand-other.png",
};

export default function FilterTabs({ brands, selected, onSelect }) {
  const containerRef = useRef(null);
  const tabRefs = useRef({});

  useEffect(() => {
    const el = tabRefs.current[selected];
    const container = containerRef.current;
    if (el && container) {
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [selected]);

  return (
    <div
      ref={containerRef}
      className="flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: "none" }}
    >
      {brands.map((b) => {
        const icon = BRAND_ICONS[b] || "/icons/icon-brand-other.png";
        const active = selected === b;
        return (
          <button
            key={b}
            ref={(el) => (tabRefs.current[b] = el)}
            onClick={() => onSelect(b)}
            className={`shrink-0 inline-flex items-center gap-1.5 sm:gap-2.5 px-3 py-1.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium border transition-all duration-150 cursor-pointer ${
              active
                ? "bg-brand-accent text-white border-brand-accent shadow-md"
                : "bg-white text-brand-sub border-cream-border shadow-sm hover:border-brand-accent/30"
            }`}
          >
            <img src={icon} alt="" className="w-5 h-5 sm:w-7 sm:h-7 mix-blend-multiply" />
            <span>{b}</span>
          </button>
        );
      })}
    </div>
  );
}
