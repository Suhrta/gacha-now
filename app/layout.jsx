import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "ガチャなう | カプセルトイ新作情報",
  description: "毎日更新！カプセルトイ新作情報をお届け。サンリオ、たまごっち、ちいかわ、ポケモンなど人気カプセルトイ情報をチェック！",
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
      <head>
        <meta name="google-site-verification" content="_vAeJZmCqswwfoo6nTj-htoAdOQuiIE4aS-4OCLxiNw" />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-3DP286TY6C"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-3DP286TY6C');
          `}
        </Script>
      </head>
      <body className="min-h-screen bg-cream font-pixel">
        <div className="max-w-[430px] mx-auto relative">
          {children}
        </div>
      </body>
    </html>
  );
}