import Script from "next/script";
import products from "../data/products.json";
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://gacha-now.net"),
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
    canonical: "https://gacha-now.net",
  },
  openGraph: {
    title: "ガチャなう | カプセルトイ・ガチャガチャ新作情報まとめ",
    description:
      "毎日自動更新！300件以上のカプセルトイ新作情報をブランド別にチェック。バンダイ・タカトミ・キタンクラブ対応。",
    type: "website",
    locale: "ja_JP",
    url: "https://gacha-now.net",
    siteName: "ガチャなう",
  },
  twitter: {
    card: "summary_large_image",
    title: "ガチャなう | カプセルトイ新作情報まとめ",
    description:
      "毎日自動更新！300件以上のガチャガチャ新作情報をチェック",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <meta name="google-site-verification" content="_vAeJZmCqswwfoo6nTj-htoAdOQuiIE4aS-4OCLxiNw" />
        <meta name="google-site-verification" content="IbrG8q-GvgybpNjeJ6NKM6YZQj0hHbC9XRCOWHyqGnc" />
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1657546819928079"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
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
              url: "https://gacha-now.net",
              description:
                "毎日自動更新！ガチャガチャ・カプセルトイの新作情報300件以上をまとめてチェック。",
              inLanguage: "ja",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://gacha-now.net/?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "カプセルトイ新作ラインナップ",
              numberOfItems: products.length,
              itemListElement: products.slice(0, 20).map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `https://gacha-now.net/item/${p.id}`,
                name: p.name,
              })),
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