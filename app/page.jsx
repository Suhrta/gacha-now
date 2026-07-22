"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Header from "../components/Header";
import GachaMachine from "../components/GachaMachine";
import ReceiptPaper from "../components/ReceiptPaper";
import NewArrivalModal from "../components/NewArrivalModal";
import Footer from "../components/Footer";
import FilterTabs from "../components/FilterTabs";
import InstaCapsule from "../components/InstaCapsule";
import products from "../data/products.json";
import { CHARACTERS } from "../data/characters";
import { SERIES } from "../data/series";
import { getAllReleaseMonths, formatYearMonth, getReleaseYearMonth } from "../lib/release";
import { DATA_UPDATED } from "../lib/site-meta";

const ITEMS_PER_PAGE = 20;
// 自動読み込みは最初の数バッチまで。それ以降は「もっと見る」ボタンに切り替え、
// 下部のキャラ・メーカー・発売月ナビへ到達できるようにする
const AUTO_LOAD_MAX = ITEMS_PER_PAGE * 3; // 60件まで自動、以降は手動
const RELEASE_MONTHS = getAllReleaseMonths(products);

// 翌月の発売月ページ（存在する場合のみ）。「来月何が出る？」需要への上部導線 + 内部リンク強化
const NEXT_MONTH = (() => {
  const now = new Date();
  const m = now.getMonth() + 2;
  const ym = `${m > 12 ? now.getFullYear() + 1 : now.getFullYear()}-${String(m > 12 ? m - 12 : m).padStart(2, "0")}`;
  return RELEASE_MONTHS.includes(ym) ? ym : null;
})();

const PRIORITY_BRANDS = ["サンリオ", "たまごっち", "ちいかわ", "ポケモン"];
const FIXED_OTHER = "その他";

function getSortedBrands() {
  const brandCounts = {};
  products.forEach((p) => {
    brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
  });
  const allBrands = Array.from(new Set(products.map((p) => p.brand)));
  const priority = PRIORITY_BRANDS.filter((b) => allBrands.includes(b));
  const hasOther = allBrands.includes(FIXED_OTHER);
  const rest = allBrands
    .filter((b) => !PRIORITY_BRANDS.includes(b) && b !== FIXED_OTHER)
    .sort((a, b) => (brandCounts[b] || 0) - (brandCounts[a] || 0));
  return ["すべて", ...priority, ...(hasOther ? [FIXED_OTHER] : []), ...rest];
}

const BRANDS = getSortedBrands();

// ブランド別ページ（/brand/[slug]）への導線。2件以上あるブランドを商品数順に
const BRAND_LINKS = Object.values(
  products.reduce((acc, p) => {
    if (!p.brandSlug || p.brand === "その他") return acc;
    if (!acc[p.brandSlug]) acc[p.brandSlug] = { slug: p.brandSlug, name: p.brand, count: 0 };
    acc[p.brandSlug].count += 1;
    return acc;
  }, {})
)
  .filter((b) => b.count >= 2)
  .sort((a, b) => b.count - a.count);

function getLiveCounts() {
  let available = 0;
  let newCount = 0;
  products.forEach((p) => {
    const status = getStatus(p);
    if (status === "available") available += 1;
    if (status === "new") newCount += 1;
  });
  return { available, newCount, total: products.length };
}

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
  // すべて: 新しさ最優先（当月新作 → 発売予定 → 未定 → 先月=1か月以内 → それ以前）。
  // HOT（人気ブランド）は同じ鮮度グループ内でのみ優先。以前はHOTが最優先だったため、
  // 人気ブランドの数か月前の商品が他ブランドの新作を押し下げていた。
  return [...list].sort((a, b) => {
    const aT = freshnessTier(a);
    const bT = freshnessTier(b);
    if (aT !== bT) return aT - bT;
    const aHot = a.hot ? 0 : 1;
    const bHot = b.hot ? 0 : 1;
    if (aHot !== bHot) return aHot - bHot;
    // 発売予定は発売が近い順、発売済みは新しい順
    const aK = releaseSortKey(a);
    const bK = releaseSortKey(b);
    return aT === 1 ? aK - bK : bK - aK;
  });
}

