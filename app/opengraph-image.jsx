import { ImageResponse } from "next/og";

// products.json はここで import しないこと。
// このルートはEdge Functionで、Hobbyのサイズ上限は1MB。1.5MBのJSONを import すると
// バンドルに丸ごと載って上限を超え、デプロイが落ちる（2026-09-01に実際に起きた。
// `next build` は通ってしまうのでローカルでは気づけない）。
// 必要な集計値は next.config.js がビルド時に数えて env に埋め込んでいる。
export const runtime = "edge";
export const alt = "ガチャなう - カプセルトイ新作情報サイト";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(weight) {
  try {
    const cssRes = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@${weight}&display=swap`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
    );
    if (!cssRes.ok) {
      console.warn(`[og] font css fetch failed: ${cssRes.status}`);
      return null;
    }
    const css = await cssRes.text();
    const urlMatch = css.match(/src:\s*url\((https:\/\/[^)]+)\)/);
    if (!urlMatch) {
      console.warn("[og] font url not found in css");
      return null;
    }
    const fontRes = await fetch(urlMatch[1]);
    if (!fontRes.ok) {
      console.warn(`[og] font file fetch failed: ${fontRes.status}`);
      return null;
    }
    return await fontRes.arrayBuffer();
  } catch (err) {
    console.warn("[og] loadFont error:", err?.message || err);
    return null;
  }
}

function Capsules() {
  return (
    <>
      <div style={{ position: "absolute", top: 60, left: 80, width: 90, height: 108, display: "flex", flexDirection: "column", opacity: 0.55, transform: "rotate(-15deg)" }}>
        <div style={{ width: 90, height: 50, borderRadius: "90px 90px 0 0", background: "#E8756D" }} />
        <div style={{ width: 90, height: 58, borderRadius: "0 0 90px 90px", background: "#E8756D", opacity: 0.8 }} />
      </div>
      <div style={{ position: "absolute", top: 90, right: 110, width: 72, height: 86, display: "flex", flexDirection: "column", opacity: 0.55, transform: "rotate(20deg)" }}>
        <div style={{ width: 72, height: 40, borderRadius: "72px 72px 0 0", background: "#F5B82E" }} />
        <div style={{ width: 72, height: 46, borderRadius: "0 0 72px 72px", background: "#F5B82E", opacity: 0.8 }} />
      </div>
      <div style={{ position: "absolute", bottom: 80, left: 180, width: 60, height: 72, display: "flex", flexDirection: "column", opacity: 0.55, transform: "rotate(-25deg)" }}>
        <div style={{ width: 60, height: 33, borderRadius: "60px 60px 0 0", background: "#6DB4C8" }} />
        <div style={{ width: 60, height: 39, borderRadius: "0 0 60px 60px", background: "#6DB4C8", opacity: 0.8 }} />
      </div>
      <div style={{ position: "absolute", bottom: 100, right: 200, width: 78, height: 94, display: "flex", flexDirection: "column", opacity: 0.55, transform: "rotate(12deg)" }}>
        <div style={{ width: 78, height: 43, borderRadius: "78px 78px 0 0", background: "#9BC471" }} />
        <div style={{ width: 78, height: 51, borderRadius: "0 0 78px 78px", background: "#9BC471", opacity: 0.8 }} />
      </div>
    </>
  );
}

export default async function OGImage() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  // next.config.js がビルド時に埋め込む値。数え直しではなく引き当てるだけ。
  const totalItems = Number(process.env.OG_TOTAL_ITEMS) || 0;
  let thisMonthCount = 0;
  try {
    thisMonthCount = JSON.parse(process.env.OG_MONTH_COUNTS || "{}")[String(currentMonth)] || 0;
  } catch {
    // 埋め込みが壊れていてもOG画像は出す（バッジが0になるだけ）
  }

  const [regular, bold] = await Promise.all([loadFont(500), loadFont(900)]);
  const hasJapanese = !!(regular || bold);

  const title = hasJapanese ? "ガチャなう" : "GACHA-NOW";
  const subtitle = hasJapanese
    ? "今日の新作ガチャ、ぜんぶチェック"
    : "Japan's capsule-toy release tracker";
  const monthBadge = hasJapanese
    ? `🎪 ${currentMonth}月新作 ${thisMonthCount}件`
    : `🎪 ${thisMonthCount} new this month`;
  const totalBadge = hasJapanese
    ? `📦 全${totalItems}件掲載中`
    : `📦 ${totalItems} items total`;

  const fonts = [];
  if (regular) fonts.push({ name: "NotoJP", data: regular, weight: 500, style: "normal" });
  if (bold) fonts.push({ name: "NotoJP", data: bold, weight: 900, style: "normal" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #FFFAF3 0%, #FFF4E8 60%, #FFE8D4 100%)",
          position: "relative",
          fontFamily: hasJapanese ? "NotoJP" : "sans-serif",
        }}
      >
        <Capsules />

        <div
          style={{
            fontSize: hasJapanese ? 128 : 112,
            fontWeight: 900,
            color: "#E8756D",
            letterSpacing: hasJapanese ? 8 : 4,
            textShadow: "0 6px 0 #C5534D",
            marginBottom: 20,
          }}
        >
          {title}
        </div>

        <div style={{ fontSize: hasJapanese ? 32 : 28, color: "#6B5B4E", letterSpacing: 4, marginBottom: 40 }}>
          {subtitle}
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "14px 28px", borderRadius: 999,
            background: "#FFFFFF", border: "3px solid #F5B82E", color: "#A07018",
            fontSize: 28, fontWeight: 700,
          }}>
            {monthBadge}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "14px 28px", borderRadius: 999,
            background: "#FFFFFF", border: "3px solid #9BC471", color: "#3E6B2C",
            fontSize: 28, fontWeight: 700,
          }}>
            {totalBadge}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 32, fontSize: 22, color: "#9B8978", letterSpacing: 2 }}>
          gacha-now.net
        </div>
      </div>
    ),
    { ...size, ...(fonts.length > 0 ? { fonts } : {}) }
  );
}
