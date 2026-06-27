// シリーズ特集ページの定義。キャラ・ブランドとは別の「横断シリーズ」軸。
// 同じコンセプト・仕掛けのカプセルトイを作品をまたいで集める。
// pattern は商品名との正規表現マッチで判定する。
export const SERIES = [
  {
    slug: "katazun",
    name: "肩ズンFig.",
    pattern: "肩ズン",
    intro:
      "肩ズンFig.（かたずんフィギュア）は、キャラクターが肩に“ズン”と寄りかかる姿を立体化したフィギュアシリーズ。文豪ストレイドッグス、呪術廻戦、ハイキュー!!、葬送のフリーレン、ディズニー作品など幅広いタイトルで展開され、肩や手のひら、モニターのフチなどに飾って楽しめるのが魅力です。",
  },
  {
    slug: "capsule-rubber-mascot",
    name: "カプセルラバーマスコット",
    pattern: "カプセルラバーマスコット",
    intro:
      "カプセルラバーマスコットは、やわらかいラバー素材で作られたマスコットシリーズ。キーホルダーやバッグチャームとして気軽に使え、サンリオやプリキュアから話題のアニメ作品まで、幅広いタイトルでラインナップされているのが特徴です。",
  },
  {
    slug: "flocky",
    name: "フロッキーマスコット",
    pattern: "フロッキー",
    intro:
      "フロッキーシリーズは、表面に起毛（フロッキー）加工をほどこした、さわり心地のよいマスコット・フィギュア。マットでやわらかな質感が特徴で、動物モチーフや人気キャラクターを中心に、思わず触れたくなるコレクション性で人気を集めています。",
  },
  {
    slug: "mame-gasha-bon",
    name: "豆ガシャ本",
    pattern: "豆ガシャ本",
    intro:
      "豆ガシャ本（まめガシャぼん）は、実在の雑誌や書籍を手のひらサイズで精巧に再現したミニチュア本シリーズ。表紙からページの中身まで作り込まれており、その再現度の高さとコレクション性から、本好き・ガジェット好きにも支持されています。",
  },
];

export function getSeriesBySlug(slug) {
  return SERIES.find((s) => s.slug === slug);
}

export function filterProductsBySeries(products, series) {
  const re = new RegExp(series.pattern);
  return products.filter((p) => re.test(p.name));
}

// 商品が属するシリーズ（item ページのシリーズ導線用）
export function seriesForProduct(product) {
  return SERIES.filter((s) => new RegExp(s.pattern).test(product.name));
}
