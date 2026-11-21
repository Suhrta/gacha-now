"use client";
import { rakutenSearchUrl, amazonSearchUrl } from "../lib/affiliate";

/**
 * キャラページの通販導線CTA。「{キャラ名} ガチャガチャ」の検索リンクを表示する。
 * - アフィリエイトIDと計測ID（placement: "character"）は lib/affiliate.js で一元付与
 * - PR表記（景表法対応）を併記
 * - クリックを GA4 の affiliate_click イベントで計測（RakutenLinks と同一スキーマ）
 * - Amazonボタンは AMAZON_ASSOCIATE_TAG 設定後に自動表示
 *
 * シリーズの歴代・発売予定ページでも使う（2026-11-21: 2ページで28日1,750表示なのに
 * 通販導線が1つも無く affiliate_click が0件だった）。intent で GA4 上の出どころを分ける。
 */
export default function CharacterAffiliateCTA({ name, intent = "character", title, note }) {
  const query = `${name} ガチャガチャ`;
  // Amazonの出品タイトルは「ガチャガチャ」より「ガチャ」表記が多いため語を分ける
  const amazonQ = `${name} ガチャ`;

  const track = (affiliate, searchQuery) => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", "affiliate_click", {
      affiliate,
      link_intent: intent,
      item_name: name,
      search_query: searchQuery,
    });
  };

  return (
    <section className="mb-4 relative z-[1]">
      <div className="rounded-xl border border-cream-border bg-white p-3.5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs md:text-sm font-bold text-brand-text">
            {title || `🛍️ ${name}のガチャを通販で探す`}
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
            onClick={() => track("rakuten", query)}
            className="flex-1 py-2.5 rounded-lg font-sans text-[12px] md:text-sm font-bold text-white text-center no-underline"
            style={{
              background: "linear-gradient(135deg, #E60000, #BF0000)",
              boxShadow: "0 2px 0 #8C0000, 0 3px 8px rgba(191,0,0,0.25)",
            }}
          >
            🛒 楽天市場で探す
          </a>
          {amazonSearchUrl(amazonQ) && (
            <a
              href={amazonSearchUrl(amazonQ)}
              target="_blank"
              rel="nofollow sponsored noopener"
              onClick={() => track("amazon", amazonQ)}
              className="flex-1 py-2.5 rounded-lg font-sans text-[12px] md:text-sm font-bold text-center no-underline"
              style={{
                background: "linear-gradient(135deg, #FFA41C, #FF8F00)",
                boxShadow: "0 2px 0 #C46A00, 0 3px 8px rgba(255,143,0,0.25)",
                color: "#2E1A00",
              }}
            >
              📦 Amazonで探す
            </a>
          )}
        </div>
        <p className="text-[9px] md:text-[10px] text-brand-sub mt-2 leading-relaxed">
          {note || "※アフィリエイトリンクです。ダブり回避のコンプセットや再販品が見つかることがあります。"}
        </p>
      </div>
    </section>
  );
}
