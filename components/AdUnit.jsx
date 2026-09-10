"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AD_CLIENT, adSlot } from "../lib/ads";

// ── 商品グリッドに帯を挟む間隔 ──────────────────────────────────
//
// 「何個目に挟むか」ではなく「何行おきに挟むか」で持つ。グリッドは幅で
// 2/3/4/5/6 列に変わるので、個数で固定すると列数によって見た目の間隔が
// 3行おきになったり8行おきになったりする。行で持てばどの幅でも同じ密度になり、
// col-span-full が行の途中に落ちて空きマスを作ることもない。
//
// 間隔の根拠：1行の高さは実測でPC約320px・スマホ約290px（正方形画像＋商品名
// 2行＋価格）。表示領域はどちらも2〜2.5行ぶんなので、4行 = 約1.6〜1.8画面。
// 「スクロール1.5画面に1つ」というインフィードの目安に合う。
// 最初だけ3行で少し早めに出すのは、多くの人が数行見て離脱するため。
//
// 1ページの本数には上限を設ける。間隔だけで決めると、掲載件数の多いページで
// 際限なく増えるため。実測（2026-09-11、本番）で /release/2026-09 は167件あり
// スマホで**21本**、/series/mejirushi は117件で14本出ていた。この2つは
// PVの35%を占める最大の流入先（[[gsc-baseline]]）。
//
// 問題は広告の比率ではなく読み込みの重さ。adsbygoogle は画面外の枠も含めて
// ページ読み込み時に全部リクエストするので、21枠は21回のリクエストと
// iframe になる。深くまでスクロールする人は一部なのに、その負荷は全員が負う。
// 6本なら先頭46件ぶん（スマホで約10画面）をカバーでき、そこから先は
// 視認率が落ちて収益がほとんど積み上がらない。
const FIRST_BAND_ROW = 3;
const BAND_EVERY_ROWS = 4;
const MAX_BANDS = 6;

// Tailwind の grid-cols-* と同じ境界。広い方から順に見る
const GRID_COLUMNS = [
  ["(min-width: 1536px)", 6],
  ["(min-width: 1280px)", 5],
  ["(min-width: 1024px)", 4],
  ["(min-width: 768px)", 3],
];
const MOBILE_COLUMNS = 2;

/**
 * i 番目のカードの手前に帯を置くかを判定する関数と、最初の帯の位置を返す。
 *
 *   const { isBandAt, firstBandAt } = useInFeedGrid();
 *   {isBandAt(i) && <AdUnit name="inFeed" ... />}
 *
 * サーバー描画とハイドレーション直後はスマホ（2列）として計算し、マウント後に
 * 実際の幅で入れ替える。先に広い方で計算すると、スマホで1ページ12件のときに
 * 帯が最後尾より後ろへ回って「挟まっていない」形になる。
 */
export function useInFeedGrid() {
  const [columns, setColumns] = useState(MOBILE_COLUMNS);

  useEffect(() => {
    const mqs = GRID_COLUMNS.map(([query, cols]) => [window.matchMedia(query), cols]);
    const apply = () => {
      const hit = mqs.find(([mq]) => mq.matches);
      setColumns(hit ? hit[1] : MOBILE_COLUMNS);
    };
    apply();
    mqs.forEach(([mq]) => mq.addEventListener("change", apply));
    return () => mqs.forEach(([mq]) => mq.removeEventListener("change", apply));
  }, []);

  const firstBandAt = columns * FIRST_BAND_ROW;
  const interval = columns * BAND_EVERY_ROWS;
  const isBandAt = (i) =>
    i >= firstBandAt &&
    (i - firstBandAt) % interval === 0 &&
    (i - firstBandAt) / interval < MAX_BANDS;

  return { isBandAt, firstBandAt };
}

