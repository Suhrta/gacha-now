"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const zigzagTop = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='10'%3E%3Cpolygon points='0,10 8,0 16,10' fill='%23FFFDF8'/%3E%3C/svg%3E")`;
const zigzagBottom = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='10'%3E%3Cpolygon points='0,0 8,10 16,0' fill='%23FFFDF8'/%3E%3C/svg%3E")`;

/* 設置場所検索URL生成 */
function getShopSearchUrl(product) {
  if (!product.sourceUrl) return null;
  if (product.sourceUrl.includes("gashapon.jp")) {
    const janMatch = product.sourceUrl.match(/jan_code=(\d{13})/);
    if (janMatch) {
      return `https://gashapon.jp/shop/gplus_list.php?product_code=${janMatch[1]}`;
    }
    return "https://gashapon.jp/shop/gplus.php";
  }
  if (product.sourceUrl.includes("takaratomy-arts.co.jp")) {
    return product.sourceUrl;
  }
  return null;
}

/* 画像スワイプコンポーネント */
function ImageSwiper({ images, name }) {
  const [current, setCurrent] = useState(0);
  const [validImages, setValidImages] = useState([images[0]]);
  const [checked, setChecked] = useState(false);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // バンダイの連番画像を順次読み込み確認
  useEffect(() => {
    if (images.length <= 1) { setChecked(true); return; }
    let cancelled = false;
    const confirmed = [images[0]];
    const checkImages = async () => {
      for (let i = 1; i < images.length; i++) {
        if (cancelled) break;
        const ok = await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = images[i];
        });
        if (ok) confirmed.push(images[i]);
        else break; // 連番なので1つ失敗したら以降も存在しない
      }
      if (!cancelled) {
        setValidImages([...confirmed]);
        setChecked(true);
      }
    };
    checkImages();
    return () => { cancelled = true; };
  }, [images]);

  const validCount = validImages.length;

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    setDragging(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!dragging) return;
    const delta = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = delta;
    setDragOffset(delta);
  }, [dragging]);

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
    const threshold = 50;
    if (touchDeltaX.current < -threshold && current < validCount - 1) {
      setCurrent((p) => p + 1);
    } else if (touchDeltaX.current > threshold && current > 0) {
      setCurrent((p) => p - 1);
    }
    setDragOffset(0);
  }, [current, validCount]);

  // 画像1枚の場合はスワイプなし
  if (validCount <= 1 && checked) {
    return (
      <div className="rounded-lg overflow-hidden mb-2 border-2 border-cream-border">
        <img src={validImages[0]} alt={name} className="w-full block"
          style={{ aspectRatio: "1/1", objectFit: "cover", objectPosition: "top" }} />
      </div>
    );
  }

  return (
    <div className="mb-2 relative">
      {/* スワイプエリア */}
      <div
        className="rounded-lg overflow-hidden border-2 border-cream-border relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(calc(-${current * 100}% + ${dragOffset}px))`,
            transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          {validImages.map((src, i) => (
            <div key={i} className="w-full shrink-0">
              <img
                src={src}
                alt={`${name} ${i + 1}`}
                className="w-full block"
                style={{ aspectRatio: "1/1", objectFit: "cover", objectPosition: "top" }}
              />
            </div>
          ))}
        </div>

        {/* 右端チラ見えグラデーション（1枚目 & 複数枚ある時） */}
        {current === 0 && validCount > 1 && !dragging && (
          <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none"
            style={{
              background: "linear-gradient(to left, rgba(255,253,248,0.6), transparent)",
            }}
          />
        )}

        {/* 枚数表示（右上） */}
        {validCount > 1 && (
          <div className="absolute top-2 right-2 font-pixel text-[8px] px-1.5 py-0.5 rounded-md pointer-events-none"
            style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}>
            {current + 1}/{validCount}
          </div>
        )}
      </div>

      {/* ドットインジケーター */}
      {validCount > 1 && validCount <= 12 && (
        <div className="flex justify-center gap-1 mt-1.5">
          {validImages.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === current ? 14 : 5,
                height: 5,
                background: i === current ? "#E8756D" : "#E0D6C8",
                borderRadius: i === current ? 3 : "50%",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReceiptPaper({ product, onClose, isPage = false }) {
  const [show, setShow] = useState(isPage);

  useEffect(() => {
    if (!isPage) requestAnimationFrame(() => setShow(true));
  }, [isPage]);

  const close = () => {
    if (!onClose) return;
    setShow(false);
    setTimeout(onClose, 250);
  };

  const shopUrl = getShopSearchUrl(product);
  const images = product.images && product.images.length > 0
    ? product.images
    : (product.img ? [product.img] : []);

  const receiptContent = (
    <>
      <div className="w-full shrink-0" style={{ height: 10, background: zigzagTop, backgroundSize: "16px 10px", backgroundRepeat: "repeat-x" }} />

      <div className="w-full" style={{ background: "#FFFDF8", padding: "8px 16px 12px", boxShadow: isPage ? "none" : "0 8px 32px rgba(74,55,40,0.2)", overflowY: "auto" }}>

        {/* 画像スワイプエリア */}
        <ImageSwiper images={images} name={product.name} />

        <div className="mb-2">
          <div className="font-pixel text-[11px] text-brand-text leading-[1.9] mb-1">{product.name}</div>
        </div>

        <div className="border-b border-dashed border-cream-border mb-1.5" />

        {[
          { l: "価格", v: `¥${product.price}` },
          { l: "種類", v: `全${product.types}種` },
          { l: "発売", v: product.releaseWeek },
        ].map((r) => (
          <div key={r.l} className="flex justify-between py-1.5 border-b border-dotted border-cream-border">
            <span className="font-pixel text-[9px] text-brand-sub">{r.l}</span>
            <span className="font-pixel text-[10px] text-brand-text">{r.v}</span>
          </div>
        ))}

        {/* 公式サイトボタン */}
        <a href={product.sourceUrl || "#"} target="_blank" rel="noopener noreferrer"
          className="block w-full py-2.5 mt-2 rounded-lg font-pixel text-[11px] text-white text-center no-underline"
          style={{
            background: `linear-gradient(135deg, ${product.color}, ${product.color}DD)`,
            boxShadow: `0 3px 0 ${product.color}66, 0 4px 12px ${product.color}33`,
          }}>
          🔗 公式サイトで詳しく見る
        </a>

        {/* 設置場所検索ボタン */}
        {shopUrl && (
          <a href={shopUrl} target="_blank" rel="noopener noreferrer"
            className="block w-full py-2.5 mt-1.5 rounded-lg font-pixel text-[11px] text-center no-underline border-2"
            style={{
              background: "#FFFFFF",
              borderColor: "#5B8C6D",
              color: "#5B8C6D",
              boxShadow: "0 2px 8px rgba(91,140,109,0.15)",
            }}>
            📍 近くの設置場所を探す
            {product.sourceUrl && product.sourceUrl.includes("takaratomy-arts.co.jp") && (
              <div className="font-pixel text-[8px] mt-0.5 opacity-70">
                →ページ内「この商品の取扱店舗」から検索
              </div>
            )}
          </a>
        )}

        {onClose && (
          <button onClick={close}
            className="block w-full py-2 mt-1.5 bg-transparent border-2 border-cream-border rounded-lg font-pixel text-[9px] text-brand-sub cursor-pointer">
            ✕ 閉じる
          </button>
        )}
      </div>

      <div className="w-full shrink-0" style={{ height: 10, background: zigzagBottom, backgroundSize: "16px 10px", backgroundRepeat: "repeat-x" }} />
    </>
  );

  if (isPage) {
    return (
      <div className="max-w-[340px] mx-auto py-6 px-4 flex flex-col items-center">
        {receiptContent}
      </div>
    );
  }

  return (
    <div onClick={close}
      className="fixed inset-0 z-[100] flex items-center justify-center py-5 transition-all duration-250"
      style={{
        background: show ? "rgba(74,55,40,0.6)" : "rgba(74,55,40,0)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
      }}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-w-[340px] w-[88%] flex flex-col max-h-[82vh]"
        style={{
          transform: show ? "scaleY(1) scaleX(1)" : "scaleY(0) scaleX(0.8)",
          opacity: show ? 1 : 0, transformOrigin: "top center",
          transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s",
        }}>
        {receiptContent}
      </div>
    </div>
  );
}
