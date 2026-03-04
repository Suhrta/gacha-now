import Script from "next/script";
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://gacha-now.vercel.app"),
  title: "ガチャなう | カプセルトイ・ガチャガチャ新作情報まとめ",
  description:
    "毎日自動更新！ガチャガチャ・カプセルトイの新作情報300件以上をまとめてチェック。バンダイ、タカラトミーアーツ、キタンクラブなど人気メーカー対応。サンリオ・ちいかわ・ポケモンなど話題のカプセルトイ情報を発売日・ブランド別に探せます。",
  keywords: [
    "ガチャガチャ", "カプセルトイ", "新作", "ガチャなう",
    "ガシャポン", "バンダイ", "タカラトミーアーツ", "キタンクラブ",
    "サンリオ", "ちいかわ", "ポケモン", "ワンピース",
    "カプセルトイ 新作 2025", "ガチャガチャ 最新",
  ],
  alternates: {
    canonical: "https://gacha-now.vercel.app",
  },
  openGraph: {
    title: "ガチャなう | カプセルトイ・ガチャガチャ新作情報まとめ",
    description:
      "毎日自動更新！300件以上のカプセルトイ新作情報をブランド別にチェック。バンダイ・タカトミ・キタンクラブ対応。",
    type: "website",
    locale: "ja_JP",
    url: "https://gacha-now.vercel.app",
    siteName: "ガチャなう",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ガチャなう - カプセルトイ新作情報サイト",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ガチャなう | カプセルトイ新作情報まとめ",
    description:
      "毎日自動更新！300件以上のガチャガチャ新作情報をチェック",
    images: ["/og-image.png"],
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "ガチャなう",
              url: "https://gacha-now.vercel.app",
              description:
                "毎日自動更新！ガチャガチャ・カプセルトイの新作情報300件以上をまとめてチェック。",
              inLanguage: "ja",
            }),
          }}
        />
        <div className="max-w-[430px] mx-auto relative">
          {children}
        </div>
      </body>
    </html>
  );
}