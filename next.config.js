const products = require("./data/products.json");
const retiredItems = require("./data/retired-items.json");

// ── 退役した商品ページのリダイレクト ──────────────────────────────
//
// scripts/update.js は収集から3ヶ月経った商品を products.json から削除する。
// app/item/[id] は dynamicParams=false なので、消えた瞬間にその URL は 404 になる。
//
// GSC実測（2026-08-31）: インデックス未登録 582件のうち **404が194件**。
// git履歴から復元すると、これまでに消えた商品ページは989件あり、
// 3ヶ月サイクルで四半期あたり約200件ずつ増え続ける構造になっていた。
//
// 商品自体は生産終了で戻らないが、検索で「ちいかわ ラバーマスコット」に
// 当たった人が行きたい先は消えた1商品ではなく「ちいかわの今出ているガチャ」なので、
// ブランドのハブページへ301で送る。404の山を止めつつ、
// 積み上がったシグナルを 5.8clk/page のハブ（[[page-type-value]]）に寄せられる。
//
// 送り先が無いものは今まで通り404のままにする:
//   - brand が その他/New/キャラクター（元々 noindex・[[quality]]）… 441件
//   - そのブランドの商品が現在1件も無い（ハブが空）… 46件
// 意味の薄いページへまとめて飛ばすとソフト404扱いになるため、無理に拾わない。
const GENERIC_BRANDS = new Set(["その他", "New", "キャラクター"]);

// リダイレクトは無期限には持たない。1年を過ぎたURLは検索結果からもリンク元からも
// ほぼ消えるので落とす（放置すると毎年800件ずつルーティング表が膨らむ）。
const RETENTION_DAYS = 365;

function retiredRedirects() {
  const liveBrands = new Set(products.map((p) => p.brandSlug).filter(Boolean));
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 3600 * 1000;

  return retiredItems
    .filter((p) => {
      if (!p.brandSlug || !liveBrands.has(p.brandSlug)) return false;
      if (GENERIC_BRANDS.has(p.brand)) return false;
      const seen = Date.parse(p.lastSeen);
      return Number.isFinite(seen) && seen >= cutoff;
    })
    .map((p) => ({
      source: `/item/${p.id}`,
      destination: `/brand/${p.brandSlug}`,
      permanent: true,
    }));
}

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
  async redirects() {
    return retiredRedirects();
  },
};

module.exports = nextConfig;
