"use client";
import { useState } from "react";
import Header from "../components/Header";
import GachaMachine from "../components/GachaMachine";
import ReceiptPaper from "../components/ReceiptPaper";
import Footer from "../components/Footer";
import products from "../data/products.json";

const BRANDS = ["すべて", ...Array.from(new Set(products.map((p) => p.brand)))];

export default function HomePage() {
  const [brand, setBrand] = useState("すべて");
  const [selected, setSelected] = useState(null);

  const filtered = brand === "すべて" ? products : products.filter((p) => p.brand === brand);

  return (
    <>
      <Header brands={BRANDS} selected={brand} onSelect={setBrand} />

      <main className="px-2.5 pt-3 pb-20 relative" style={{ minHeight: "calc(100vh - 160px)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-50"
          style={{ backgroundImage: "radial-gradient(circle, #F0E6D6 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <div className="font-pixel text-[7px] text-brand-sub mb-2.5 px-1 relative">
          {filtered.length}けん ── タップ で くわしく！
        </div>

        <div className="flex flex-wrap gap-2.5 relative z-[1]">
          {filtered.map((p, i) => (
            <GachaMachine key={p.id} product={p} index={i} onClick={setSelected} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-10 text-brand-sub font-pixel text-[8px] leading-[2.2]">
            😢<br />この カテゴリの<br />しんさくは まだ ないよ
          </div>
        )}
      </main>

      <Footer />

      {selected && <ReceiptPaper product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
