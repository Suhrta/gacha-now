"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Header from "../components/Header";
import GachaMachine from "../components/GachaMachine";
import ReceiptPaper from "../components/ReceiptPaper";
import Footer from "../components/Footer";
import products from "../data/products.json";

const ITEMS_PER_PAGE = 20;

const PRIORITY_BRANDS = ["サンリオ", "たまごっち", "ちいかわ", "ポケモン"];

function getSortedBrands() {
  const brandCounts = {};
  products.forEach((p) => {
    brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
  });
  const allBrands = Array.from(new Set(products.map((p) => p.brand)));
  const priority = PRIORITY_BRANDS.filter((b) => allBrands.includes(b));
  const rest = allBrands
    .filter((b) => !PRIORITY_BRANDS.includes(b))
    .sort((a, b) => (brandCounts[b] || 0) - (brandCounts[a] || 0));
  return ["すべて", ...priority, ...rest];
}

const BRANDS = getSortedBrands();

function getStatus(product) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const rw = product.releaseWeek || "未定";
  const monthMatch = rw.match(/(\d+)月/);
  if (!monthMatch) return "new";
  const releaseMonth = parseInt(monthMatch[1]);
  if (releaseMonth < currentMonth) return "available";
  if (releaseMonth === currentMonth) return "new";
  return "upcoming";
}

function releaseWeekToNum(str) {
  if (!str || str === "未定") return 8888;
  const m = str.match(/(\d+)月/);
  const w = str.match(/第(\d+)週/);
  const d = str.match(/(\d+)日/);
  const month = m ? parseInt(m[1]) : 99;
  if (w) return month * 100 + parseInt(w[1]);
  if (d) return month * 100 + Math.ceil(parseInt(d[1]) / 7);
  return month * 100 + 9;
}

function sortProducts(list, tab) {
  if (tab === "available") {
    return [...list].sort((a, b) => releaseWeekToNum(b.releaseWeek) - releaseWeekToNum(a.releaseWeek));
  }
  if (tab === "new" || tab === "upcoming") {
    return [...list].sort((a, b) => {
      const aHot = a.hot ? 0 : 1;
      const bHot = b.hot ? 0 : 1;
      if (aHot !== bHot) return aHot - bHot;
      return releaseWeekToNum(a.releaseWeek) - releaseWeekToNum(b.releaseWeek);
    });
  }
  return [...list].sort((a, b) => {
    const aHot = a.hot ? 0 : 1;
    const bHot = b.hot ? 0 : 1;
    if (aHot !== bHot) return aHot - bHot;
    const statusOrder = { new: 0, upcoming: 1, available: 2 };
    const aStatus = getStatus(a);
    const bStatus = getStatus(b);
    const aIsUndefined = !a.releaseWeek || a.releaseWeek === "未定" || !a.releaseWeek.match(/\d+月/);
    const bIsUndefined = !b.releaseWeek || b.releaseWeek === "未定" || !b.releaseWeek.match(/\d+月/);
    let aOrder = aIsUndefined ? 1.5 : (statusOrder[aStatus] ?? 3);
    let bOrder = bIsUndefined ? 1.5 : (statusOrder[bStatus] ?? 3);
    if (aOrder !== bOrder) return aOrder - bOrder;
    return releaseWeekToNum(a.releaseWeek) - releaseWeekToNum(b.releaseWeek);
  });
}

const STATUS_TABS = [
  { key: "all", label: "すべて", emoji: "🎪" },
  { key: "available", label: "発売中", emoji: "🟢" },
  { key: "new", label: "新作", emoji: "🆕" },
  { key: "upcoming", label: "発売予定", emoji: "📅" },
];

