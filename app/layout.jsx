import "./globals.css";

export const metadata = {
  title: "ガチャなう | カプセルトイ新作情報",
  description: "カプセルトイ（ガチャガチャ）の新作情報をピクセルアート風UIでお届け。サンリオ、ちいかわ、ポケモンなど人気ブランドの最新ガチャ情報をチェック！",
  keywords: ["ガチャガチャ", "カプセルトイ", "新作", "ガチャなう", "サンリオ", "ちいかわ", "ポケモン"],
  openGraph: {
    title: "ガチャなう | カプセルトイ新作情報",
    description: "カプセルトイの新作情報をピクセルアート風UIでお届け",
    type: "website",
    locale: "ja_JP",
    siteName: "ガチャなう",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-cream font-pixel">
        <div className="max-w-[430px] mx-auto relative">
          {children}
        </div>
      </body>
    </html>
  );
}
