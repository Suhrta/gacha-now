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
import { DATA_UPDATED } from "./site-meta";

// 「○○とは？」の答えとして使う一文を intro から取り出す。
// 定義は intro の1文目に書かれている前提（data/series.js の書式）。
function definitionSentence(intro) {
  if (!intro) return null;
  const first = intro.split("。")[0];
  return first && first.length >= 10 ? `${first}。` : null;
}

export function buildHubInfo({ name, items, intro }) {
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

  const definition = definitionSentence(intro);

  const faq = [
    // 「○○とは？」を先頭に置く。
    //
    // GSC実測（2026-08-07・直近28日）で、この意図のクエリが170表示・クリック0だった:
    //   フロッキーマスコットとは 94imp 0clk 10.1位 / フラットガシャポンとは 44imp 0clk 9.2位
    //   （いずれも該当する /series/ ページが既に存在し上位に出ている）
    // 定義文はページ内（intro）に書いてあるのに、見出しもFAQも「最新情報」「新作一覧」で、
    // 「これは何か」を聞いている人に答えるページだと伝わっていなかった。
    ...(definition
      ? [{ q: `${name}とは？`, a: [{ t: definition }] }]
      : []),
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

// ── SERPのタイトル・説明文 ─────────────────────────────────────────
//
// 2026-08-18のGSC実測が発端。/brand/pokemon はモバイル（流入の98%）で
// 表示1,138→1,236・順位8.0→7.5と改善しているのに、CTRだけ4.7%→1.8%に落ちていた。
// 順位の問題ではなく、スニペットで選ばれていない状態。
//
// 実際のSERPを見ると、競合2社（gacha-island.jp / charagoo.jp）はどちらも
// タイトルに「設置場所」を入れて差別化しているのに対し、こちらは
// 「○○のガチャガチャ新作一覧【2026年最新】」＋全ブランド同一の定型文で、
// 件数も発売月も入っていなかった。
//
// 具体の数字（件数・最新の発売月・代表商品名）を出して、
// 「いま更新されている一覧」だと一目で分かるようにする。
// なお競合は「設置場所」をタイトルに入れつつ中身が空なので、そこは真似しない
// （空ページの量産は [[adsense-recovery]] の不承認を再来させる）。
// こちらは各商品に店舗検索の導線と専用ガイドが実在する範囲で「取扱店の探し方」と書く。

// 件数が一桁だと「【3件】」がSERPで内容の薄さに見えてCTRを下げる。
// release/[month] で先に同じ判断をしているので、しきい値を揃える。
const COUNT_THRESHOLD = 10;

// 商品名は長いものだと60字を超える。説明文の他の要素を押し出さない長さで切る。
function shortName(name) {
  if (!name) return null;
  return name.length > 22 ? `${name.slice(0, 22)}…` : name;
}

// 最新の発売月と、その月の代表商品を1件返す
function latestRelease(items) {
  const withMonth = items
    .map((p) => ({ p, ym: getReleaseYearMonth(p) }))
    .filter((x) => x.ym);
  if (withMonth.length === 0) return {};
  withMonth.sort((a, b) => (a.ym < b.ym ? 1 : a.ym > b.ym ? -1 : 0));
  return { month: withMonth[0].ym, product: withMonth[0].p };
}

// 発売中の商品のうち、いちばん新しく収集したものを1件返す。
//
// releaseWeek は「9月 第4週」のような月つきの表記と「発売中」「未定」が混在していて、
// 月が取れるのは740件中93件しかない（2026-08-31時点で「発売中」が634件）。
// そのため latestRelease() は242ブランドハブ中188で空を返し、
// 説明文の目玉である「最新は◯月発売の△△」が8割のページで出ていなかった。
// 実際 CTR最下位だった chiikawa / spongebob / heroaca / bluelock は全て月なしのハブ。
//
// 月が無いときは「発売中」を代わりの訴求にする。予定の月より「いま買える」の方が
// 検索している人にとって強いので、劣化版ではなく素直な代替になる。
function newestOnSale(items) {
  const onSale = items.filter((p) => p.releaseWeek === "発売中");
  if (onSale.length === 0) return null;
  const sorted = [...onSale].sort(
    (a, b) => new Date(b.collectedAt || 0) - new Date(a.collectedAt || 0)
  );
  return { product: sorted[0], count: onSale.length };
}

/**
 * ハブページの title / description を組み立てる。items が空なら null。
 * kind: "brand" | "character" | "series"
 */
export function buildHubMeta({ name, items, kind = "brand" }) {
  if (!items || items.length === 0) return null;

  const count = items.length;
  const asOf = DATA_UPDATED ? `${DATA_UPDATED.year}年${DATA_UPDATED.month}月` : "2026年";
  const { month, product } = latestRelease(items);

  const prices = items.map((p) => p.price).filter((n) => typeof n === "number" && n > 0);
  const priceText = prices.length
    ? Math.min(...prices) === Math.max(...prices)
      ? `¥${Math.min(...prices)}`
      : `¥${Math.min(...prices)}〜¥${Math.max(...prices)}`
    : null;

  // タイトルは検索語（○○ ガチャガチャ 最新）を先頭に置き、差別化要素は後ろ。
  // モバイルは35字前後で切れるので、切れて困る順に並べる。
  const countPart = count >= COUNT_THRESHOLD ? `新作${count}件` : "新作";
  const title =
    kind === "series"
      ? `${name}の${countPart}・全種一覧【${asOf}最新】| ガチャなう`
      : `${name}のガチャガチャ${countPart}【${asOf}最新】| ガチャなう`;

  // 説明文の先頭は「日付つきの更新スタンプ」にする。
  //
  // 2026-08-31のGSC実測。同じ8〜9位でもCTRが一桁違う:
  //   /release/2026-09 7.1位 CTR3.8% ／ トップ 8.5位 2.4%  ← 説明文が【8月31日更新】始まり
  //   /brand/obungu    9.7位 CTR1.0% ／ /series/flat-gashapon 7.5位 1.4%  ← ハブは「毎日更新。」が末尾
  // ハブページだけ鮮度の訴求が説明文の最後にあり、SERPで切れて見えていなかった。
  // 「毎日更新」より「8/31更新」の方が具体で、日次で collectedAt から更新されるので嘘にならない。
  //
  // 先頭のページ名の言い直し（「◯◯のガチャガチャ新作・最新情報。」）はタイトルと重複して
  // 情報量ゼロだったので落とし、その字数を鮮度と代表商品に回す。
  const stamp = DATA_UPDATED ? `【${DATA_UPDATED.label}更新】` : "";

  // 件数は同じしきい値で出し分ける。
  // 転スラは掲載2件でサイト3位の流入源（[[gsc-baseline]]「掲載件数はページの価値を
  // 予測しない」）で、そこに「新作1件を掲載」と書くとSERPで薄く見えて逆効果になる。
  // 件数を出さない代わりに「最新は◯月発売の△△」で鮮度を見せる。
  const onSale = newestOnSale(items);
  const highlight =
    month && product
      ? `最新は${formatYearMonth(month)}発売の「${shortName(product.name)}」${priceText ? `（${priceText}）` : ""}。`
      : onSale
      ? `「${shortName(onSale.product.name)}」など${onSale.count}件が発売中${priceText ? `（${priceText}）` : ""}。`
      : priceText
      ? `価格は${priceText}。`
      : "";

  const parts = [
    stamp,
    count >= COUNT_THRESHOLD
      ? `${name}のガチャガチャ新作${count}件。`
      : `${name}のガチャガチャ新作情報。`,
    highlight,
    "発売週・種類数つき、取扱店の探し方も掲載。",
  ];

  return { title, description: parts.filter(Boolean).join("") };
}
