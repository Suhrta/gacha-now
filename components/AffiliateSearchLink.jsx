"use client";
import { rakutenSearchUrl } from "../lib/affiliate";

/**
 * 一覧の1行に添える小さな「楽天で探す」リンク。
 * 歴代ページの「掲載終了」行は自サイトに商品ページが無く、行き先が1つも無かった。
 * そこを見に来る人は「もう回せない過去作」を探しているので、通販（再販・中古）への導線を置く。
 * クリックは affiliate_click（CharacterAffiliateCTA と同じスキーマ）で計測する。
 */
export default function AffiliateSearchLink({ keyword, intent }) {
  const track = () => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", "affiliate_click", {
      affiliate: "rakuten",
      link_intent: intent,
      item_name: keyword,
      search_query: keyword,
    });
  };
  return (
    <a
      href={rakutenSearchUrl(keyword, "receipt_modal")}
      target="_blank"
      rel="nofollow sponsored noopener"
      onClick={track}
      className="shrink-0 text-[9px] font-bold text-white rounded px-1.5 py-0.5 no-underline"
      style={{ background: "#BF0000" }}
    >
      楽天で探す
    </a>
  );
}
