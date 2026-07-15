"use client";
import { useState } from "react";

/**
 * サムネイル用の商品画像。
 *
 * 仕入れ元CDNが落ちて画像URLが画像を返さない場合（タカラトミーアーツのメンテ中は
 * HTTP 200 + HTMLのメンテ案内が返るため、ブラウザ上は壊れた画像になる）でも、
 * 壊れアイコンを出さずに控えめなプレースホルダへ倒す。
 * サーバーコンポーネントからは onError を渡せないため、この薄いクライアント境界を挟む。
 */
export default function ProductThumb({ src, alt, className = "" }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-cream-dark`}
        aria-hidden="true"
      >
        <span style={{ fontSize: 20 }}>🔒</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setBroken(true)}
    />
  );
}
