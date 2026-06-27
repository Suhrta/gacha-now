"use client";
import { useRef, useEffect, useState } from "react";

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
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const c = containerRef.current;
    if (!c) return;
    setCanLeft(c.scrollLeft > 4);
    setCanRight(c.scrollLeft + c.clientWidth < c.scrollWidth - 4);
  };

  // スクロール位置に応じて矢印の表示を更新
  useEffect(() => {
    updateArrows();
    const c = containerRef.current;
    if (!c) return;
    c.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      c.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [brands]);

  // 選択中タブを中央へスクロール
  useEffect(() => {
    const el = tabRefs.current[selected];
    const container = containerRef.current;
    if (el && container) {
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [selected]);

  const scrollByDir = (dir) => {
    const c = containerRef.current;
    if (!c) return;
    c.scrollBy({ left: dir * Math.max(220, c.clientWidth * 0.6), behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* 左フェード + 矢印（PCのみ） */}
      <div
        className={`hidden md:block absolute left-0 top-0 bottom-1 w-12 z-10 pointer-events-none transition-opacity ${canLeft ? "opacity-100" : "opacity-0"}`}
        style={{ background: "linear-gradient(90deg, #FFFDF8 30%, rgba(255,253,248,0))" }}
      />
      <button
        type="button"
        onClick={() => scrollByDir(-1)}
        aria-label="前のカテゴリ"
        className={`hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white border border-cream-border shadow-md text-brand-text text-lg hover:border-brand-accent transition-opacity ${canLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        ‹
      </button>

      <div
        ref={containerRef}
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {brands.map((b) => {
          const icon = BRAND_ICONS[b];
          const active = selected === b;
          return (
            <button
              key={b}
              ref={(el) => (tabRefs.current[b] = el)}
              onClick={() => onSelect(b)}
              className={`shrink-0 inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-[13px] font-medium border transition-all duration-150 cursor-pointer ${
                active
                  ? "bg-brand-accent text-white border-brand-accent shadow-md"
                  : "bg-white text-brand-sub border-cream-border shadow-sm hover:border-brand-accent/30"
              }`}
            >
              {icon && <img src={icon} alt="" className="w-5 h-5 sm:w-6 sm:h-6 mix-blend-multiply" />}
              <span>{b}</span>
            </button>
          );
        })}
      </div>

      {/* 右フェード + 矢印（PCのみ） */}
      <div
        className={`hidden md:block absolute right-0 top-0 bottom-1 w-12 z-10 pointer-events-none transition-opacity ${canRight ? "opacity-100" : "opacity-0"}`}
        style={{ background: "linear-gradient(270deg, #FFFDF8 30%, rgba(255,253,248,0))" }}
      />
      <button
        type="button"
        onClick={() => scrollByDir(1)}
        aria-label="次のカテゴリ"
        className={`hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white border border-cream-border shadow-md text-brand-text text-lg hover:border-brand-accent transition-opacity ${canRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        ›
      </button>
    </div>
  );
}
