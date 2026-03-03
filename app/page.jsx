"use client";
import { useState } from "react";
import Header from "../components/Header";
import GachaMachine from "../components/GachaMachine";
import ReceiptPaper from "../components/ReceiptPaper";
import Footer from "../components/Footer";
import products from "../data/products.json";

const BRANDS = ["すべて", ...Array.from(new Set(products.map((p) => p.brand)))];

/* 発売週文字列を比較用の数値に変換 例: "3月 第2週" → 302 */
function releaseWeekToNum(str) {
  if (!str) return 9999;
  const m = str.match(/(\d+)月/);
  const w = str.match(/第(\d+)週/);
  const d = str.match(/(\d+)日/);
  const month = m ? parseInt(m[1]) : 99;
  if (w) return month * 100 + parseInt(w[1]);
  if (d) return month * 100 + Math.ceil(parseInt(d[1]) / 7);
  return month * 100 + 9;
}

/* 商品の発売ステータスを判定 */
function getStatus(product) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const rw = product.releaseWeek || "未定";

  const monthMatch = rw.match(/(\d+)月/);
  if (!monthMatch) return "new"; // 未定は新作扱い

  const releaseMonth = parseInt(monthMatch[1]);

  if (releaseMonth < currentMonth) return "available"; // 先月以前 = 発売中
  if (releaseMonth === currentMonth) return "new"; // 今月 = 新作
  return "upcoming"; // 来月以降 = 発売予定
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
  const [sortByDate, setSortByDate] = useState(false);
  const [statusTab, setStatusTab] = useState("all");

  let filtered = brand === "すべて" ? [...products] : products.filter((p) => p.brand === brand);

  // ステータスフィルタ
  if (statusTab !== "all") {
    filtered = filtered.filter((p) => getStatus(p) === statusTab);
  }

  if (sortByDate) {
    filtered = [...filtered].sort((a, b) => releaseWeekToNum(a.releaseWeek) - releaseWeekToNum(b.releaseWeek));
  }

  return (
    <>
      <Header brands={BRANDS} selected={brand} onSelect={setBrand}
        sortByDate={sortByDate} onToggleSort={() => setSortByDate(!sortByDate)} />

      <main className="px-2.5 pt-3 pb-20 relative" style={{ minHeight: "calc(100vh - 160px)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-50"
          style={{ backgroundImage: "radial-gradient(circle, #F0E6D6 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        {/* 発売中/新作/発売予定 タブ */}
        <div className="flex gap-1.5 mb-3 px-1 relative z-10 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
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
        <div className="flex flex-wrap gap-2.5 relative z-[1]">
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
