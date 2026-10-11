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
//
// 【縮めるときの注意】lastSeen は連続分布ではなく、収集の一括クリーンアップに
// 対応した数ヶ月おきの塊になっている。2026-09-08 時点の内訳:
//   2026-03: 201件 / 2026-06: 329件 / 2026-07: 19件 / 2026-08: 136件
// そのため件数は日数に対して階段状にしか動かない。同日時点の実測:
//   365〜210日 → 685件 ／ 180〜120日 → 484件 ／ 90日 → 281件
// 「365→270」のような刻み方は1件も減らない。減らしたいときは
// 落としたい塊の直後に来る値を選ぶこと。
//
// 現在は365日のまま687件（.github/workflows/update-products.yml の警告は800件）。
const RETENTION_DAYS = 365;

// 日数だけで制御するのは2026-10-11に打ち止めにした。理由は2つ:
//
// 1. 日数を縮めても件数が階段状にしか動かない（上の内訳のとおり）。365→210に
//    しないと1件も減らず、210にすると2026-03の塊198件が丸ごと落ちる。
//    その塊は301を張ったのが2026-08-31で、6週間しか経っていない＝
//    リダイレクトが仕事を終える前に404へ戻すことになる。
// 2. 退役は3ヶ月サイクルで必ず来るので、日数を手で縮める運用はいつか忘れる。
//    在庫の collectedAt から見た実測見込み（2026-10-11）:
//      10月退役後 768件 → 11月 984件 → 12月 1,167件 → 2027-01 1,365件
//    Vercelのルート数上限(1,024)も2026-12に超える。
//
// そこで「新しい順に MAX_REDIRECTS 件まで」で硬く蓋をする。日数フィルタは
// 意味のフィルタとして残し、件数の上限はこちらが保証する。
// - 2026-10-11時点の出力は687件なので、この変更で落ちるURLは無い（回帰ゼロ）。
// - 波が来ると古い lastSeen から自動で溢れる。301の価値は新しいものほど高いので、
//   落とす順番としてこれが正しい。
// - 800の警告（update-products.yml）はキャップが効いていれば鳴らない。
//   鳴ったらキャップが外れた合図として扱う。
const MAX_REDIRECTS = 750;

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
    // 新しい順に並べてから上限で切る（溢れるのは常に一番古い301）
    .sort((a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen))
    .slice(0, MAX_REDIRECTS)
    .map((p) => ({
      source: `/item/${p.id}`,
      destination: `/brand/${p.brandSlug}`,
      permanent: true,
    }));
}

// ── OG画像に渡す集計値 ──────────────────────────────────────────
//
// app/opengraph-image.jsx は Edge Function として動く。そこで products.json を
// import すると1.5MBのJSONが丸ごとバンドルに載り、Hobbyの1MB上限を超えて
// デプロイが落ちる（2026-09-01に商品が876件へ増えて超過、以降の本番デプロイが
// 全滅した。エラーは "The Edge Function opengraph-image size is 1 MB and
// your plan size limit is 1 MB"。ビルド自体は通るのでローカルでは再現しない）。
//
// OG画像が実際に使うのは「総件数」と「今月の件数」の2つだけなので、
// ここでビルド時に数えて env で文字列として埋め込む。バンドルに載るのは
// 数十バイトで済み、商品が何件に増えても上限に近づかない。
//
// 月別に持つのは、OG画像が「今月」をリクエスト時刻から決めるため。
// products.json はビルド時にしか変わらないので、鮮度は import 版と変わらない。
function ogMonthCounts() {
  const counts = {};
  for (const p of products) {
    const m = p.releaseWeek?.match(/(\d+)月/);
    if (!m) continue; // 9割は「発売中」等で月が取れない
    const key = String(parseInt(m[1], 10));
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    OG_TOTAL_ITEMS: String(products.length),
    OG_MONTH_COUNTS: JSON.stringify(ogMonthCounts()),
  },
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