// 年をまたいでも比較できる発売月インデックス（年*12+月）
function releaseMonthIndex(product) {
  const ym = getReleaseYearMonth(product);
  if (!ym) return null;
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + m;
}

// 鮮度グループ: 0=当月新作 / 1=発売予定 / 2=発売日未定 / 3=先月(1か月以内) / 4=それ以前
function freshnessTier(product) {
  const rw = product.releaseWeek || "未定";
  const idx = releaseMonthIndex(product);
  if (idx === null) return rw === "発売中" ? 4 : 2;
  const now = new Date();
  const monthsAgo = now.getFullYear() * 12 + (now.getMonth() + 1) - idx;
  if (monthsAgo < 0) return 1;
  if (monthsAgo === 0) return 0;
  if (monthsAgo === 1) return 3;
  return 4;
}

// 鮮度グループ内の並び替えキー（発売月インデックス + 週）
function releaseSortKey(product) {
  const idx = releaseMonthIndex(product);
  if (idx === null) return 0;
  return idx * 100 + (releaseWeekToNum(product.releaseWeek) % 100);
}

const STATUS_TABS = [
  { key: "all", label: "すべて" },
  { key: "available", label: "発売中" },
  { key: "new", label: "新作" },
  { key: "upcoming", label: "発売予定 ⭐" },
  { key: "favorites", label: "お気に入り" },
];

// 最終更新日はメタデータ（title・description）と同じ算出元を使い、表示と食い違わないようにする
const LAST_UPDATED = DATA_UPDATED ? DATA_UPDATED.label : null;

