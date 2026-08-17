"use client";
import { useEffect, useState } from "react";

const SITE_URL = "https://gacha-now.net";

// 共有先は必ず商品ページ。モーダルから共有した場合も同じURLになる
// （モーダルはURLを持たないため、受け取った相手が同じ画面を開けるようにする）。
export function itemUrl(product) {
  return `${SITE_URL}/item/${product.id}`;
}

/* 共有本文。受け取った相手が中身を判断できる最低限（名前・種類数・価格・発売）に留める */
function shareText(product) {
  const spec = [
    product.types ? `全${product.types}種` : null,
    product.price ? `¥${product.price}` : null,
  ].filter(Boolean).join("・");
  const lines = [`「${product.name}」${spec ? `（${spec}）` : ""}`];
  if (product.releaseWeek) lines.push(`${product.releaseWeek}発売`);
  return lines.join("\n");
}

/* GA4 共有クリック計測（affiliate_click と同じ粒度で設置箇所別に見る） */
function trackShare(sns, placement, product) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "share_click", {
    sns,
    placement,
    item_id: product.id,
    item_name: product.name,
    item_brand: product.brand,
  });
}

function XIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/* LINEの公式ロゴは再配布条件があるため、緑の吹き出しで代用しテキストラベルで補う */
function ChatIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.9 3 2.75 6.4 2.75 10.6c0 3.75 3.3 6.9 7.75 7.5.3.06.71.2.81.46.09.24.06.6.03.84l-.13.79c-.04.23-.18.92.81.5s5.35-3.15 7.3-5.4c1.35-1.48 2-2.98 2-4.69C21.32 6.4 17.1 3 12 3z" />
    </svg>
  );
}

function LinkIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ShareIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" />
    </svg>
  );
}

/**
 * 商品レシートの共有ボタン。リンク先は常に商品ページ（/item/<id>）。
 *
 * X・LINE・リンクコピーを常設し、対応端末ではOS標準の共有シート
 * （navigator.share）も出す。Instagram/Discord等はそこから辿れるので個別に並べない。
 * navigator.share の有無はサーバー側で判定できないため、マウント後に出す
 * （SSGしている商品ページでハイドレーション不一致を起こさないように）。
 *
 * variant:
 *   "inline" … 情報カラム末尾に置くアイコン1行（モバイル用）。
 *              ラベル付きの横並びだと4つが2行に折り返し、下の
 *              お気に入り・公式サイト行と合わせて4行を占めていたので、
 *              丸アイコン＋極小キャプションの1行に畳んでいる。
 *   "card"  … 画像下の余白に置く枠付きブロック（PC用）。
 *              枠の見た目は同じレシート内の説明文カードに合わせている。
 */
export default function ShareButtons({ product, placement, variant = "inline" }) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  // コピー完了表示を戻す
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const url = itemUrl(product);
  const text = shareText(product);

  const copyLink = async () => {
    trackShare("copy", placement, product);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // 非セキュアコンテキストや権限拒否では clipboard API が使えない
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch {
        // それも駄目なら選択状態のままにして手動コピーに委ねる
      }
      document.body.removeChild(ta);
    }
  };

  const nativeShare = async () => {
    trackShare("native", placement, product);
    try {
      await navigator.share({ title: product.name, text, url });
    } catch {
      // ユーザーがシートを閉じただけでも reject するため、何もしない
    }
  };

  // label = PCのカード用（幅があるので説明的に）、short = スマホのアイコン下用
  const items = [
    {
      key: "x",
      label: "ポスト",
      short: "X",
      Icon: XIcon,
      bg: "#000000", border: "#000000", fg: "#FFFFFF",
      href: `https://x.com/intent/post?text=${encodeURIComponent(text)}` +
        `&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent("ガチャガチャ,カプセルトイ")}`,
      onClick: () => trackShare("x", placement, product),
    },
    {
      key: "line",
      label: "LINE",
      short: "LINE",
      Icon: ChatIcon,
      bg: "#06C755", border: "#06C755", fg: "#FFFFFF",
      href: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}` +
        `&text=${encodeURIComponent(text)}`,
      onClick: () => trackShare("line", placement, product),
    },
    {
      key: "copy",
      label: copied ? "コピーしました" : "リンクをコピー",
      short: copied ? "コピー済" : "コピー",
      Icon: LinkIcon,
      bg: "#FFFFFF", border: "#E8DDD0", fg: copied ? "#5B8C6D" : "#6B5B4E",
      onClick: copyLink,
    },
    ...(canNativeShare ? [{
      key: "native",
      label: "その他",
      short: "その他",
      Icon: ShareIcon,
      bg: "#FFFFFF", border: "#E8DDD0", fg: "#6B5B4E",
      onClick: nativeShare,
    }] : []),
  ];

  const heading = (
    <div className="font-sans text-[10px] md:text-xs text-center mb-1.5" style={{ color: "#9B8978" }}>
      この商品をシェア
    </div>
  );

  /* リンクとボタンで要素が変わるだけなので、中身と計測は共通にする */
  const wrap = (item, className, children, style) => {
    const props = { className, style, "aria-label": `${item.label}で共有` };
    return item.href ? (
      <a key={item.key} href={item.href} target="_blank" rel="noopener noreferrer"
        onClick={item.onClick} {...props}>
        {children}
      </a>
    ) : (
      <button key={item.key} type="button" onClick={item.onClick} {...props}>
        {children}
      </button>
    );
  };

  if (variant === "card") {
    // X・LINEを横2列、コピーとOS共有シートは幅いっぱいに敷く。
    // ラベルが最も長い「コピーしました」でも折り返さない幅が取れる。
    const btn =
      "flex items-center justify-center gap-1 no-underline cursor-pointer font-sans text-xs " +
      "border py-2 rounded-lg transition-opacity duration-150 hover:opacity-80";
    return (
      <div
        className="mb-2"
        style={{ padding: "8px 10px", background: "#FFFDF7", borderRadius: 8, border: "1px solid #F0E6D6" }}
      >
        {heading}
        <div className="grid grid-cols-2 gap-1.5">
          {items.map((item) =>
            wrap(
              item,
              `${btn} ${item.key === "x" || item.key === "line" ? "" : "col-span-2"}`,
              <>
                <item.Icon />
                <span>{item.label}</span>
              </>,
              { background: item.bg, borderColor: item.border, color: item.fg }
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2.5">
      {heading}
      <div className="flex items-start justify-center gap-5">
        {items.map((item) =>
          wrap(
            item,
            "flex flex-col items-center gap-1 bg-transparent border-0 p-0 no-underline cursor-pointer " +
            "transition-opacity duration-150 hover:opacity-80",
            <>
              <span
                className="flex items-center justify-center rounded-full border"
                style={{ width: 36, height: 36, background: item.bg, borderColor: item.border, color: item.fg }}
              >
                <item.Icon size={17} />
              </span>
              <span className="font-sans text-[9px]" style={{ color: item.key === "copy" && copied ? "#5B8C6D" : "#9B8978" }}>
                {item.short}
              </span>
            </>
          )
        )}
      </div>
    </div>
  );
}
