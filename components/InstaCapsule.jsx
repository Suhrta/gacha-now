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
      <rect x="0" y="0" width="24" height="24" rx="5.4" fill={`url(#${gid})`} />
      {/* Instagram公式グリフ（白・アプリアイコンと同じ比率で内側に配置） */}
      <g transform="translate(3.6 3.6) scale(0.7)">
        <path
          fill="#FFFFFF"
          d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"
        />
      </g>
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
          <OpenCapsule size={62} />
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