export default function HomePage() {
  const [brand, setBrand] = useState("すべて");
  const [selected, setSelected] = useState(null);
  const [statusTab, setStatusTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const heroSearchRef = useRef(null);
  const loaderRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const { available, newCount, total } = getLiveCounts();

  // localStorage からお気に入り読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gacha-favorites");
      if (saved) setFavorites(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  // お気に入り登録/解除
  const toggleFavorite = useCallback((productId) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      const adding = !next.has(productId);
      if (adding) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      // 利用実態の計測（localStorageのみだと集計不能なため）
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", "favorite_toggle", { action: adding ? "add" : "remove", item_id: productId });
      }
      try { localStorage.setItem("gacha-favorites", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const handleHeaderSearchClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => heroSearchRef.current?.focus(), 300);
  }, []);

  const handleHeaderFavoritesClick = useCallback(() => {
    setStatusTab("favorites");
  }, []);

  const handleHeaderNewClick = useCallback(() => {
    setStatusTab("new");
  }, []);

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

  // お気に入りタブ
  if (statusTab === "favorites") {
    filtered = filtered.filter((p) => favorites.has(p.id));
  } else if (statusTab !== "all") {
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
      <Header onSearchClick={handleHeaderSearchClick} onFavoritesClick={handleHeaderFavoritesClick} onNewClick={handleHeaderNewClick} />

      <main
        className="pt-6 pb-12 relative flex-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ヒーローセクション */}
        <section
          className="rounded-3xl p-5 md:p-10 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #FFF9F5 0%, #FFFFFF 40%, #F8FAFE 100%)" }}
        >
          {/* 装飾スパークル */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <span style={{ position: 'absolute', top: '8%',  left: '6%',  fontSize: 18, color: '#FBCFE8' }}>✦</span>
            <span style={{ position: 'absolute', top: '18%', left: '52%', fontSize: 14, color: '#FDE68A' }}>✦</span>
            <span style={{ position: 'absolute', top: '12%', right: '4%', fontSize: 22, color: '#FCD34D' }}>✨</span>
            <span style={{ position: 'absolute', bottom: '20%', left: '8%', fontSize: 16, color: '#A7F3D0' }}>✦</span>
            <span style={{ position: 'absolute', bottom: '12%', left: '40%', fontSize: 14, color: '#BFDBFE' }}>✦</span>
            <span style={{ position: 'absolute', bottom: '30%', right: '10%', fontSize: 18, color: '#FBCFE8' }}>✨</span>
            <span style={{ position: 'absolute', top: '30%', left: '15%', width: 6, height: 6, borderRadius: '50%', background: '#FECACA', display: 'inline-block' }} />
            <span style={{ position: 'absolute', top: '40%', right: '20%', width: 5, height: 5, borderRadius: '50%', background: '#BFDBFE', display: 'inline-block' }} />
            <span style={{ position: 'absolute', bottom: '15%', left: '60%', width: 7, height: 7, borderRadius: '50%', background: '#FDE68A', display: 'inline-block' }} />
            <span style={{ position: 'absolute', bottom: '40%', right: '5%', width: 5, height: 5, borderRadius: '50%', background: '#C7D2FE', display: 'inline-block' }} />
          </div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-6 md:gap-8 items-center">
            {/* 左: コピー + 統計 + 検索 */}
            <div>
              {/* コピー（モバイルは小さい画像と横並び） */}
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {LAST_UPDATED && (
                    <div className="inline-flex items-center gap-1.5 bg-white/80 border border-cream-border rounded-full px-3 py-1 text-[11px] text-brand-sub mb-3">
                      <span>✨</span> 毎日更新｜最終更新 {LAST_UPDATED}
                    </div>
                  )}
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-brand-text leading-tight break-keep">
                    ガチャガチャ<br />
                    新作・最新情報<br />
                    ぜんぶ<span className="text-brand-accent">チェック</span>
                  </h1>
                  <p className="mt-3 text-sm md:text-base text-brand-sub leading-relaxed">
                    <span className="md:hidden">新作・発売中・発売予定の<br />ガチャガチャ最新情報を毎日更新！</span>
                    <span className="hidden md:inline">
                      新作・発売中・発売予定のガチャガチャ最新情報を毎日更新でまとめてチェック。<br />
                      お気に入りを見つけて、ガチャライフをもっと楽しく！
                    </span>
                  </p>
                </div>
                {/* モバイル専用: タイトル横の小さい画像 */}
                <img
                  src="/icons/hero-gacha-machine.png"
                  alt="ガチャマシン"
                  className="block md:hidden max-w-[100px] w-full animate-float shrink-0 pointer-events-none"
                />
              </div>

              {/* 統計（モバイルはファーストビュー整理のため非表示） */}
              <div className="hidden md:flex md:flex-wrap md:items-center gap-2 mt-5">
                <button
                  onClick={() => setStatusTab("new")}
                  className="flex items-center justify-center gap-1 sm:gap-1.5 bg-white rounded-full shadow-sm border border-cream-border px-2 sm:pl-2 sm:pr-3 py-1.5 cursor-pointer hover:border-brand-accent transition-colors"
                >
                  <img src="/icons/icon-stat-new.png" alt="" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                  <span className="text-[10px] sm:text-xs text-brand-sub">新作</span>
                  <span className="text-sm sm:text-base lg:text-lg font-bold text-brand-accent">{newCount}</span>
                  <span className="hidden sm:inline text-xs text-brand-sub">件</span>
                </button>
                <button
                  onClick={() => setStatusTab("available")}
                  className="flex items-center justify-center gap-1 sm:gap-1.5 bg-white rounded-full shadow-sm border border-cream-border px-2 sm:pl-2 sm:pr-3 py-1.5 cursor-pointer hover:border-brand-accent transition-colors"
                >
                  <img src="/icons/icon-stat-available.png" alt="" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                  <span className="text-[10px] sm:text-xs text-brand-sub">発売中</span>
                  <span className="text-sm sm:text-base lg:text-lg font-bold text-brand-purple">{available}</span>
                  <span className="hidden sm:inline text-xs text-brand-sub">件</span>
                </button>
                <div className="flex items-center justify-center gap-1 sm:gap-1.5 bg-white rounded-full shadow-sm border border-cream-border px-2 sm:pl-2 sm:pr-3 py-1.5">
                  <img src="/icons/icon-stat-total.png" alt="" className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                  <span className="text-[10px] sm:text-xs text-brand-sub">全件数</span>
                  <span className="text-sm sm:text-base lg:text-lg font-bold text-brand-pink">{total}</span>
                  <span className="hidden sm:inline text-xs text-brand-sub">件</span>
                </div>
              </div>

              {/* 検索バー */}
              <div className="mt-4">
                <div className="bg-white rounded-full border border-cream-border pl-3 pr-1 py-1 flex items-center gap-1.5 min-w-0">
                  <span className="text-brand-sub shrink-0">🔍</span>
                  <input
                    ref={heroSearchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="商品・キャラ名で検索"
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm text-brand-text py-1.5"
                    style={{ border: "none" }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-brand-sub cursor-pointer bg-transparent border-none px-1 shrink-0"
                      aria-label="検索クリア"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    onClick={() => heroSearchRef.current?.blur()}
                    className="bg-brand-accent text-white rounded-full px-4 py-1.5 text-xs font-medium cursor-pointer border-none hover:opacity-90 transition-opacity shrink-0"
                  >
                    検索
                  </button>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link
                    href="/series"
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 bg-white border-2 border-brand-accent rounded-full text-sm md:text-base font-bold text-brand-accent no-underline hover:bg-brand-accent hover:text-white transition-colors"
                    style={{ boxShadow: "0 3px 0 #E8756D33, 0 4px 12px rgba(232,117,109,0.15)" }}
                  >
                    🎁 シリーズ特集<span className="hidden md:inline">をみる</span>
                    <span>→</span>
                  </Link>
                  {/* 翌月新作への導線（シリーズ特集と同列） */}
                  {NEXT_MONTH && (
                    <Link
                      href={`/release/${NEXT_MONTH}`}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 bg-white border-2 border-brand-purple rounded-full text-sm md:text-base font-bold text-brand-purple no-underline transition-colors"
                      style={{ boxShadow: "0 3px 0 #8B7EC833, 0 4px 12px rgba(139,126,200,0.15)" }}
                    >
                      📅 {Number(NEXT_MONTH.split("-")[1])}月<span className="hidden md:inline">発売</span>の新作
                      <span>→</span>
                    </Link>
                  )}
                </div>

                {/* モバイル: インスタ紹介カプセル */}
                <InstaCapsule variant="mobile" />
              </div>
            </div>

            {/* 右: ガチャマシン画像（PCのみ・やや中央寄り）+ インスタ紹介カプセル */}
            <div className="hidden md:flex justify-center items-center">
              {/* カプセルは筐体画像基準(%)で配置するため、画像サイズのラッパーに relative を張る */}
              <div className="relative">
                <img
                  src="/icons/hero-gacha-machine.png"
                  alt="ガチャマシン"
                  className="w-[200px] lg:w-[260px] xl:w-[300px] animate-float pointer-events-none"
                />
                <InstaCapsule variant="desktop" />
              </div>
            </div>
          </div>
        </section>

        {/* ブランドフィルター */}
        <div className="mt-6 px-1">
          <FilterTabs brands={BRANDS} selected={brand} onSelect={setBrand} />
        </div>

        {/* ステータスタブ */}
        <div className="flex flex-nowrap gap-1 overflow-x-auto overflow-y-hidden touch-pan-x mt-6 mb-2 px-1 relative z-10 border-b border-cream-border">
          {visibleTabs.map((tab) => {
            const active = statusTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                className={`shrink-0 px-4 py-3 text-sm whitespace-nowrap transition-colors cursor-pointer bg-transparent border-b-2 -mb-px ${
                  active
                    ? "text-brand-text font-bold border-brand-accent"
                    : "text-brand-sub hover:text-brand-text border-transparent"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="font-sans text-xs text-brand-sub mb-2.5 px-1 relative">
          {statusTab === "favorites"
            ? `⭐ ${filtered.length}件のお気に入り`
            : `${filtered.length}件 ── タップで詳しく！`
          }
        </div>
        <div key={statusTab + brand + searchQuery} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 relative z-[1]">
          {visible.map((p, i) => (
            <GachaMachine
              key={`${statusTab}-${p.id}`}
              product={p}
              index={i}
              onClick={setSelected}
              isFavorite={favorites.has(p.id)}
            />
          ))}
        </div>

        {/* 60件までは自動読み込み（スクロール検知） */}
        {hasMore && visibleCount < AUTO_LOAD_MAX && (
          <div ref={loaderRef} className="flex flex-col items-center py-6 gap-2">
            <div className="flex gap-3">
              <span style={{ fontSize: 24, animation: "bounce 0.6s ease-in-out infinite", animationDelay: "0s", color: "#F5A8A2" }}>●</span>
              <span style={{ fontSize: 24, animation: "bounce 0.6s ease-in-out infinite", animationDelay: "0.15s", color: "#A8D8EA" }}>●</span>
              <span style={{ fontSize: 24, animation: "bounce 0.6s ease-in-out infinite", animationDelay: "0.3s", color: "#F9E4B7" }}>●</span>
            </div>
            <div className="font-sans text-sm text-brand-sub" style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
              Loading...
            </div>
          </div>
        )}

        {/* 60件以降は手動ボタン（自動で下に伸び続けるのを止め、下部ナビへ到達できるように） */}
        {hasMore && visibleCount >= AUTO_LOAD_MAX && (
          <div className="flex justify-center py-6">
            <button
              onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE * 2)}
              className="px-6 py-2.5 bg-white border border-cream-border rounded-full text-sm font-bold text-brand-text hover:border-brand-accent transition-colors cursor-pointer"
            >
              もっと見る（残り{filtered.length - visibleCount}件）
            </button>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-brand-sub font-sans text-sm leading-[2.2]">
            {statusTab === "favorites" ? (
              <>⭐<br />お気に入りはまだないよ<br />商品をタップして⭐で登録しよう！</>
            ) : searchQuery ? (
              <>🔍<br />「{searchQuery}」の<br />商品は見つからなかったよ</>
            ) : (
              <>🎪<br />このカテゴリの<br />商品はまだないよ</>
            )}
          </div>
        )}

        {/* キャラ・発売月別ページへの導線 */}
        <section className="mt-12 px-1">
          <h2 className="text-xl font-bold text-brand-text flex items-center gap-2 mb-3">
            <span>🔎</span> キャラ・テーマから探す
          </h2>
          <div className="flex flex-wrap gap-2">
            {CHARACTERS.map((c) => (
              <Link
                key={c.slug}
                href={`/character/${c.slug}`}
                className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
              >
                #{c.name}
              </Link>
            ))}
          </div>

          <h2 className="text-xl font-bold text-brand-text flex items-center gap-2 mt-6 mb-3">
            <span>📅</span> 発売月から探す
          </h2>
          <div className="flex flex-wrap gap-2">
            {RELEASE_MONTHS.map((m) => (
              <Link
                key={m}
                href={`/release/${m}`}
                className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
              >
                {formatYearMonth(m)}発売
              </Link>
            ))}
          </div>

          <h2 className="text-xl font-bold text-brand-text flex items-center gap-2 mt-6 mb-3">
            <span>🏭</span> メーカー・ブランドから探す
          </h2>
          <div className="flex flex-wrap gap-2">
            {BRAND_LINKS.map((b) => (
              <Link
                key={b.slug}
                href={`/brand/${b.slug}`}
                className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
              >
                {b.name}
              </Link>
            ))}
          </div>

          <h2 className="text-xl font-bold text-brand-text flex items-center gap-2 mt-6 mb-3">
            <span>🎁</span> シリーズから探す
          </h2>
          <div className="flex flex-wrap gap-2">
            {SERIES.map((s) => (
              <Link
                key={s.slug}
                href={`/series/${s.slug}`}
                className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </section>

      </main>
      <Footer />
      {selected && (
        <ReceiptPaper
          product={selected}
          onClose={() => setSelected(null)}
          isFavorite={favorites.has(selected.id)}
          onToggleFavorite={toggleFavorite}
        />
      )}
      <NewArrivalModal products={products} onOpenReceipt={(p) => setSelected(p)} />
    </>
  );
}
