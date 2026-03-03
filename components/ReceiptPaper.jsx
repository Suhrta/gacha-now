"use client";
import { useState, useEffect } from "react";

const zigzagTop = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='10'%3E%3Cpolygon points='0,10 8,0 16,10' fill='%23FFFDF8'/%3E%3C/svg%3E")`;
const zigzagBottom = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='10'%3E%3Cpolygon points='0,0 8,10 16,0' fill='%23FFFDF8'/%3E%3C/svg%3E")`;

/* 店舗検索URLを生成 */
function getShopSearchUrl(product) {
  if (!product.sourceUrl) return null;

  // バンダイ: 商品別店舗マップ（jan_codeから先頭13桁を取得）
  if (product.sourceUrl.includes("gashapon.jp")) {
    const janMatch = product.sourceUrl.match(/jan_code=(\d{13})/);
    if (janMatch) {
      return `https://gashapon.jp/shop/gplus_list.php?product_code=${janMatch[1]}`;
    }
    return "https://gashapon.jp/shop/gplus.php";
  }

  // タカトミ: 商品詳細ページ内に「この商品の取扱店舗」ボタンがある
  if (product.sourceUrl.includes("takaratomy-arts.co.jp")) {
    return product.sourceUrl;
  }

  return null;
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

  const receiptContent = (
    <>
      <div className="w-full shrink-0" style={{ height: 10, background: zigzagTop, backgroundSize: "16px 10px", backgroundRepeat: "repeat-x" }} />

      <div className="w-full" style={{ background: "#FFFDF8", padding: "10px 16px 16px", boxShadow: isPage ? "none" : "0 8px 32px rgba(74,55,40,0.2)", overflowY: "auto" }}>
        <div className="border-b-2 border-dashed border-cream-border mb-2.5 pb-2 text-center">
          <div className="font-pixel text-[10px] text-brand-accent tracking-[1px]">🏪 GACHA NOW 🏪</div>
          <div className="font-pixel text-[8px] text-brand-sub mt-1">新作情報</div>
        </div>

        <div className="rounded-lg overflow-hidden mb-2.5 border-2 border-cream-border">
          <img src={product.img} alt={product.name} className="w-full block" style={{ aspectRatio: "300/220", objectFit: "cover" }} />
        </div>

        <div className="mb-2.5">
          <div className="font-pixel text-[11px] text-brand-text leading-[1.9] mb-1.5">{product.name}</div>
          <span className="font-pixel text-[9px] px-2 py-0.5 rounded-md border"
            style={{ color: product.color, background: `${product.color}15`, borderColor: `${product.color}30` }}>
            {product.brand}
          </span>
        </div>

        <div className="border-b border-dashed border-cream-border mb-2" />

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
          className="block w-full py-3 mt-3 rounded-lg font-pixel text-[11px] text-white text-center no-underline"
          style={{
            background: `linear-gradient(135deg, ${product.color}, ${product.color}DD)`,
            boxShadow: `0 3px 0 ${product.color}66, 0 4px 12px ${product.color}33`,
          }}>
          🔗 公式サイトで詳しく見る
        </a>

        {/* 店舗検索ボタン */}
        {shopUrl && (
          <a href={shopUrl} target="_blank" rel="noopener noreferrer"
            className="block w-full py-3 mt-2 rounded-lg font-pixel text-[11px] text-center no-underline border-2"
            style={{
              background: "#FFFFFF",
              borderColor: "#5B8C6D",
              color: "#5B8C6D",
              boxShadow: "0 2px 8px rgba(91,140,109,0.15)",
            }}>
            🏪 近くの店舗を探す
            {product.sourceUrl && product.sourceUrl.includes("takaratomy-arts.co.jp") && (
              <div className="font-pixel text-[8px] mt-0.5 opacity-70">
                ※ページ内「この商品の取扱店舗」から検索
              </div>
            )}
          </a>
        )}

        {onClose && (
          <button onClick={close}
            className="block w-full py-2.5 mt-2 bg-transparent border-2 border-cream-border rounded-lg font-pixel text-[9px] text-brand-sub cursor-pointer">
            ✕ 閉じる
          </button>
        )}

        <div className="mt-2.5 border-t-2 border-dashed border-cream-border pt-1.5 text-center">
          <div className="font-pixel text-[7px] text-brand-sub">THANK YOU FOR PLAYING!</div>
          <div className="font-pixel text-[10px] text-cream-border mt-0.5">● ● ●</div>
        </div>
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
