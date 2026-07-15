// ブランド/キャラ/シリーズ（ハブページ）の概要・FAQを組み立てる共通ロジック。
//
// 表示（components/CharacterInfo.jsx）と構造化データ（各 layout.jsx の FAQPage）が
// 同じ値を使うための単一の情報源。片方だけ直して食い違うと、
// 検索エンジンに実際の表示と違う内容を申告することになるため必ずここを経由する。
//
// FAQの回答は本文中にリンクを含むので、セグメントの配列で返す:
//   [{ t: "テキスト" }, { t: "リンク文言", href: "/blog/..." }, ...]
// 表示側は href があれば <Link> にし、JSON-LD 側は faqAnswerText() で平文に落とす。
import { getReleaseYearMonth, formatYearMonth } from "./release";

export function buildHubInfo({ name, items }) {
  if (!items || items.length === 0) return null;

  const prices = items.map((p) => p.price).filter((n) => typeof n === "number" && n > 0);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;

  const typeCounts = items.map((p) => p.types).filter((n) => typeof n === "number" && n > 0);
  const avgTypes = typeCounts.length
    ? Math.round((typeCounts.reduce((a, b) => a + b, 0) / typeCounts.length) * 10) / 10
    : null;

  const makers = [
    ...new Set(items.map((p) => (p.source || "").replace("公式", "")).filter(Boolean)),
  ];

  const months = items.map((p) => getReleaseYearMonth(p)).filter(Boolean).sort();
  const latestMonth = months.length ? months[months.length - 1] : null;

  const priceText =
    minPrice == null
      ? "—"
      : minPrice === maxPrice
      ? `¥${minPrice}`
      : `¥${minPrice}〜¥${maxPrice}`;

  const stats = [
    { label: "掲載中の新作", value: `${items.length}件` },
    { label: "価格帯", value: priceText },
    ...(avgTypes ? [{ label: "平均種類数", value: `約${avgTypes}種` }] : []),
    ...(makers.length ? [{ label: "主なメーカー", value: makers.join("・") }] : []),
    ...(latestMonth ? [{ label: "最新の発売月", value: formatYearMonth(latestMonth) }] : []),
  ];

  const faq = [
    {
      q: `${name}の最新ガチャは？`,
      a: [
        {
          t: `現在 ${items.length} 件の新作を掲載中です${
            latestMonth ? `（最新は${formatYearMonth(latestMonth)}発売）` : ""
          }。下の一覧から価格・種類数・発売日つきでチェックできます。`,
        },
      ],
    },
    {
      q: `値段はどのくらい？`,
      a: [
        { t: `${name}のガチャは${priceText}が中心です。相場やコンプ予算の目安は` },
        { t: "値段相場ガイド", href: "/blog/gachagacha-price-guide" },
        { t: "で解説しています。" },
      ],
    },
    {
      q: `どこで買える？`,
      a: [
        { t: "各商品ページの店舗検索・通販リンクから探せます。買える場所は" },
        { t: "どこで買えるガイド", href: "/blog/gachagacha-where-to-buy-guide" },
        { t: "にまとめています。" },
      ],
    },
  ];

  return { stats, faq, priceText, latestMonth, makers, avgTypes, minPrice, maxPrice };
}

// FAQのセグメント配列を平文にする（JSON-LD用）
export function faqAnswerText(segments) {
  return segments.map((s) => s.t).join("");
}

// FAQPage の JSON-LD を組み立てる。表示しているQ&Aと同一の文面になる。
export function buildFaqLd(faq) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: faqAnswerText(f.a) },
    })),
  };
}
