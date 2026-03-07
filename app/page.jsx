"use client";
import { useState, useEffect, useRef } from "react";
import Header from "../components/Header";
import GachaMachine from "../components/GachaMachine";
import ReceiptPaper from "../components/ReceiptPaper";
import NewArrivalModal from "../components/NewArrivalModal";
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
  const rw = product.releaseWeek || "未定";
  if (rw === "発売中") return "available";
  if (rw === "未定") return "upcoming";
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
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
  { key: "all", label: "すべて" },
  { key: "available", label: "発売中" },
  { key: "new", label: "新作" },
  { key: "upcoming", label: "発売予定" },
];

export default function HomePage() {
  const [brand, setBrand] = useState("すべて");
  const [selected, setSelected] = useState(null);
  const [statusTab, setStatusTab] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const loaderRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
    window.scrollTo(0, 0);
  }, [brand, statusTab, searchQuery]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          setLoading(true);
          setTimeout(() => {
            setVisibleCount((prev) => prev + ITEMS_PER_PAGE);
            setLoading(false);
          }, 1400);
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [brand, statusTab, searchQuery, loading]);

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

        {/* ステータスタブ + 検索ボタン */}
        <div className="flex items-center gap-1.5 mb-2 px-1 relative z-10">
          <div className="flex gap-1.5 overflow-x-auto flex-1">
            {visibleTabs.map((tab) => (
              <button key={tab.key} onClick={() => setStatusTab(tab.key)}
                className="shrink-0 px-3 py-1.5 rounded-full font-pixel text-[10px] border-2 transition-colors duration-100 cursor-pointer"
                style={{
                  background: statusTab === tab.key ? "#E8756D" : "#FFFFFF",
                  borderColor: statusTab === tab.key ? "#E8756D" : "#F0E6D6",
                  color: statusTab === tab.key ? "#fff" : "#9B8978",
                  boxShadow: statusTab === tab.key ? "0 2px 8px #E8756D33" : "none",
                }}>
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(""); }}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-2 transition-colors duration-100"
            style={{
              background: searchOpen ? "#E8756D" : "#FFFFFF",
              borderColor: searchOpen ? "#E8756D" : "#F0E6D6",
              color: searchOpen ? "#fff" : "#9B8978",
            }}>
            <span className="text-[14px]">{searchOpen ? "✕" : "🔍"}</span>
          </button>
        </div>

        {/* 検索窓（タブの下にスライド表示） */}
        <div style={{
          maxHeight: searchOpen ? "50px" : "0px",
          opacity: searchOpen ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.25s ease, opacity 0.2s ease",
        }}>
          <div className="flex items-center bg-white rounded-full border-2 border-cream-border px-3 py-2 mb-2 mx-1 relative z-10">
            <span className="text-[12px] mr-2">🔍</span>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="商品名で検索..."
              className="flex-1 bg-transparent outline-none font-pixel text-[11px] text-brand-text"
              style={{ border: "none" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                className="text-[12px] text-brand-sub cursor-pointer bg-transparent border-none p-0 ml-1">
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="font-pixel text-[11px] text-brand-sub mb-2.5 px-1 relative">
          {filtered.length}件 ── タップで詳しく！
        </div>
        <div key={statusTab + brand + searchQuery} className="flex flex-wrap gap-2.5 relative z-[1]">
          {visible.map((p, i) => (
            <GachaMachine key={`${statusTab}-${p.id}`} product={p} index={i} onClick={setSelected} />
          ))}
        </div>

        {(hasMore || loading) && (
          <div ref={loaderRef} className="flex flex-col items-center py-6 gap-2">
            <div className="flex gap-3">
              <span style={{ fontSize: 24, animation: "bounce 0.6s ease-in-out infinite", animationDelay: "0s", color: "#F5A8A2" }}>●</span>
              <span style={{ fontSize: 24, animation: "bounce 0.6s ease-in-out infinite", animationDelay: "0.15s", color: "#A8D8EA" }}>●</span>
              <span style={{ fontSize: 24, animation: "bounce 0.6s ease-in-out infinite", animationDelay: "0.3s", color: "#F9E4B7" }}>●</span>
            </div>
            <div className="font-pixel text-[9px] text-brand-sub" style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
              Loading...
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
      {selected && <ReceiptPaper product={selected} onClose={() => setSelected(null)} />}
      <NewArrivalModal products={products} onOpenReceipt={(p) => setSelected(p)} />
    </>
  );
}
