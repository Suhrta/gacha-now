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
  const month = m ? parseInt(m[1]) : 99;
  const week = w ? parseInt(w[1]) : 9;
  return month * 100 + week;
}

export default function HomePage() {
  const [brand, setBrand] = useState("すべて");
  const [selected, setSelected] = useState(null);
  const [sortByDate, setSortByDate] = useState(false);

  let filtered = brand === "すべて" ? [...products] : products.filter((p) => p.brand === brand);

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

        <div className="font-pixel text-[11px] text-brand-sub mb-2.5 px-1 relative">
          {filtered.length}件 ── タップで詳しく！
        </div>

        <div className="flex flex-wrap gap-2.5 relative z-[1]">
          {filtered.map((p, i) => (
            <GachaMachine key={p.id} product={p} index={i} onClick={setSelected} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-10 text-brand-sub font-pixel text-[10px] leading-[2.2]">
            😢<br />このカテゴリの<br />新作はまだないよ
          </div>
        )}
      </main>

      <Footer />

      {selected && <ReceiptPaper product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
