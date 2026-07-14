"use client";
import { rakutenSearchUrl } from "../lib/affiliate";

/**
 * 商品ページの「楽天で確実に買う/予約する」導線。
 * links は data/rakuten-links.json の当該商品エントリ:
 *   { compset?: {q,count}, preorder?: {q,count} }
 * 採用クエリはビルド時に楽天APIで実在検証済み（0件・無関係リンクを出さない）。
 *
 * - アフィリエイトIDは rakutenSearchUrl（lib/affiliate.js）で一元付与
 * - PR表記（景表法対応）をボタン群に併記
 * - クリックを GA4 の affiliate_click イベントで計測（intent別に効果検証可能）
 */
export default function RakutenLinks({ product, links }) {
  if (!links || (!links.compset && !links.preorder)) return null;

  const track = (intent, query) => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", "affiliate_click", {
      affiliate: "rakuten",
      link_intent: intent, // "compset" | "preorder"
      item_id: product.id,
      item_name: product.name,
      item_brand: product.brand,
      search_query: query,
      value: product.price || 0,
      currency: "JPY",
    });
  };

  const typesLabel = product.types ? `全${product.types}種` : "全種";

  return (
    <section className="px-4 mt-6 mb-2 max-w-2xl mx-auto w-full">
      <div className="rounded-xl border border-cream-border bg-white p-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm md:text-base font-bold text-brand-text">
            🛍️ 楽天で確実に手に入れる
          </h2>
          <span
            className="text-[9px] leading-none px-1.5 py-0.5 rounded border border-cream-border text-brand-sub"
            aria-label="広告・プロモーション"
            title="アフィリエイト広告"
          >
            PR
          </span>
        </div>
        <p className="text-[10px] md:text-xs text-brand-sub mb-3 leading-relaxed">
          ダブりを避けて{typesLabel}まとめて揃えたい方・発売前に確保したい方向けの通販リンクです。
        </p>

        {/* コンプセット（ダブり回避・全種まとめ買い） */}
        {links.compset && (
          <a
            href={rakutenSearchUrl(links.compset.q)}
            target="_blank"
            rel="nofollow sponsored noopener"
            onClick={() => track("compset", links.compset.q)}
            className="block w-full py-3 md:py-3.5 rounded-lg font-sans text-[13px] md:text-base font-bold text-white text-center no-underline"
            style={{
              background: "linear-gradient(135deg, #E60000, #BF0000)",
              boxShadow: "0 3px 0 #8C0000, 0 4px 12px rgba(191,0,0,0.3)",
            }}
          >
            🎁 {typesLabel}コンプセットを探す
            <span className="block font-normal text-[10px] md:text-xs opacity-90 mt-0.5">
              ダブりなく一度で揃える
            </span>
          </a>
        )}

        {/* 予約（発売前のみ・検証で在庫確認済み） */}
        {links.preorder && (
          <a
            href={rakutenSearchUrl(links.preorder.q)}
            target="_blank"
            rel="nofollow sponsored noopener"
            onClick={() => track("preorder", links.preorder.q)}
            className="block w-full py-2.5 md:py-3 mt-2 rounded-lg font-sans text-[12px] md:text-sm font-bold text-center no-underline border-2"
            style={{
              background: "#FFFFFF",
              borderColor: "#BF0000",
              color: "#BF0000",
            }}
          >
            📅 予約・発売前をチェック
          </a>
        )}

        <p className="text-[9px] md:text-[10px] text-brand-sub mt-3 leading-relaxed">
          ※本リンクは楽天アフィリエイトプログラムを利用しています。リンク先での購入で当サイトに収益が発生する場合があります。価格・在庫・発売状況は楽天市場の各ページをご確認ください。
        </p>
      </div>
    </section>
  );
}