/**
 * AdSense の広告枠ひとつ。枠名は lib/ads.js の AD_SLOTS のキー。
 *
 *   <AdUnit name="pageBottom" />
 *   <AdUnit name="inFeed" className="col-span-full my-2" />   // グリッドの帯
 *
 * 設計上の約束ごと:
 *  - スロットIDが未設定なら **何も描画しない**。IDを入れるまで見た目は今のまま
 *  - 本番以外ではダミー枠を出す。ローカル閲覧で自分の広告を表示させると
 *    無効なトラフィック（自己クリック扱い）になりうるため実物は読まない
 *  - 未配信（data-ad-status="unfilled"）のときは globals.css 側で枠ごと畳む。
 *    在庫が無い時間帯に「スポンサーリンク」だけ残る間抜けな空白を作らない
 *  - 高さを先に確保してCLSを抑える。配信された広告がこれより高ければ伸びる。
 *    幅で必要な高さが変わる枠は minHeight ではなく insClass（Tailwind）で渡す
 */
function AdSlot({ slot, format, layout, minHeight, insClass, className, label }) {
  const insRef = useRef(null);
  const pushed = useRef(false);

  // 画面に近づくまで広告を読み込まない。
  //
  // adsbygoogle は push した枠を即座に取りに行くので、素直に全部 push すると
  // ページ最下部の枠まで読み込み時にリクエストされる。一覧ページは帯が最大6本
  // あり、大半の人はそこまでスクロールしない。見られない広告のために全員が
  // 待たされることになる（PV/セッション1.44 = 1ページ見て帰る構造なので、
  // ページの重さがそのまま離脱に効く）。
  //
  // 手前 600px（スマホでおよそ1画面ぶん）で読み込むので、スクロールして
  // 到達した時にはもう表示されている。視認されない広告を出さないぶん、
  // 視認率（RPMに効く指標）はむしろ上がる。
  useEffect(() => {
    const el = insRef.current;
    if (!el) return;

    const load = () => {
      if (pushed.current) return;
      // 一度埋まった <ins> に再度 push すると
      // "adsbygoogle.push() error: All ins elements ... already have ads" で例外になる
      if (el.getAttribute("data-adsbygoogle-status")) return;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushed.current = true;
      } catch {
        // 広告ブロッカーやスクリプト読み込み失敗。広告が出ないだけでページは壊さない
      }
    };

    // 非対応環境では従来どおり即読み込み（広告が出ない方が損)
    if (typeof IntersectionObserver !== "function") {
      load();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        load();
        io.disconnect();
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`ad-slot text-center ${className}`}>
      {label ? (
        <div className="text-[10px] text-brand-sub tracking-wider mb-1">{label}</div>
      ) : null}
      <ins
        ref={insRef}
        className={`adsbygoogle ${insClass}`}
        style={insClass ? { display: "block" } : { display: "block", minHeight }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        {...(layout ? { "data-ad-layout": layout } : {})}
        data-full-width-responsive="true"
      />
    </div>
  );
}

export default function AdUnit({
  name,
  format = "auto",
  layout = null,
  minHeight = 280,
  insClass = "",
  className = "my-6",
  label = "スポンサーリンク",
}) {
  // ページ遷移で <ins> を作り直す。App Router の client 遷移では同じ枠の
  // コンポーネントが使い回されることがあり、埋まった <ins> が居座ると
  // 次のページで広告が出なくなる
  const pathname = usePathname();
  const slot = adSlot(name);

  if (!slot) return null;

  if (process.env.NODE_ENV !== "production") {
    return (
      <div className={className}>
        <div
          className={`flex items-center justify-center border-2 border-dashed border-cream-border rounded-lg text-[11px] text-brand-sub ${insClass}`}
          style={insClass ? undefined : { minHeight }}
        >
          広告枠: {name}（{slot}）
        </div>
      </div>
    );
  }

  return (
    <AdSlot
      key={pathname}
      slot={slot}
      format={format}
      layout={layout}
      minHeight={minHeight}
      insClass={insClass}
      className={className}
      label={label}
    />
  );
}
