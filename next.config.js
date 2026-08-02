/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 生成する幅を絞って画像変換の回数を抑える（Hobbyは5,000回/月）。
    // next/image を通すのは一覧のサムネイルと関連商品だけで、
    // 全画面表示はしないため広い幅は要らない。
    //
    // 4本（256/384/640/1080）だと商品1件あたり2〜3変換になり、
    // 商品659件 × 毎月のキャッシュ失効で無料枠を使い切った（2026-08）。
    // 実表示は240px前後なので 384（等倍〜低DPR）と 640（Retina）の2本で足りる。
    // quality は既定の75のまま。変えると変換キーが変わり全画像が再変換になる。
    deviceSizes: [640],
    imageSizes: [384],
    formats: ["image/webp"],
    // 既定の60秒だとキャッシュが切れるたびに再変換となり課金対象になる。
    // 商品画像は差し替わらないので長く持たせる。
    minimumCacheTTL: 2678400, // 31日
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "thumbnail.image.rakuten.co.jp" },
      // 商品画像の仕入れ元CDN
      { protocol: "https", hostname: "bandai-a.akamaihd.net" },
      { protocol: "https", hostname: "www.takaratomy-arts.co.jp" },
      { protocol: "https", hostname: "kitan.jp" },
      { protocol: "https", hostname: "capsule.bushiroad-creative.com" },
    ],
  },
};

module.exports = nextConfig;
