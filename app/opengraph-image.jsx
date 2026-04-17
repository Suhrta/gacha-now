import { ImageResponse } from "next/og";
import products from "../data/products.json";

export const runtime = "edge";
export const alt = "ガチャなう - カプセルトイ新作情報サイト";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(weight) {
  const cssRes = await fetch(
    `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@${weight}&display=swap`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  const css = await cssRes.text();
  const urlMatch = css.match(/src: url\((https:\/\/[^)]+)\) format\('woff2'\)/);
  if (!urlMatch) return null;
  const fontRes = await fetch(urlMatch[1]);
  return await fontRes.arrayBuffer();
}

export default async function OGImage() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const thisMonthCount = products.filter((p) => {
    const m = p.releaseWeek?.match(/(\d+)月/);
    return m && parseInt(m[1]) === currentMonth;
  }).length;

  const [regular, bold] = await Promise.all([loadFont(500), loadFont(900)]);

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
          fontFamily: "NotoJP",
        }}
      >
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

        <div
          style={{
            fontSize: 128,
            fontWeight: 900,
            color: "#E8756D",
            letterSpacing: 8,
            textShadow: "0 6px 0 #C5534D",
            marginBottom: 20,
          }}
        >
          ガチャなう
        </div>

        <div style={{ fontSize: 32, color: "#6B5B4E", letterSpacing: 4, marginBottom: 40 }}>
          今日の新作ガチャ、ぜんぶチェック
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "14px 28px", borderRadius: 999,
            background: "#FFFFFF", border: "3px solid #F5B82E", color: "#A07018",
            fontSize: 28, fontWeight: 700,
          }}>
            🎪 {currentMonth}月新作 {thisMonthCount}件
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "14px 28px", borderRadius: 999,
            background: "#FFFFFF", border: "3px solid #9BC471", color: "#3E6B2C",
            fontSize: 28, fontWeight: 700,
          }}>
            📦 全{products.length}件掲載中
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 32, fontSize: 22, color: "#9B8978", letterSpacing: 2 }}>
          gacha-now.net
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        ...(regular ? [{ name: "NotoJP", data: regular, weight: 500, style: "normal" }] : []),
        ...(bold ? [{ name: "NotoJP", data: bold, weight: 900, style: "normal" }] : []),
      ],
    }
  );
}
