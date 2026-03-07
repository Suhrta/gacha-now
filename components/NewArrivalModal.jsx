"use client";
import { useState, useEffect } from "react";

export default function NewArrivalModal({ products, onOpenReceipt }) {
  const [show, setShow] = useState(false);
  const [product, setProduct] = useState(null);

  useEffect(() => {
    // 1日1回だけ表示
    const today = new Date().toISOString().split("T")[0];
    const lastShown = localStorage.getItem("gacha-modal-date");
    if (lastShown === today) return;

    // HOT商品で descriptionがあるものを優先
    const hotWithDesc = products.filter((p) => p.hot && p.description);
    const withDesc = products.filter((p) => p.description);
    const pool = hotWithDesc.length > 0 ? hotWithDesc : withDesc.length > 0 ? withDesc : products.filter((p) => p.hot);

    if (pool.length === 0) return;

    // 日付ベースでローテーション
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const pick = pool[dayOfYear % pool.length];

    setProduct(pick);
    setShow(true);
    localStorage.setItem("gacha-modal-date", today);
  }, [products]);

  if (!show || !product) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        padding: "20px",
      }}
      onClick={() => setShow(false)}
    >
      <div
        style={{
          background: "#FFFAF3",
          borderRadius: 20,
          maxWidth: 360,
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 16px 48px rgba(74,55,40,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* トップライン */}
        <div style={{ height: 6, background: "linear-gradient(135deg, #E8756D, #E8756DCC)" }} />

        {/* ヘッダー */}
        <div style={{ textAlign: "center", padding: "14px 16px 8px" }}>
          <div className="font-pixel" style={{ fontSize: 14, color: "#E8756D", letterSpacing: 2 }}>
            🎪 今日の注目ガチャ
          </div>
        </div>

        {/* 商品画像 */}
        {product.img && (
          <div style={{ margin: "0 16px", borderRadius: 12, overflow: "hidden", border: "2px solid #E8DDD0" }}>
            <img
              src={product.img}
              alt={product.name}
              style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", objectPosition: "top", display: "block" }}
            />
          </div>
        )}

        {/* 商品名 */}
        <div style={{ padding: "12px 20px 4px", textAlign: "center" }}>
          <div className="font-pixel" style={{ fontSize: 13, color: "#4A3728", lineHeight: 1.6 }}>
            {product.name}
          </div>
        </div>

        {/* AIコメント */}
        {product.description && (
          <div style={{ margin: "4px 16px 0", padding: "10px 14px", background: "#FFF4E8", borderRadius: 10, border: "1.5px solid #F0E6D6" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>💬</span>
              <div className="font-pixel" style={{ fontSize: 10, color: "#6B5B4E", lineHeight: 1.7 }}>
                {product.description}
              </div>
            </div>
          </div>
        )}

        {/* 価格・種類 */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, padding: "10px 16px 4px" }}>
          <span className="font-pixel" style={{ fontSize: 11, color: "#9B8978" }}>
            💰 {product.price}円
          </span>
          <span className="font-pixel" style={{ fontSize: 11, color: "#9B8978" }}>
            🎯 全{product.types}種
          </span>
          <span className="font-pixel" style={{ fontSize: 11, color: "#9B8978" }}>
            📅 {product.releaseWeek}
          </span>
        </div>

        {/* ボタン */}
        <div style={{ padding: "10px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => { setShow(false); onOpenReceipt && onOpenReceipt(product); }}
            className="font-pixel"
            style={{
              width: "100%",
              padding: "10px 0",
              background: "#E8756D",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            くわしく見る →
          </button>
          <button
            onClick={() => setShow(false)}
            className="font-pixel"
            style={{
              width: "100%",
              padding: "8px 0",
              background: "transparent",
              color: "#9B8978",
              border: "2px solid #E8DDD0",
              borderRadius: 10,
              fontSize: 9,
              cursor: "pointer",
            }}
          >
            とじる
          </button>
        </div>
      </div>
    </div>
  );
}
