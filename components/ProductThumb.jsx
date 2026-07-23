"use client";
import { useState } from "react";
import Image from "next/image";
import { mainImageUrl } from "../lib/images";

/**
 * サムネイル用の商品画像。
 *
 * next/image を通して表示サイズまで縮小・WebP化する。仕入れ元の画像は
 * バンダイ以外が1200px・700KB前後あり、サムネイルに使うには過大なため。
 * バンダイだけは元が560pxと小さいので mainImageUrl で1200px版に差し替える。
 *
 * 仕入れ元CDNが落ちて画像URLが画像を返さない場合（タカラトミーアーツのメンテ中は
 * HTTP 200 + HTMLのメンテ案内が返るため、ブラウザ上は壊れた画像になる）でも、
 * 壊れアイコンを出さずに控えめなプレースホルダへ倒す。
 * サーバーコンポーネントからは onError を渡せないため、この薄いクライアント境界を挟む。
 */
export default function ProductThumb({
  src,
  alt,
  className = "",
  sizes = "(max-width: 768px) 50vw, 240px",
}) {
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
    <Image
      src={mainImageUrl(src)}
      alt={alt}
      width={384}
      height={384}
      sizes={sizes}
      loading="lazy"
      className={className}
      onError={() => setBroken(true)}
    />
  );
}
