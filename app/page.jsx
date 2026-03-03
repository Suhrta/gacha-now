"use client";
import { useState } from "react";
import Header from "../components/Header";
import GachaMachine from "../components/GachaMachine";
import ReceiptPaper from "../components/ReceiptPaper";
import Footer from "../components/Footer";
import products from "../data/products.json";

/* ブランドを人気順にソート */
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

/* 商品の発売ステータスを判定 */
function getStatus(product) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const rw = product.releaseWeek || "未定";

  const monthMatch = rw.match(/(\d+)月/);
  if (!monthMatch) return "new"; // 未定は新作扱い

  const releaseMonth = parseInt(monthMatch[1]);
  if (releaseMonth < currentMonth) return "available";
  if (releaseMonth === currentMonth) return "new";
  return "upcoming";
}

/* 発売週文字列を比較用の数値に変換（小さい方が早い） */
function releaseWeekToNum(str) {
  if (!str || str === "未定") return 8888; // 未定は後ろ
  const m = str.match(/(\d+)月/);
  const w = str.match(/第(\d+)週/);
  const d = str.match(/(\d+)日/);
  const month = m ? parseInt(m[1]) : 99;
  if (w) return month * 100 + parseInt(w[1]);
  if (d) return month * 100 + Math.ceil(parseInt(d[1]) / 7);
  return month * 100 + 9;
}

/**
 * ソート関数
 * 「すべて」: HOT → 発売日近い順 → 未定 → 発売中（先月）
 * 「新作」:   HOTの発売日近い順 → 非HOTの発売日近い順
 * 「発売中」: 発売日が新しい順（最近のものが上）
 */
function sortProducts(list, tab) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  if (tab === "available") {
    // 発売中: 新しい順
    return [...list].sort((a, b) => releaseWeekToNum(b.releaseWeek) - releaseWeekToNum(a.releaseWeek));
  }

  if (tab === "new" || tab === "upcoming") {
    // 新作/発売予定: HOT優先 → 発売日近い順
    return [...list].sort((a, b) => {
      const aHot = a.hot ? 0 : 1;
      const bHot = b.hot ? 0 : 1;
      if (aHot !== bHot) return aHot - bHot;
      return releaseWeekToNum(a.releaseWeek) - releaseWeekToNum(b.releaseWeek);
    });
  }

  // 「すべて」: HOT → 発売日近い(今月) → 未定 → 発売中(先月)
  return [...list].sort((a, b) => {
    // 1. HOTを最優先
    const aHot = a.hot ? 0 : 1;
    const bHot = b.hot ? 0 : 1;
    if (aHot !== bHot) return aHot - bHot;

    // 2. ステータスで分類（new > upcoming > 未定 > available）
    const statusOrder = { new: 0, upcoming: 1, available: 2 };
    const aStatus = getStatus(a);
    const bStatus = getStatus(b);

    // 未定は new と available の間
    const aIsUndefined = !a.releaseWeek || a.releaseWeek === "未定" || !a.releaseWeek.match(/\d+月/);
    const bIsUndefined = !b.releaseWeek || b.releaseWeek === "未定" || !b.releaseWeek.match(/\d+月/);

    let aOrder, bOrder;
    if (aIsUndefined) aOrder = 1.5;
    else aOrder = statusOrder[aStatus] ?? 3;

    if (bIsUndefined) bOrder = 1.5;
    else bOrder = statusOrder[bStatus] ?? 3;

    if (aOrder !== bOrder) return aOrder - bOrder;

    // 3. 同じグループ内は発売日近い順
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

  let filtered = brand === "すべて" ? [...products] : products.filter((p) => p.brand === brand);

  if (statusTab !== "all") {
    filtered = filtered.filter((p) => getStatus(p) === statusTab);
  }

  filtered = sortProducts(filtered, statusTab);

  const hasUpcoming = products.some((p) => getStatus(p) === "upcoming");
  const visibleTabs = hasUpcoming ? STATUS_TABS : STATUS_TABS.filter((t) => t.key !== "upcoming");

  return (
    <>
      <Header brands={BRANDS} selected={brand} onSelect={setBrand} />

      <main className="px-2.5 pt-3 pb-20 relative" style={{ minHeight: "calc(100vh - 160px)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-50"
          style={{ backgroundImage: "radial-gradient(circle, #F0E6D6 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <div className="flex gap-1.5 mb-3 px-1 relative z-10 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button key={tab.key} onClick={() => setStatusTab(tab.key)}
              className="shrink-0 px-3 py-1.5 rounded-full font-pixel text-[10px] border-2 transition-all duration-150 cursor-pointer"
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
        <div key={statusTab + brand} className="flex flex-wrap gap-2.5 relative z-[1]">
          {filtered.map((p, i) => (
            <GachaMachine key={`${statusTab}-${p.id}`} product={p} index={i} onClick={setSelected} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-brand-sub font-pixel text-[10px] leading-[2.2]">
            🎪<br />このカテゴリの<br />商品はまだないよ
          </div>
        )}
      </main>
      <Footer />
      {selected && <ReceiptPaper product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
