// キャラクター・テーマ別ページの定義。pattern は商品名との正規表現マッチで判定する
//
// 【pattern は scripts/brand.js の BRAND_MAP と揃える】
// 同じIPの別表記を BRAND_MAP だけに足して、こちらに反映しないまま放置していた。
// BRAND_MAP は name.includes() で判定するので brand は正しく付くが、
// ハブページの掲載は下の pattern だけで決まるため、英字表記・別名の商品が丸ごと落ちる。
//
// 2026-09-16 時点の実測（data/products.json 785件）で、ブランド判定は通っているのに
// キャラページに出ていなかったのは合計36件:
//   disney 23件（TOY STORY / ピクサー / ズートピア / ベイマックス / Winnie the Pooh ほか）
//   moomin 4件（MOOMIN 表記）／ sanrio 3件（シュガーバニーズ・ジュエルペット）
//   gundam 2件（機動戦士Gundam GQuuuuuuX・ガンプラくん）／ precure 2件（ぷちきゅあ）
//   pokemon 2件（ポケピース・Pokémon Pixel Art）
// きっかけは「TOY STORY5 めじるしアクセサリー」。バンダイはめじるし系を英字で登録していて
// 「トイ・ストーリー」に一度も一致しなかった。
//
// 英字キーワードは短いと誤爆する（BRAND_MAP の "NANA" → "BANANA FISH" の件と同じ）。
// 単独の "プリンセス" は他社IPを拾うので入れず、"Disney" で Disney Princess を拾う。
export const CHARACTERS = [
  { slug: "sanrio", name: "サンリオ", pattern: "サンリオ|ハローキティ|キティ|シナモロール|クロミ|マイメロ|ポムポムプリン|ポチャッコ|ハンギョドン|けろっぴ|シュガーバニーズ|ジュエルペット" },
  { slug: "pokemon", name: "ポケモン", pattern: "ポケモン|ポケットモンスター|ピカチュウ|イーブイ|ポケピース|Pok[eé]mon" },
  { slug: "disney", name: "ディズニー", pattern: "ディズニー|Disney|ミッキー|プーさん|Winnie the Pooh|スティッチ|トイ・ストーリー|TOY STORY|トイストーリー|ピクサー|ズートピア|ニック＆ジュディ|ポテトヘッド|ラプンツェル|ベイマックス|モンスターズ・インク|ナイトメアー・ビフォア・クリスマス" },
  { slug: "tamagotchi", name: "たまごっち", pattern: "たまごっち" },
  { slug: "crayon-shinchan", name: "クレヨンしんちゃん", pattern: "クレヨンしんちゃん|しんちゃん" },
  { slug: "neko", name: "ねこ・猫", pattern: "ねこ|ネコ|猫" },
  { slug: "gundam", name: "ガンダム", pattern: "ガンダム|モビルスーツ|機動戦士|ガンプラ" },
  { slug: "precure", name: "プリキュア", pattern: "プリキュア|ぷちきゅあ" },
  { slug: "kirby", name: "星のカービィ", pattern: "カービィ" },
  { slug: "one-piece", name: "ワンピース", pattern: "ワンピース|ONE PIECE" },
  { slug: "moomin", name: "ムーミン", pattern: "ムーミン|リトルミイ|MOOMIN" },
  { slug: "chiikawa", name: "ちいかわ", pattern: "ちいかわ|ハチワレ" },
  { slug: "chainsaw-man", name: "チェンソーマン", pattern: "チェンソーマン" },
  { slug: "spongebob", name: "スポンジ・ボブ", pattern: "スポンジ・?ボブ" },
  { slug: "conan", name: "名探偵コナン", pattern: "名探偵コナン|コナン" },
  { slug: "obungu", name: "お文具といっしょ", pattern: "お文具" },
  { slug: "higuchi-yuko", name: "ヒグチユウコ", pattern: "ヒグチユウコ" },
  { slug: "madoka", name: "魔法少女まどか☆マギカ", pattern: "まどか☆マギカ|まどマギ" },
  { slug: "ccsakura", name: "カードキャプターさくら", pattern: "カードキャプターさくら" },
  { slug: "saint-seiya", name: "聖闘士星矢", pattern: "聖闘士星矢" },
  { slug: "hololive", name: "ホロライブ", pattern: "ホロライブ" },
  { slug: "predator", name: "プレデター", pattern: "プレデター" },
  { slug: "jewelpet", name: "ジュエルペット", pattern: "ジュエルペット" },
  { slug: "twisted-wonderland", name: "ツイステッドワンダーランド", pattern: "ツイステ" },
  { slug: "star-wars", name: "スター・ウォーズ", pattern: "スター・?ウォーズ|グローグー|マンダロリアン" },
];

export function getCharacterBySlug(slug) {
  return CHARACTERS.find((c) => c.slug === slug);
}

export function filterProductsByCharacter(products, character) {
  const re = new RegExp(character.pattern);
  return products.filter((p) => re.test(p.name));
}

export function charactersForProduct(product) {
  return CHARACTERS.filter((c) => new RegExp(c.pattern).test(product.name));
}
