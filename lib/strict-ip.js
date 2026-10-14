// 権利管理が厳しいIPの判定と、そのコピーを出すかどうかの切り替え。
//
// 【背景】
// タカラトミーアーツのサイトポリシーは、無断転用・転載を断ったうえで
// 「企業等が非営利目的で使用する場合、個人的な使用を目的とする場合…を除き、
//   許諾なく使用することは出来ません」と明記している。
// 当サイトは広告・アフィリエイト収益があり非営利に当たらないため、
// 自サーバー（R2）に画像のコピーを置くことはこの但し書きに収まらない。
// **この読み自体は変わっていない。**
//
// 【現在の方針（2026-10-14のユーザー判断・方針変更）】
// そのうえで、**権利者から指摘が来るまでは表示する**という判断をしている。
// ポリシー上の懸念が消えたのではなく、リスクを承知で表示を優先している。
// 優先順位は「楽天画像 → 無ければR2の自前コピー」。楽天で見つかったものは
// そちらを使う（コピーに依存する商品を増やさないため）。
//
// 一時期（2026-10-14の午前）は厳格IPのコピーを完全に外しており、
// その結果 /brand/disney が67%まで落ちていた。いまは戻してある。
// **「コピーを置かない」と読める古いコメントが残っていたら、それは直し漏れ。**
//
// 【止め方 — 指摘が来たらここだけ変える】
// 下の SHOW_STRICT_IP_COPIES を false にすれば、生成も表示も止まる。
// 表示側（lib/images.js の thumbSources）と生成側（scripts/build-thumbs.js の
// isCopyAllowed）の両方がこの定数を見ているので、1か所で足りる。
// 表示側にも効かせているのが要点で、生成側だけだと products.json に入った
// thumb が次のパイプライン実行まで残り、即座に止められない。
//
// R2上の実体まで消すなら、フラグを倒したうえで
//   HOST=takaratomy-arts.co.jp STRICT_IP_ONLY=1 node scripts/migrate-bandai-images.js
// で削除リストを作り直し、scripts/delete-r2-pending.js を実行する。
// フラグだけではサイト上の掲載が止まるだけで、gachaimg.com のURLを直接叩けば
// 画像は取得できる状態が残る。
//
// 【判定の方針】
// brand（scripts/brand.js が判定した値）と name（商品名）の両方を見る。
// brand は「その他」になることがあり（全875件中195件）、商品名にだけIPが出る
// ケースを取りこぼすため。実測で brand だけだと60件、name も見ると66件になった。
//
// 【ここを単一の情報源にする】
// lib/images.js（表示する候補）・scripts/build-thumbs.js（コピーを作る対象）・
// scripts/migrate-bandai-images.js（thumbを外す対象）が全部これを参照する。
// 片方だけ直すと、表示とデータが食い違って翌日のランで巻き戻る。

/**
 * 厳格IPの自前コピー（R2）を生成・表示するか。
 *
 * **権利者から指摘が来たら false にする。これ1か所で生成も表示も止まる。**
 * 倒した効果の確認は /brand/disney と /brand/sanrio で、
 * 楽天画像が無い商品が「🔒 画像は公式サイトでご確認ください」に変わること。
 * 実測（2026-10-14）: true で disney 58/58・sanrio 53/53・全体 874/876。
 *                     false で disney 52/58・sanrio 46/53・全体 856/876。
 * products.json を書き換えずに表示だけが変わる（= デプロイした瞬間に止まる）。
 */
export const SHOW_STRICT_IP_COPIES = true;

export const STRICT_IP_GROUPS = {
  // ディズニー系。ピクサー・マーベル・スターウォーズはディズニー傘下で
  // ライセンス管理が同じ系統になる。
  ディズニー系: [
    "ディズニー",
    "disney",
    "ピクサー",
    "トイ・ストーリー",
    "トイストーリー",
    "プーさん",
    "スティッチ",
    "ミッキー",
    "ミニー",
    "ドナルド",
    "ツイステ",
    "マーベル",
    "スター・ウォーズ",
    "スターウォーズ",
    "アナと雪",
    "ベイマックス",
    "モンスターズ",
    "ラプンツェル",
    "プリンセス",
    "アリエル",
    "ダンボ",
    "チップとデール",
    // 2026-10-14に対象外94件を目視して拾い直したもの。
    // brand が「その他」になっていて、商品名にしか作品名が出ていなかった。
    "モアナ",
    "ナイトメア・ビフォア・クリスマス",
    "ナイトメアー・ビフォア・クリスマス",
    "シュガー・ラッシュ",
    // 「不思議の国のアリス」は入れていない。原作はパブリックドメインで、
    // ディズニー版かどうかが商品名から判断できないため。
  ],

  // 任天堂およびポケモン（株式会社ポケモン）。
  "任天堂/ポケモン": [
    "ポケモン",
    "ポケットモンスター",
    "ピカチュウ",
    "マリオ",
    "ヨッシー",
    "カービィ",
    "どうぶつの森",
    "スプラトゥーン",
    "ゼルダ",
    "スーパーマリオ",
    // 2026-10-14に対象外94件の目視で追加。
    "MOTHER2",
    "星のカービィ",
  ],

  サンリオ: [
    "サンリオ",
    "ハローキティ",
    "キティ",
    "シナモロール",
    "クロミ",
    "マイメロ",
    "ポムポムプリン",
    "バッドばつ丸",
    "けろけろけろっぴ",
    "ぐでたま",
    "こぎみゅん",
    "ハンギョドン",
  ],
};

const ALL_KEYWORDS = Object.values(STRICT_IP_GROUPS).flat();

function matches(text, keywords) {
  if (!text) return false;
  const lower = String(text).toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

/** この商品が厳格IPに該当するか。brand と name の両方を見る。 */
export function isStrictIp(product) {
  if (!product) return false;
  return (
    matches(product.brand, ALL_KEYWORDS) || matches(product.name, ALL_KEYWORDS)
  );
}

/** 該当するIP群の名前を返す（レポート用。複数該当することがある）。 */
export function strictIpGroups(product) {
  if (!product) return [];
  return Object.entries(STRICT_IP_GROUPS)
    .filter(
      ([, keywords]) =>
        matches(product.brand, keywords) || matches(product.name, keywords)
    )
    .map(([group]) => group);
}
