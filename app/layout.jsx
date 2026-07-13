import Script from "next/script";
import products from "../data/products.json";
import { DATA_UPDATED } from "../lib/site-meta";
import "./globals.css";

// 検索語と完全一致する語を先頭に、鮮度（年月）を切れずに見える位置に置く。
// ブランド名は末尾（切れてもfavicon・サイト名表示で補える）
const SITE_TITLE = DATA_UPDATED
  ? `ガチャガチャ新作・最新情報【${DATA_UPDATED.year}年${DATA_UPDATED.month}月】毎日更新｜ガチャなう`
  : "ガチャガチャ新作・最新情報 毎日更新｜ガチャなう";

const SITE_DESCRIPTION = DATA_UPDATED
  ? `【${DATA_UPDATED.label}更新】ガチャガチャ・カプセルトイを発売日順に毎日更新。サンリオ・ちいかわ・ポケモンなど人気キャラや、バンダイ・タカラトミーアーツなどメーカー・価格別に探せます。`
  : "毎日更新！ガチャガチャ・カプセルトイの新作をまとめてチェック。サンリオ・ちいかわ・ポケモンなど話題のカプセルトイを発売日・価格・ブランド別に探せます。";

const OG_DESCRIPTION = DATA_UPDATED
  ? `【${DATA_UPDATED.label}更新】ガチャガチャ新作を発売日・価格・メーカー別にチェック。毎日更新。`
  : "毎日更新！カプセルトイ新作情報を発売日・価格・ブランド別にチェック。";

export const metadata = {
  metadataBase: new URL("https://gacha-now.net"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: [
    "ガチャガチャ", "カプセルトイ", "新作", "ガチャなう",
    "ガシャポン", "バンダイ", "タカラトミーアーツ", "キタンクラブ",
    "サンリオ", "ちいかわ", "ポケモン", "ワンピース",
    "カプセルトイ 新作 2026", "ガチャガチャ 最新",
  ],
  alternates: {
    canonical: "https://gacha-now.net",
  },
  openGraph: {
    title: SITE_TITLE,
    description: OG_DESCRIPTION,
    type: "website",
    locale: "ja_JP",
    url: "https://gacha-now.net",
    siteName: "ガチャなう",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: OG_DESCRIPTION,
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
      <body className="min-h-screen bg-cream font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": "https://gacha-now.net/#website",
              name: "ガチャなう",
              alternateName: ["gacha-now.net", "gacha-now", "gacha now", "がちゃなう"],
              url: "https://gacha-now.net",
              description: OG_DESCRIPTION,
              ...(DATA_UPDATED ? { dateModified: DATA_UPDATED.iso } : {}),
              inLanguage: "ja",
              publisher: { "@id": "https://gacha-now.net/#organization" },
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
              "@type": "Organization",
              "@id": "https://gacha-now.net/#organization",
              name: "ガチャなう",
              alternateName: ["gacha-now.net", "gacha-now"],
              url: "https://gacha-now.net",
              logo: {
                "@type": "ImageObject",
                url: "https://gacha-now.net/icons/logo-mark.png",
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
        <div className="max-w-site mx-auto relative px-4 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}