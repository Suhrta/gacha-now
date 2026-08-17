/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Vercelの画像最適化は使わない。
    //
    // Hobbyの無料枠（変換5,000回・キャッシュリード30万ユニット/月）を2026-08に
    // 使い切り、新規の変換が402で返るようになった。超過しても課金はされないが、
    // キャッシュに無い画像が表示されなくなる = 新商品ほど画像が出ない、という
    // 一番まずい壊れ方をする。deviceSizes/minimumCacheTTL は既に絞りきっており、
    // 設定で削れる余地は残っていなかった。
    //
    // 代わりに scripts/build-thumbs.js が仕入れ元CDNの画像を縮小・WebP化して
    // public/thumb/ に置き、素の <img> で配信している（lib/images.js）。
    // 静的ファイル配信はこの上限の対象外なので、枠から完全に降りられる。
    //
    // unoptimized はその状態を固定するための保険。今は next/image を使っている
    // 箇所は無いが、うっかり足しても課金枠に戻らないようにしてある。
    unoptimized: true,
  },
};

module.exports = nextConfig;
