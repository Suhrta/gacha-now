"use client";
import { useRef, useEffect } from "react";

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
    <div ref={containerRef} className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {brands.map((b) => (
        <button key={b} ref={(el) => (tabRefs.current[b] = el)} onClick={() => onSelect(b)}
          className="shrink-0 px-3 py-1.5 rounded-lg font-pixel text-[11px] border-2 transition-all duration-150 cursor-pointer"
          style={{
            background: selected === b ? "#E8756D" : "#FFFFFF",
            borderColor: selected === b ? "#E8756D" : "#F0E6D6",
            color: selected === b ? "#fff" : "#9B8978",
            boxShadow: selected === b ? "0 2px 8px #E8756D33" : "none",
          }}>
          {b}
        </button>
      ))}
    </div>
  );
}
