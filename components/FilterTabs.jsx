"use client";

export default function FilterTabs({ brands, selected, onSelect }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {brands.map((b) => (
        <button key={b} onClick={() => onSelect(b)}
          className="shrink-0 px-3 py-1.5 rounded-lg font-pixel text-[9px] border-2 transition-all duration-150 cursor-pointer"
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
