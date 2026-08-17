"use client";
import { useEffect, useState } from "react";
import { thumbSources } from "../lib/images";

/**
 * サムネイル用の商品画像。
 *
 * 表示元は lib/images.js の thumbSources が決める（自前生成の縮小版 →
 * 仕入れ元CDNの元画像）。next/image は通さない。Vercelの画像最適化は
 * Hobbyの無料枠を使い切ると新規変換が402で止まり、新商品ほど画像が
 * 出なくなるため（2026-08）。
 *
 * 候補URLが読めなかった場合は次の候補へ、尽きたら控えめなプレースホルダへ倒す。
 * 仕入れ元CDNが落ちていると壊れアイコンになる（タカラトミーアーツはメンテ中に
 * HTTP 200 + HTMLの案内を返すのでブラウザ上は壊れた画像になる）ため。
 * サーバーコンポーネントからは onError を渡せないので、この薄いクライアント境界を挟む。
 */
export default function ProductThumb({ product, alt, className = "" }) {
  const [step, setStep] = useState(0);
  const sources = thumbSources(product);

  // 別商品が同じ枠に再利用されたら失敗の記録を持ち越さない
  useEffect(() => setStep(0), [product?.id]);

  const src = sources[step];

  if (!src) {
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
      alt={alt ?? product.name}
      width={480}
      height={480}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setStep((s) => s + 1)}
    />
  );
}
