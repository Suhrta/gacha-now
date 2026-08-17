"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 一定行数を超えたときだけ畳んで「続きを読む」を出すテキスト。
 *
 * 紹介文は公式の一次情報を優先して出しているが、長さがメーカーによって
 * まちまちで、中央値82字に対し最大551字ある。レシートの情報カラムは
 * PCで200px程度しかないため、長いものは30行近くになり価格や発売日が
 * 画面外へ押し出されていた（2026-08-17）。
 *
 * 文字数ではなく実際の行数で判定する。同じ文字数でもPCの狭いカラムと
 * モバイルの全幅では行数が倍以上違い、文字数で切ると片方で必ず外すため。
 *
 * 既定を5行にしているのは、商品ごとのレシートの見え方を揃えるため。
 * 短い商品に空白を足して価格行の位置まで完全に揃える案もあったが、
 * 中央値82字＝3行程度の商品に2行分の空白が出るので採らなかった。
 *
 * 畳んでいる間もテキストはDOMに残す（display:noneにしない）。
 * 公式紹介文はこのページの一次情報なので、検索エンジンには読ませたい。
 */
export default function ExpandableText({ children, lines = 5, className, style }) {
  const ref = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  // 折り返し行数はカラム幅で変わるので、リサイズでも測り直す
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // 展開中は clamp が外れていて測れない。畳んだ状態でだけ判定する
    if (expanded) return;
    setOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [expanded]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const clampStyle = expanded
    ? undefined
    : {
        display: "-webkit-box",
        WebkitLineClamp: lines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      };

  return (
    <>
      <div ref={ref} className={className} style={{ ...style, ...clampStyle }}>
        {children}
      </div>
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="bg-transparent border-0 p-0 mt-1 cursor-pointer font-sans text-[10px] md:text-xs underline"
          style={{ color: "#9B8978" }}
        >
          {expanded ? "閉じる" : "続きを読む"}
        </button>
      )}
    </>
  );
}
