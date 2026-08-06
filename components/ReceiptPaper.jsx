"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import NoImage from "./NoImage";
import { rakutenSearchUrl, amazonSearchUrl, amazonQuery } from "../lib/affiliate";
import { getStatus } from "../lib/product-status";
import ProductName from "./ProductName";

// rakuten-links.json はコンプセットバッジ表示にのみ使うため遅延読み込みする
// （初回レシート表示時に非同期チャンクとして取得。初期バンドルには含めない）
let rakutenLinksCache = null;

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

/* GA4 アフィリエイトクリック計測（RakutenLinks と同一イベント名・パラメータ） */
function trackAffiliateClick(affiliate, intent, product) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "affiliate_click", {
    affiliate,
    link_intent: intent,
    item_id: product.id,
    item_name: product.name,
    item_brand: product.brand,
    search_query: product.name,
    value: product.price || 0,
    currency: "JPY",
  });
}

/* 画像ギャラリーコンポーネント（スワイプ + タップ両対応） */
function ImageSwiper({ images, name }) {
  const [current, setCurrent] = useState(0);
  const [validImages, setValidImages] = useState([images[0]]);
  const [checked, setChecked] = useState(false);
  // 実際に表示して失敗したURL。1枚目は事前検証せず楽観的に描画する（正常な大多数の
  // 表示を遅らせないため）ので、壊れていた場合はここに入れてプレースホルダへ倒す。
  const [failed, setFailed] = useState(() => new Set());
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDeltaX = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef(null);

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
        else break;
      }
      if (!cancelled) {
        setValidImages([...confirmed]);
        setChecked(true);
      }
    };
    checkImages();
    return () => { cancelled = true; };
  }, [images]);

  const markFailed = useCallback((src) => {
    setFailed((prev) => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  }, []);

  const displayImages = validImages.filter((src) => !failed.has(src));
  const validCount = displayImages.length;

  // 壊れた画像を除いた結果、現在位置が範囲外になることがある
  useEffect(() => {
    if (current > validCount - 1) setCurrent(Math.max(0, validCount - 1));
  }, [current, validCount]);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    setDragging(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!dragging) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
    touchDeltaX.current = deltaX;
    setDragOffset(deltaX);
  }, [dragging]);

  const handleTouchEnd = useCallback((e) => {
    setDragging(false);
    const absDelta = Math.abs(touchDeltaX.current);

    if (absDelta > 50) {
      if (touchDeltaX.current < -50 && current < validCount - 1) {
        setCurrent((p) => p + 1);
      } else if (touchDeltaX.current > 50 && current > 0) {
        setCurrent((p) => p - 1);
      }
    } else if (absDelta < 10) {
      if (validCount > 1 && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.changedTouches?.[0]?.clientX || 0) - rect.left;
        if (x > rect.width / 2) {
          setCurrent((p) => Math.min(p + 1, validCount - 1));
        } else {
          setCurrent((p) => Math.max(p - 1, 0));
        }
      }
    }
    setDragOffset(0);
  }, [current, validCount]);

  const handleClick = useCallback((e) => {
    if (validCount <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width / 2) {
      setCurrent((p) => Math.min(p + 1, validCount - 1));
    } else {
      setCurrent((p) => Math.max(p - 1, 0));
    }
  }, [validCount]);

  // 全滅（仕入れ元CDN障害など）→ 壊れアイコンではなく案内を出す
  if (validCount === 0) {
    return (
      <div className="rounded-lg overflow-hidden mb-2 border-2 border-cream-border">
        <NoImage />
      </div>
    );
  }

  if (validCount <= 1 && checked) {
    return (
      <div className="rounded-lg overflow-hidden mb-2 border-2 border-cream-border">
        <img src={displayImages[0]} alt={name} className="w-full block"
          onError={() => markFailed(displayImages[0])}
          style={{ aspectRatio: "1/1", objectFit: "cover", objectPosition: "top" }} />
      </div>
    );
  }

  return (
    <div className="mb-2 relative">
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden border-2 border-cream-border relative cursor-pointer"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(calc(-${current * 100}% + ${dragging ? dragOffset : 0}px))`,
            transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          {displayImages.map((src, i) => (
            <div key={src} className="w-full shrink-0">
              <img
                src={src}
                alt={`${name} ${i + 1}`}
                className="w-full block"
                draggable={false}
                onError={() => markFailed(src)}
                style={{ aspectRatio: "1/1", objectFit: "cover", objectPosition: "top", userSelect: "none" }}
              />
            </div>
          ))}
        </div>

        {current === 0 && validCount > 1 && !dragging && (
          <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none"
            style={{ background: "linear-gradient(to left, rgba(255,253,248,0.6), transparent)" }} />
        )}

        {validCount > 1 && (
          <>
            {current > 0 && (
              <div className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none font-sans text-[16px]"
                style={{ color: "rgba(0,0,0,0.2)" }}>‹</div>
            )}
            {current < validCount - 1 && (
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none font-sans text-[16px]"
                style={{ color: "rgba(0,0,0,0.2)" }}>›</div>
            )}
          </>
        )}

        {validCount > 1 && (
          <div className="absolute top-2 right-2 font-sans text-[8px] px-1.5 py-0.5 rounded-md pointer-events-none"
            style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}>
            {current + 1}/{validCount}
          </div>
        )}
      </div>

      {validCount > 1 && validCount <= 12 && (
        <div className="flex justify-center gap-1 mt-1.5">
          {displayImages.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-200"
              style={{
                width: i === current ? 14 : 5, height: 5,
                background: i === current ? "#E8756D" : "#E0D6C8",
                borderRadius: i === current ? 3 : "50%",
              }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReceiptPaper({ product, onClose, isPage = false, isFavorite = false, onToggleFavorite }) {
  const [show, setShow] = useState(isPage);
  const [compset, setCompset] = useState(null);

  useEffect(() => {
    if (!isPage) requestAnimationFrame(() => setShow(true));
  }, [isPage]);

  // レシート表示を計測（affiliate_click の分母 = CTR算出用）
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", "receipt_view", {
      view_type: isPage ? "page" : "modal",
      item_id: product.id,
      item_name: product.name,
      item_brand: product.brand,
    });
  }, [product.id, product.name, product.brand, isPage]);

  // コンプセット取扱バッジ用データ（実在検証済みの rakuten-links.json を遅延取得）
  useEffect(() => {
    let cancelled = false;
    const apply = (data) => {
      if (!cancelled) setCompset((data && data[product.id] && data[product.id].compset) || null);
    };
    if (rakutenLinksCache) {
      apply(rakutenLinksCache);
    } else {
      import("../data/rakuten-links.json")
        .then((m) => { rakutenLinksCache = m.default || m; apply(rakutenLinksCache); })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [product.id]);

  // モーダル表示中は背景スクロールをロック
  useEffect(() => {
    if (isPage) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
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

  const placement = isPage ? "receipt_page" : "receipt_modal";
  // 発売ステータスに合わせてCTA文言を変える（買えるか？という不安に答える）
  const rakutenLabel = getStatus(product) === "upcoming" ? "📅 楽天で予約できるか見る" : "🛒 楽天で在庫を見る";

  const clampStyle = isPage
    ? undefined
    : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" };

  const closeBtn = onClose && (
    <button
      onClick={close}
      aria-label="閉じる"
      className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full border-2 cursor-pointer transition-all duration-150"
      style={{
        background: "#FFFFFF",
        borderColor: "#E8DDD0",
        color: "#9B8978",
        fontSize: 15,
        lineHeight: 1,
      }}
    >
      ✕
    </button>
  );

  // モバイル: タイトル横に✕（縦スペース節約）
  const nameRowMobile = (
    <div className="flex items-start gap-2 mb-1.5">
      <div className="flex-1 font-sans text-[13px] font-bold text-brand-text leading-snug" style={clampStyle}>
        <ProductName name={product.name} />
      </div>
      {closeBtn}
    </div>
  );

  // PC: ✕を右上の独立行にし、一段下からタイトル（右カラムに余白があるため）
  const nameRowDesktop = (
    <div className="mb-2">
      {closeBtn && <div className="flex justify-end">{closeBtn}</div>}
      <div
        className={`font-sans text-base font-bold text-brand-text leading-snug ${onClose ? "mt-1" : ""}`}
        style={clampStyle}
      >
        <ProductName name={product.name} />
      </div>
    </div>
  );

  const receiptContent = (
    <>
      <div className="w-full shrink-0" style={{ height: 10, background: zigzagTop, backgroundSize: "16px 10px", backgroundRepeat: "repeat-x" }} />

      <div className="w-full px-4 pt-2 pb-3 md:px-6 md:pt-4 md:pb-4" style={{ background: "#FFFDF8", boxShadow: isPage ? "none" : "0 8px 32px rgba(74,55,40,0.2)", overflowY: "auto" }}>
        {/* モバイル: 商品名を最上部に（CTAまでの視線距離を短縮） */}
        <div className="md:hidden">{nameRowMobile}</div>

        <div className="md:flex md:flex-row md:gap-5">
          {/* 左カラム: 画像 */}
          <div className="md:w-[300px] lg:w-[360px] md:shrink-0">
            {/* 画像ギャラリー */}
            {images.length > 0 ? (
              <ImageSwiper images={images} name={product.name} />
            ) : (
              <div className="rounded-lg overflow-hidden mb-2 border-2 border-cream-border">
                <div className="w-full flex items-center justify-center" style={{ aspectRatio: "1/1", background: "#FFF8F0" }}>
                  <div className="text-center px-2">
                    <span style={{ fontSize: 36 }}>🔒</span>
                    <div className="font-sans text-[10px] md:text-xs text-brand-sub mt-1.5 leading-[1.7]">
                      画像は公式サイトで<br/>ご確認ください
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* 右カラム: 情報 */}
          <div className="md:flex-1 mt-2 md:mt-0">
            {/* 商品名（デスクトップ・✕は上段） */}
            <div className="hidden md:block">{nameRowDesktop}</div>

            {/* 説明文 */}
            {product.description && (
              <div className="mb-2" style={{ padding: "6px 10px", background: "#FFF4E8", borderRadius: 8, border: "1px solid #F0E6D6" }}>
                <div className="font-sans text-[10px] md:text-sm" style={{ color: "#6B5B4E", lineHeight: 1.7 }}>
                  💬 {product.description}
                </div>
              </div>
            )}

            {/* メーカー公式の紹介文。
                出典を明示して引用の体裁にする。AI生成の説明文と役割が違うので併記し、
                置き換えはしない（公式＝一次情報、上の説明文＝当サイトの要約）。 */}
            {product.officialDescription && (
              <div className="mb-2" style={{ padding: "6px 10px", background: "#F5F7FA", borderRadius: 8, border: "1px solid #E3E8EF" }}>
                <div className="font-sans text-[9px] md:text-[11px] mb-1" style={{ color: "#8A94A6" }}>
                  {(product.source || "メーカー").replace(/公式$/, "")}公式より
                </div>
                <div className="font-sans text-[10px] md:text-sm" style={{ color: "#5A6472", lineHeight: 1.7 }}>
                  {product.officialDescription}
                </div>
              </div>
            )}

            {/* ラインナップ（収録内容）。
                キャラクター名が入るため「○○ ガチャ」級の検索面をこのページが持てる。
                掲載しているメーカーが限られるので、取れている商品だけ表示する。 */}
            {isPage && product.lineup?.length > 0 && (
              <div className="mb-2" style={{ padding: "8px 10px", background: "#FFFDF7", borderRadius: 8, border: "1px solid #F0E6D6" }}>
                <h2 className="font-sans font-bold text-[11px] md:text-sm mb-1.5" style={{ color: "#6B5B4E" }}>
                  ラインナップ全{product.lineup.length}種
                </h2>
                <ul className="font-sans text-[10px] md:text-sm m-0 pl-0 list-none" style={{ color: "#6B5B4E", lineHeight: 1.9 }}>
                  {product.lineup.map((name) => (
                    <li key={name} className="flex gap-1.5">
                      <span style={{ color: "#C9B79C" }}>◆</span>
                      <span>{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-b border-dashed border-cream-border mb-1.5 md:mb-3" />

            {[
              { l: "価格", v: `¥${product.price}` },
              ...(product.types ? [{ l: "種類", v: `全${product.types}種` }] : []),
              // サイズ・対象年齢は収集元の公式ページから取得した一次情報
              // （scripts/official-info.js）。掲載が無いメーカーもあるので都度判定する。
              ...(product.size ? [{ l: "サイズ", v: product.size }] : []),
              ...(product.ageRating ? [{ l: "対象年齢", v: product.ageRating }] : []),
              { l: "発売", v: product.releaseWeek },
            ].map((r) => (
              <div key={r.l} className="flex justify-between py-1.5 md:py-2 border-b border-dotted border-cream-border">
                <span className="font-sans text-[10px] md:text-xs text-brand-sub">{r.l}</span>
                <span className="font-sans text-[10px] md:text-xs text-brand-text">{r.v}</span>
              </div>
            ))}

            {/* 店舗検索（EC導線より控えめなトーン） */}
            {shopUrl && (
              <a href={shopUrl} target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center justify-center w-full py-2 mt-2 rounded-lg no-underline font-sans text-[11px] md:text-xs"
                style={{ background: "#F3F8F4", color: "#5B8C6D" }}>
                <span>🏪 近くの店舗を探す</span>
                {product.sourceUrl && product.sourceUrl.includes("takaratomy-arts.co.jp") && (
                  <span className="text-[9px] md:text-[10px] mt-0.5 opacity-70">
                    ※ページ内「この商品の取扱店舗」から検索
                  </span>
                )}
              </a>
            )}

            {/* お気に入り・公式サイト・閉じる（最下部の小リンク） */}
            <div className="flex items-center justify-center gap-6 mt-2.5">
              {onToggleFavorite && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(product.id); }}
                  className="bg-transparent border-0 p-0 cursor-pointer font-sans text-[10px] md:text-xs"
                  style={{ color: isFavorite ? "#D4910A" : "#9B8978" }}
                >
                  {isFavorite ? "⭐ お気に入り済み" : "☆ お気に入りに登録"}
                </button>
              )}
              {product.sourceUrl && (
                <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="no-underline font-sans text-[10px] md:text-xs" style={{ color: "#9B8978" }}>
                  🔗 公式サイト
                </a>
              )}
              {onClose && (
                <button onClick={close}
                  className="bg-transparent border-0 p-0 cursor-pointer font-sans text-[10px] md:text-xs text-brand-sub">
                  ✕ 閉じる
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 購入CTAバー（モーダルではスクロール位置によらず常時表示） */}
      <div className="w-full shrink-0 px-4 pt-2.5 pb-3 md:px-6" style={{ background: "#FFFDF8", borderTop: "1px dashed #E8DDD0" }}>
        {compset && (
          <div className="font-sans text-[10px] md:text-xs font-bold text-center mb-1.5" style={{ color: "#B45309" }}>
            🎁 ダブりなし{product.types ? `全${product.types}種` : ""}コンプセットの取扱あり
          </div>
        )}
        <a href={rakutenSearchUrl(product.name, placement)}
          target="_blank" rel="nofollow sponsored noopener"
          onClick={() => trackAffiliateClick("rakuten", placement, product)}
          className="block w-full py-3 md:py-3.5 rounded-lg font-sans text-[13px] md:text-base font-bold text-white text-center no-underline"
          style={{
            background: "linear-gradient(135deg, #E60000, #BF0000)",
            boxShadow: "0 3px 0 #8C0000, 0 4px 12px rgba(191,0,0,0.3)",
          }}>
          {rakutenLabel}
        </a>
        {amazonSearchUrl(amazonQuery(product.name, product.brand)) && (
          <a href={amazonSearchUrl(amazonQuery(product.name, product.brand))}
            target="_blank" rel="nofollow sponsored noopener"
            onClick={() => trackAffiliateClick("amazon", placement, product)}
            className="block w-full py-3 md:py-3.5 mt-1.5 rounded-lg font-sans text-[13px] md:text-base font-bold text-center no-underline"
            style={{
              background: "linear-gradient(135deg, #FFA41C, #FF8F00)",
              boxShadow: "0 3px 0 #C46A00, 0 4px 12px rgba(255,143,0,0.3)",
              color: "#2E1A00",
            }}>
            📦 Amazonで探す
          </a>
        )}
      </div>

      <div className="w-full shrink-0" style={{ height: 10, background: zigzagBottom, backgroundSize: "16px 10px", backgroundRepeat: "repeat-x" }} />
    </>
  );

  if (isPage) {
    return (
      <div className="max-w-[340px] md:max-w-[640px] lg:max-w-[720px] mx-auto py-6 px-4 flex flex-col items-center">
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
        className="max-w-[340px] md:max-w-[640px] lg:max-w-[720px] w-[92%] flex flex-col max-h-[82vh] md:max-h-[88vh]"
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
