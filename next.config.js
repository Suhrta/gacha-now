/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 生成する幅を絞って画像変換の回数を抑える（Hobbyは5,000回/月）。
    // next/image を通すのは一覧のサムネイルと関連商品だけで、
    // 全画面表示はしないため広い幅は要らない。
    deviceSizes: [640, 1080],
    imageSizes: [256, 384],
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
