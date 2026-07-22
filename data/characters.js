// キャラクター・テーマ別ページの定義。pattern は商品名との正規表現マッチで判定する
export const CHARACTERS = [
  { slug: "sanrio", name: "サンリオ", pattern: "サンリオ|ハローキティ|キティ|シナモロール|クロミ|マイメロ|ポムポムプリン|ポチャッコ|ハンギョドン|けろっぴ" },
  { slug: "pokemon", name: "ポケモン", pattern: "ポケモン|ポケットモンスター|ピカチュウ|イーブイ" },
  { slug: "disney", name: "ディズニー", pattern: "ディズニー|ミッキー|プーさん|スティッチ|トイ・ストーリー" },
  { slug: "tamagotchi", name: "たまごっち", pattern: "たまごっち" },
  { slug: "crayon-shinchan", name: "クレヨンしんちゃん", pattern: "クレヨンしんちゃん|しんちゃん" },
  { slug: "neko", name: "ねこ・猫", pattern: "ねこ|ネコ|猫" },
  { slug: "gundam", name: "ガンダム", pattern: "ガンダム|モビルスーツ" },
  { slug: "precure", name: "プリキュア", pattern: "プリキュア" },
  { slug: "kirby", name: "星のカービィ", pattern: "カービィ" },
  { slug: "one-piece", name: "ワンピース", pattern: "ワンピース|ONE PIECE" },
  { slug: "moomin", name: "ムーミン", pattern: "ムーミン|リトルミイ" },
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
  { slug: "tensura", name: "転スラ", pattern: "転生したらスライム|転スラ" },
  { slug: "haikyu", name: "ハイキュー!!", pattern: "ハイキュー" },
  { slug: "dragon-quest", name: "ドラゴンクエスト", pattern: "ドラゴンクエスト|ドラクエ" },
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
