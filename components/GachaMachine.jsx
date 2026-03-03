"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

function MiniCapsule({ size, rot, opacity, color, style }) {
  return (
    <div style={{
      width: size, height: size * 1.15,
      transform: `rotate(${rot}deg)`, opacity,
      pointerEvents: "none", zIndex: 2, position: "absolute", ...style,
    }}>
      <div style={{
        width: size, height: size * 0.55,
        borderRadius: `${size}px ${size}px 0 0`,
        background: `${color}55`,
      }} />
      <div style={{
        width: size, height: size * 0.6,
        borderRadius: `0 0 ${size}px ${size}px`,
        background: color,
      }} />
    </div>
  );
}

/* 画像がない商品用の大きなカプセルSVG */
function CapsulePlaceholder({ color }) {
  const topColor = `${color}88`;
  const bottomColor = color || "#E8756D";
  return (
    <div className="w-full flex items-center justify-center" style={{ aspectRatio: "300/200", background: "#FFF8F0" }}>
      <svg width="80" height="100" viewBox="0 0 80 100">
        <ellipse cx="40" cy="38" rx="30" ry="30" fill={topColor} />
        <rect x="10" y="38" width="60" height="2" fill="#FFF8F0" />
        <ellipse cx="40" cy="62" rx="30" ry="30" fill={bottomColor} />
        <ellipse cx="30" cy="30" rx="6" ry="8" fill="#FFFFFF55" transform="rotate(-20, 30, 30)" />
      </svg>
    </div>
  );
}

export default function GachaMachine({ product, index, onClick }) {
  const [vis, setVis] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVis(true), index * 70);
    return () => clearTimeout(t);
  }, [index]);

  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick(product);
    }
  };

  const hasImage = product.img && !product.img.includes("placehold");

  return (
    <Link href={`/item/${product.id}`} onClick={handleClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="block"
      style={{
        width: "calc(50% - 5px)", cursor: "pointer", textDecoration: "none",
        opacity: vis ? 1 : 0,
        transform: vis ? (pressed ? "scale(0.97)" : "scale(1)") : "translateY(12px)",
        transition: pressed ? "transform 0.1s" : "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
      <div className="bg-white rounded-[14px] border-2 border-cream-border overflow-hidden relative"
        style={{ boxShadow: pressed ? "0 2px 8px rgba(74,55,40,0.06)" : "0 4px 16px rgba(74,55,40,0.06)", transition: "box-shadow 0.15s" }}>

        {product.hot && (
          <div className="absolute top-2 right-2 z-10 bg-brand-accent text-white font-pixel text-[9px] px-1.5 py-0.5 rounded-md animate-hot">
            🔥 HOT
          </div>
        )}

        {/* 発売日バッジ（左上） */}
        {product.releaseWeek && (
          <div className="absolute top-2 left-2 z-10 bg-white/90 border border-cream-border text-brand-text font-pixel text-[10px] px-1.5 py-0.5 rounded-md"
            style={{ backdropFilter: "blur(4px)" }}>
            📅 {product.releaseWeek}
          </div>
        )}

        <div className="relative overflow-hidden border-b-2 border-dashed border-cream-border">
          <MiniCapsule size={11} rot={-25} opacity={0.45} color={product.color} style={{ bottom: 4, left: 6 }} />
          <MiniCapsule size={9} rot={18} opacity={0.35} color={product.color} style={{ bottom: 3, right: 8 }} />
          {hasImage ? (
            <img src={product.img} alt={product.name} className="w-full block"
              style={{ aspectRatio: "300/200", objectFit: "contain", background: "#FFF8F0" }} />
          ) : (
            <CapsulePlaceholder color={product.color} />
          )}
        </div>

        <div className="px-2 py-2 flex items-center justify-center" style={{ height: 62 }}>
          <div className="font-pixel text-[11px] text-brand-text text-center leading-[1.8] line-clamp-3">
            {product.name}
          </div>
        </div>

        <div className="px-2.5 pb-1 flex justify-between items-center">
          <span className="font-pixel text-[12px] font-bold" style={{ color: product.color }}>
            ¥{product.price}
          </span>
          <span className="font-pixel text-[10px] text-brand-sub bg-cream-dark px-1.5 py-0.5 rounded">
            全{product.types}種
          </span>
        </div>

        <div className="flex justify-center pb-2">
          <div className="rounded-full" style={{
            width: 28, height: 10,
            background: `linear-gradient(180deg, ${product.color}CC, ${product.color}88)`,
            boxShadow: `0 2px 0 ${product.color}44`,
          }} />
        </div>
      </div>
    </Link>
  );
}