export default function HomePage() {
  const [brand, setBrand] = useState("すべて");
  const [selected, setSelected] = useState(null);
  const [statusTab, setStatusTab] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const searchRef = useRef(null);
  const loaderRef = useRef(null);

  // 横スワイプ用
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  // フィルタ変更時にリセット
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
    window.scrollTo(0, 0);
  }, [brand, statusTab, searchQuery]);

  // 無限スクロール
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [brand, statusTab, searchQuery]);

  // 横スワイプでブランドタブ切替
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    const currentIdx = BRANDS.findIndex((b) => b === brand);

    if (Math.abs(diff) > 80) {
      if (diff > 0 && currentIdx < BRANDS.length - 1) {
        setBrand(BRANDS[currentIdx + 1]);
      } else if (diff < 0 && currentIdx > 0) {
        setBrand(BRANDS[currentIdx - 1]);
      }
    }
  };

  let filtered = brand === "すべて" ? [...products] : products.filter((p) => p.brand === brand);
  if (statusTab !== "all") {
    filtered = filtered.filter((p) => getStatus(p) === statusTab);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
    );
  }
  filtered = sortProducts(filtered, statusTab);

  const hasUpcoming = products.some((p) => getStatus(p) === "upcoming");
  const visibleTabs = hasUpcoming ? STATUS_TABS : STATUS_TABS.filter((t) => t.key !== "upcoming");

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <>
      <Header brands={BRANDS} selected={brand} onSelect={setBrand} />

      <main
        className="px-2.5 pt-3 pb-20 relative"
        style={{ minHeight: "calc(100vh - 160px)" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute inset-0 pointer-events-none opacity-50"
          style={{ backgroundImage: "radial-gradient(circle, #F0E6D6 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <div className="flex gap-1.5 mb-3 px-1 relative z-10 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button key={tab.key} onClick={() => setStatusTab(tab.key)}
              className="shrink-0 px-3 py-1.5 rounded-full font-pixel text-[10px] border-2 transition-colors duration-100 cursor-pointer"
              style={{
                background: statusTab === tab.key ? "#E8756D" : "#FFFFFF",
                borderColor: statusTab === tab.key ? "#E8756D" : "#F0E6D6",
                color: statusTab === tab.key ? "#fff" : "#9B8978",
                boxShadow: statusTab === tab.key ? "0 2px 8px #E8756D33" : "none",
              }}>
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        <div className="font-pixel text-[11px] text-brand-sub mb-2.5 px-1 relative">
          {filtered.length}件 ── タップで詳しく！
        </div>
        <div key={statusTab + brand + searchQuery} className="flex flex-wrap gap-2.5 relative z-[1]">
          {visible.map((p, i) => (
            <GachaMachine key={`${statusTab}-${p.id}`} product={p} index={i} onClick={setSelected} />
          ))}
        </div>

        {/* 無限スクロール用ローダー */}
        {hasMore && (
          <div ref={loaderRef} className="flex justify-center py-6">
            <div className="font-pixel text-[10px] text-brand-sub animate-pulse">
              もっと読み込み中...
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-brand-sub font-pixel text-[10px] leading-[2.2]">
            {searchQuery ? (
              <>🔍<br />「{searchQuery}」の<br />商品は見つからなかったよ</>
            ) : (
              <>🎪<br />このカテゴリの<br />商品はまだないよ</>
            )}
          </div>
        )}
      </main>
      <Footer />

      {/* フローティング検索 */}
      {searchOpen && (
        <div className="fixed bottom-20 left-3 right-3 z-50 flex items-center gap-2"
          style={{ animation: "slideUp 0.2s ease-out" }}>
          <div className="flex-1 flex items-center bg-white rounded-full border-2 border-brand-accent px-4 py-2.5"
            style={{ boxShadow: "0 4px 20px rgba(232,117,109,0.25)" }}>
            <span className="text-[14px] mr-2">🔍</span>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="商品名で検索..."
              className="flex-1 bg-transparent outline-none font-pixel text-[12px] text-brand-text"
              style={{ border: "none" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                className="text-[14px] text-brand-sub cursor-pointer bg-transparent border-none p-0 ml-1">
                ✕
              </button>
            )}
          </div>
          <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
            className="shrink-0 w-10 h-10 rounded-full bg-white border-2 border-cream-border flex items-center justify-center cursor-pointer text-[14px]"
            style={{ boxShadow: "0 2px 8px rgba(74,55,40,0.1)" }}>
            ✕
          </button>
        </div>
      )}

      {!searchOpen && (
        <button onClick={() => setSearchOpen(true)}
          className="fixed bottom-6 right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer border-none"
          style={{
            background: "linear-gradient(135deg, #E8756D, #E8756DDD)",
            boxShadow: "0 4px 16px rgba(232,117,109,0.4), 0 2px 4px rgba(232,117,109,0.2)",
          }}>
          <span className="text-white text-[22px]">🔍</span>
        </button>
      )}

      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {selected && <ReceiptPaper product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
