"use client";
import { useId } from "react";

export const IG_URL = "https://www.instagram.com/gacha.gacha_now/";

export function trackSnsFollow(placement) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "sns_follow", { sns: "instagram", placement });
}

/* Instagramアイコン（インラインSVG・公式風グラデーション） */
export function InstaIcon({ size = 22 }) {
  // グラデーションIDはインスタンスごとに一意にする。重複IDだと display:none 側の
  // defs が参照されてグラデーションが描画されない（Chromeで白抜けになる）
  const gid = `igGrad-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FED373" />
          <stop offset="26%" stopColor="#F15245" />
          <stop offset="61%" stopColor="#D92E7F" />
          <stop offset="100%" stopColor="#9B36B7" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6.5" fill={`url(#${gid})`} />
      <circle cx="12" cy="12" r="4.6" fill="none" stroke="#FFFFFF" strokeWidth="1.9" />
      <circle cx="17.3" cy="6.7" r="1.35" fill="#FFFFFF" />
    </svg>
  );
}

/* 開いたカプセル（CSS描画）。フタが開いて中からインスタアイコンが飛び出している */
function OpenCapsule({ size = 52 }) {
  const s = size;
  return (
    <div className="relative shrink-0 pointer-events-none" style={{ width: s, height: s * 1.1 }}>
      {/* 飛び出す景品（インスタ） */}
      <span
        className="absolute"
        style={{ left: "54%", top: 0, transform: "translateX(-50%) rotate(8deg)" }}
      >
        <InstaIcon size={s * 0.46} />
      </span>
      {/* キラキラ */}
      <span className="absolute" style={{ left: s * 0.02, top: s * 0.1, fontSize: s * 0.22, lineHeight: 1 }}>✨</span>
      {/* 上フタ（開いて転がっている） */}
      <span
        className="absolute"
        style={{
          left: -s * 0.14,
          bottom: s * 0.02,
          width: s * 0.56,
          height: s * 0.3,
          background: "#E8756D",
          borderRadius: `${s * 0.3}px ${s * 0.3}px ${s * 0.06}px ${s * 0.06}px`,
          transform: "rotate(-118deg)",
          boxShadow: "inset 0 3px 0 rgba(255,255,255,0.35)",
        }}
      />
      {/* 下カップ */}
      <span
        className="absolute"
        style={{
          left: s * 0.3,
          bottom: 0,
          width: s * 0.56,
          height: s * 0.3,
          background: "#FFFFFF",
          border: "2px solid #E0D6C8",
          borderTop: "2px solid #EFE8DC",
          borderRadius: `${s * 0.08}px ${s * 0.08}px ${s * 0.3}px ${s * 0.3}px`,
          boxShadow: "0 2px 4px rgba(74,55,40,0.12)",
        }}
      />
    </div>
  );
}

/**
 * ヒーローのインスタ紹介カプセル。
 * - variant="desktop": ガチャ筐体の足元に絶対配置（親に relative が必要）
 * - variant="mobile" : ヒーロー下部のコンパクト行
 * どちらも GA4 の sns_follow イベントで設置箇所別に計測。
 */
export default function InstaCapsule({ variant }) {
  if (variant === "desktop") {
    // 筐体画像(親=relative)基準: 取り出し口は画像の左下(左から約8%・下端)にある
    return (
      <a
        href={IG_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackSnsFollow("hero_capsule")}
        aria-label="Instagramで新作ガチャをチェック（@gacha.gacha_now）"
        className="hidden md:block absolute no-underline group"
        style={{ left: "8%", bottom: "-5%" }}
      >
        {/* 吹き出し（カプセルの左上に伸びる） */}
        <div
          className="absolute bg-white border-2 border-cream-border rounded-2xl px-3.5 py-2 shadow-md group-hover:border-brand-accent transition-colors"
          style={{ bottom: "calc(100% + 12px)", right: -8 }}
        >
          <div className="text-xs font-bold text-brand-text whitespace-nowrap">新作ガチャを毎日インスタで紹介中！</div>
          <div className="text-[11px] font-bold text-brand-accent mt-0.5 whitespace-nowrap">@gacha.gacha_now をフォロー</div>
          <span
            className="absolute w-3 h-3 bg-white border-b-2 border-r-2 border-cream-border"
            style={{ right: 32, bottom: -7, transform: "rotate(45deg)" }}
          />
        </div>
        <div className="animate-float">
          <OpenCapsule size={76} />
        </div>
      </a>
    );
  }

  return (
    <a
      href={IG_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackSnsFollow("hero_capsule_mobile")}
      aria-label="Instagramで新作ガチャをチェック（@gacha.gacha_now）"
      className="flex md:hidden items-center gap-3 mt-4 bg-white border border-cream-border rounded-2xl px-3 py-2.5 no-underline shadow-sm"
    >
      <OpenCapsule size={42} />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold text-brand-text">新作ガチャを毎日インスタで紹介中！</div>
        <div className="text-[11px] font-bold text-brand-accent mt-0.5">@gacha.gacha_now をフォロー</div>
      </div>
    </a>
  );
}
