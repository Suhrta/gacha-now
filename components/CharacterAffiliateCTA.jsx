"use client";
import { rakutenSearchUrl, amazonSearchUrl } from "../lib/affiliate";

/**
 * キャラページの通販導線CTA。「{キャラ名} ガチャガチャ」の検索リンクを表示する。
 * - アフィリエイトIDと計測ID（placement: "character"）は lib/affiliate.js で一元付与
 * - PR表記（景表法対応）を併記
 * - クリックを GA4 の affiliate_click イベントで計測（RakutenLinks と同一スキーマ）
 * - Amazonボタンは AMAZON_ASSOCIATE_TAG 設定後に自動表示
 */
export default function CharacterAffiliateCTA({ name }) {
  const query = `${name} ガチャガチャ`;

  const track = (affiliate) => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", "affiliate_click", {
      affiliate,
      link_intent: "character",
      item_name: name,
      search_query: query,
    });
  };

  return (
    <section className="mb-4 relative z-[1]">
      <div className="rounded-xl border border-cream-border bg-white p-3.5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs md:text-sm font-bold text-brand-text">
            🛍️ {name}のガチャを通販で探す
          </h2>
          <span
            className="text-[9px] leading-none px-1.5 py-0.5 rounded border border-cream-border text-brand-sub"
            aria-label="広告・プロモーション"
            title="アフィリエイト広告"
          >
            PR
          </span>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <a
            href={rakutenSearchUrl(query, "character")}
            target="_blank"
            rel="nofollow sponsored noopener"
            onClick={() => track("rakuten")}
            className="flex-1 py-2.5 rounded-lg font-sans text-[12px] md:text-sm font-bold text-white text-center no-underline"
            style={{
              background: "linear-gradient(135deg, #E60000, #BF0000)",
              boxShadow: "0 2px 0 #8C0000, 0 3px 8px rgba(191,0,0,0.25)",
            }}
          >
            🛒 楽天市場で探す
          </a>
          {amazonSearchUrl(query) && (
            <a
              href={amazonSearchUrl(query)}
              target="_blank"
              rel="nofollow sponsored noopener"
              onClick={() => track("amazon")}
              className="flex-1 py-2.5 rounded-lg font-sans text-[12px] md:text-sm font-bold text-center no-underline border-2"
              style={{
                background: "#FFFFFF",
                borderColor: "#FF9900",
                color: "#B45309",
              }}
            >
              📦 Amazonで探す
            </a>
          )}
        </div>
        <p className="text-[9px] md:text-[10px] text-brand-sub mt-2 leading-relaxed">
          ※アフィリエイトリンクです。ダブり回避のコンプセットや再販品が見つかることがあります。
        </p>
      </div>
    </section>
  );
}
