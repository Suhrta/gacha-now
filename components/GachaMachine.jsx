"use client";
import { useState, useEffect } from "react";

export default function GachaMachine({ product, index, onClick }) {
  const [vis, setVis] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVis(true), index * 70);
    return () => clearTimeout(t);
  }, [index]);

  const hasImage = product.img && !product.img.includes("placehold");
  const color = product.color || "#E8756D";

  return (
    <div
      onClick={() => onClick && onClick(product)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      className="block"
      style={{
        width: "calc(50% - 5px)", cursor: "pointer",
        opacity: vis ? 1 : 0,
        transform: vis ? (pressed ? "scale(0.97)" : "scale(1)") : "translateY(12px)",
        transition: pressed ? "transform 0.1s" : "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        WebkitTapHighlightColor: "transparent",
      }}>

      {/* 筐体ボディ */}
      <div className="relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #F8F4EF 100%)",
          borderRadius: "16px 16px 12px 12px",
          border: "2.5px solid #E8DDD0",
          boxShadow: pressed
            ? "0 2px 4px rgba(74,55,40,0.06)"
            : "0 4px 16px rgba(74,55,40,0.08), inset 0 1px 0 #FFFFFF",
          transition: "box-shadow 0.15s",
        }}>

        {/* 筐体トップ（色付きヘッダー） */}
        <div style={{
          background: `linear-gradient(135deg, ${color}, ${color}CC)`,
          height: 6,
          borderRadius: "13px 13px 0 0",
        }} />

        {/* HOTバッジ */}
        {product.hot && (
          <div className="absolute top-2 right-2 z-10 font-pixel text-[8px] px-1.5 py-0.5 rounded-md animate-hot"
            style={{ background: "#E8756D", color: "#fff" }}>
            🔥 HOT
          </div>
        )}

        {/* 発売週バッジ */}
        {product.releaseWeek && (
          <div className="absolute top-2 left-2 z-10 font-pixel text-[9px] px-1.5 py-0.5 rounded-md pointer-events-none"
            style={{ background: "rgba(255,255,255,0.92)", border: "1px solid #E8DDD0", color: "#6B5B4E" }}>
            📅 {product.releaseWeek}
          </div>
        )}

        {/* カプセル窓（商品画像） */}
        <div className="mx-2.5 mt-2 pointer-events-none" style={{
          borderRadius: "10px",
          overflow: "hidden",
          border: "2px solid #E8DDD0",
          background: "#FFF8F0",
        }}>
          {hasImage ? (
            <img src={product.img} alt={product.name} className="w-full block"
              style={{ aspectRatio: "1/1", objectFit: "cover", objectPosition: "top" }} />
          ) : (
            <div className="w-full flex items-center justify-center" style={{ aspectRatio: "1/1", background: "#FFF8F0" }}>
              <span style={{ fontSize: 40 }}>🎪</span>
            </div>
          )}
        </div>

        {/* 商品名 */}
        <div className="px-2.5 pt-2 pointer-events-none" style={{ minHeight: 42 }}>
          <div className="font-pixel text-[10px] text-brand-text text-center leading-[1.7] line-clamp-2">
            {product.name}
          </div>
        </div>

        {/* ハンドル＋価格エリア */}
        <div className="flex items-center px-2.5 pb-1 pointer-events-none" style={{ height: 40 }}>
          {/* 左：ハンドル */}
          <div className="flex items-center justify-center" style={{ width: 32, height: 32 }}>
            <div style={{
              width: 26, height: 26,
              borderRadius: "50%",
              border: `3px solid ${color}`,
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 2px 4px ${color}22`,
            }}>
              <div style={{
                width: 8, height: 8,
                borderRadius: "50%",
                background: color,
              }} />
            </div>
          </div>

          {/* 右：価格＋種類 */}
          <div className="flex-1 flex flex-col items-end gap-0.5">
            <span className="font-pixel text-[12px] font-bold" style={{ color }}>
              ¥{product.price}
            </span>
            <span className="font-pixel text-[9px] text-brand-sub bg-cream-dark px-1.5 py-0.5 rounded">
              全{product.types}種
            </span>
          </div>
        </div>

        {/* 取り出し口（左下） */}
        <div className="px-2.5 pb-2 pointer-events-none">
          <div style={{
            width: 32,
            height: 14,
            background: "#3D3228",
            borderRadius: "0 0 8px 8px",
            border: "2px solid #2A231C",
            borderTop: "none",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
          }} />
        </div>
      </div>
    </div>
  );
}
