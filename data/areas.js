// エリア別のガチャガチャ専門店まとめ（/area/[slug]）
//
// 2026-11-14 追加。Googleトレンドで「池袋 ガチャガチャ」「横浜 ガチャガチャ」
// 「梅田 ガチャガチャ」に需要があることをユーザーが確認したのが発端。
// 47都道府県を同じ型で量産すると誘導ページ扱い・薄いページになるので、
// 需要のある地域だけを手で確認した店舗情報で作る。
//
// 【店舗情報の出どころ】すべて各チェーンの公式店舗一覧で 2026-11-14 に確認した。
//   - ガシャポンのデパート: https://bandainamco-am.co.jp/others/capsule-toy-store/store/
//   - ガチャガチャの森:     https://www.gachagachanomori.com/shoplist/
//   - #C-pla（トーシン）:    https://toshin.jpn.com/shop/ （東京の36店に池袋の店は無い）
//   - gashacoco:            https://gashacoco.jp/shop-list
//   - カプセル楽局:          https://www.warehousenet.jp/capsule/
//   未掲載: カプコンの「カプセルラボ 池袋」は公式ページが自動取得を拒否し確認できていない。
// 収集はスクリプトでは行わない（gashapon.jp 系は大量アクセスで403になる。
// [[official-info-scraping]]）。見直すときも公式一覧を目で確認して VERIFIED_AT を更新する。
//
// 【書かないこと】公式に無い数字（台数・徒歩分数）は推測で埋めない。
// 台数は公式一覧に載っている店だけ。営業時間は施設の都合で変わるので、
// ページ側で「来店前に公式で確認」を必ず添える。
//
// 【geo】国土地理院の住所検索（msearch.gsi.go.jp）で住所から取った [緯度, 経度]。
// サンシャインシティの2店は同じ番地なので、アルタ店だけ実際の位置に寄せて手でずらしてある。
// 2026-11-14、ユーザーの判断で紹介文（lead/tips）は外し、地図で場所を見せる形にした。

export const VERIFIED_AT = { iso: "2026-11-14", label: "2026年11月14日" };

const CHAINS = {
  gashadepa: {
    name: "ガシャポンのデパート",
    operator: "バンダイナムコアミューズメント",
    url: "https://bandainamco-am.co.jp/others/capsule-toy-store/store/",
  },
  mori: {
    name: "ガチャガチャの森",
    operator: "ルルアーク",
    url: "https://www.gachagachanomori.com/shoplist/",
  },
  // 運営会社は公式サイトから確認できなかったので書かない（operator 無し）
  gashacoco: {
    name: "gashacoco",
    url: "https://gashacoco.jp/shop-list",
  },
  // 店舗ごとの公式ページは無く、一覧ページだけ
  rakkyoku: {
    name: "カプセル楽局",
    operator: "ゲオグループ",
    url: "https://www.warehousenet.jp/capsule/",
  },
  // #C-pla の公式サイト c-pla.jp は運営会社トーシンのサイトへ移っている。
  // 台数ではなく「設置ボックス数」で公表しているので、表記もそれに合わせる。
  cpla: {
    name: "#C-pla",
    operator: "トーシン",
    url: "https://toshin.jpn.com/shop/",
  },
};

export function getChain(key) {
  return CHAINS[key];
}

export const AREAS = [
  {
    slug: "ikebukuro",
    name: "池袋",
    pref: "東京都豊島区",
    groups: [
      {
        title: "サンシャインシティ（東池袋）",
        stores: [
          {
            name: "ガシャポンのデパート 池袋総本店",
            chain: "gashadepa",
            address: "東京都豊島区東池袋3-1-3 サンシャインシティ ワールドインポートマートビル 3F",
            geo: [35.727844, 139.719986],
            hours: "10:00〜21:00（年中無休）",
            machines: "3,000面以上",
            access: "池袋駅から徒歩約8分／東京メトロ有楽町線 東池袋駅から徒歩約3分",
            note: "世界最大級のガシャポン専門店。ガシャポンバンダイオフィシャルショップ併設。",
            officialUrl: "https://bandainamco-am.co.jp/others/capsule-toy-store/store/ikebukuro/",
          },
          {
            name: "ガチャガチャの森 池袋サンシャインシティアルタ店",
            chain: "mori",
            address: "東京都豊島区東池袋3-1-3 池袋サンシャインシティアルタ 1F",
            geo: [35.7289, 139.7186],
            hours: "11:00〜20:00",
            machines: "約1,240台",
            access: "池袋駅から徒歩約8分",
            note: "関東のガチャガチャの森では最大規模。複数メーカーの商品が並びます。",
          },
        ],
      },
      {
        title: "池袋駅東口・サンシャイン通り",
        stores: [
          {
            name: "gashacoco 池袋",
            chain: "gashacoco",
            address: "東京都豊島区東池袋1-41-6 池袋菊邑ビル 1F・B1F",
            geo: [35.731483, 139.712875],
            hours: "11:00〜22:00",
            access: "池袋駅 東口",
            note: "1階と地下1階の2フロア構成。",
            officialUrl: "https://gashacoco.jp/shop-list/2482",
          },
          {
            name: "gashacoco 池袋サンシャイン通り",
            chain: "gashacoco",
            address: "東京都豊島区東池袋1-21-13 aune池袋 1F",
            geo: [35.730656, 139.715973],
            hours: "11:00〜22:00",
            access: "池袋駅 東口（サンシャイン通り沿い）",
            officialUrl: "https://gashacoco.jp/shop-list/3219",
          },
          {
            name: "カプセル楽局 EX池袋店",
            chain: "rakkyoku",
            address: "東京都豊島区南池袋1-22-4 エイチ・エフ南池袋ビル",
            geo: [35.729229, 139.712296],
            hours: "10:00〜23:00",
            access: "池袋駅 東口",
          },
        ],
      },
      {
        title: "池袋駅西口",
        stores: [
          {
            name: "カプセル楽局 池袋西口店",
            chain: "rakkyoku",
            address: "東京都豊島区西池袋1-16-3",
            geo: [35.730747, 139.708893],
            hours: "10:00〜22:00",
            access: "池袋駅 2a出口から徒歩1分",
            note: "2026年6月にオープンしたゲオグループのガチャガチャ専門店。",
          },
        ],
      },
    ],
  },
  {
    slug: "yokohama",
    name: "横浜",
    pref: "神奈川県横浜市",
    groups: [
      {
        title: "横浜駅西口",
        stores: [
          {
            name: "#C-pla 横浜西口店",
            chain: "cpla",
            address: "神奈川県横浜市西区南幸1-10-1 相鉄南幸16ビル 1〜3F",
            geo: [35.46505, 139.620041],
            hours: "10:00〜23:00",
            machines: "設置ボックス数 2,661",
            access: "横浜駅 西口",
            note: "1〜3階の3フロア構成。3階には推し活グッズ中心の「Oshi-pla 横浜西口店」も入っています。",
            officialUrl: "https://toshin.jpn.com/shop/%e6%a8%aa%e6%b5%9c%e8%a5%bf%e5%8f%a3%e5%ba%97/",
          },
          {
            name: "ガシャポンのデパート 横浜ビブレ店",
            chain: "gashadepa",
            address: "神奈川県横浜市西区南幸2-15-13 横浜ビブレ 7F",
            geo: [35.464622, 139.617844],
            hours: "11:00〜21:00",
            access: "横浜駅 西口",
          },
          {
            name: "ガシャポンのデパート エディオン横浜西口本店",
            chain: "gashadepa",
            address: "神奈川県横浜市西区南幸2-16 エディオン横浜西口本店 7F（ネバーランドフロア内）",
            geo: [35.464527, 139.617218],
            hours: "10:00〜21:00",
            access: "横浜駅 西口",
          },
        ],
      },
      {
        title: "みなとみらい・桜木町",
        stores: [
          {
            name: "ガチャガチャの森 コレットマーレ店",
            chain: "mori",
            address: "神奈川県横浜市中区桜木町1-1-7 コレットマーレ 5F",
            geo: [35.453564, 139.629242],
            hours: "11:00〜20:00",
            machines: "約1,180台",
            access: "JR・市営地下鉄 桜木町駅前",
            note: "2026年5月にオープンした、みなとみらいエリア初のガチャガチャの森。",
          },
          {
            name: "ガシャポンのデパート 横浜ワールドポーターズ店",
            chain: "gashadepa",
            address: "神奈川県横浜市中区新港2-2-1 横浜ワールドポーターズ 2F",
            geo: [35.453987, 139.638855],
            hours: "10:30〜21:00",
            access: "みなとみらい線 馬車道駅・みなとみらい駅／JR 桜木町駅",
          },
          {
            name: "#C-pla＋006 MARK IS みなとみらい店",
            chain: "cpla",
            address: "神奈川県横浜市西区みなとみらい3-5-1 MARK IS みなとみらい 3F",
            geo: [35.456959, 139.631927],
            hours: "月〜木 10:00〜20:00／金〜日・祝・祝前日 10:00〜21:00",
            machines: "設置ボックス数 1,047",
            access: "みなとみらい線 みなとみらい駅",
            officialUrl: "https://toshin.jpn.com/shop/mark-is-%e3%81%bf%e3%81%aa%e3%81%a8%e3%81%bf%e3%82%89%e3%81%84/",
          },
        ],
      },
      {
        title: "中華街",
        stores: [
          {
            name: "#C-pla 横浜中華街店",
            chain: "cpla",
            address: "神奈川県横浜市中区山下町143-1 サリオビル 1〜3F",
            geo: [35.442642, 139.644714],
            hours: "10:00〜22:00",
            machines: "設置ボックス数 1,946",
            access: "みなとみらい線 元町・中華街駅",
            note: "中華街の中にある3フロアの大型店。",
            officialUrl: "https://toshin.jpn.com/shop/%e6%a8%aa%e6%b5%9c%e4%b8%ad%e8%8f%af%e8%a1%97%e5%ba%97/",
          },
        ],
      },
      {
        title: "横浜市内のその他の店舗",
        compact: true,
        stores: [
          {
            name: "ガチャガチャの森 ノースポート・モール店",
            chain: "mori",
            address: "神奈川県横浜市都筑区中川中央1-25-1 ノースポート・モール 4F",
            geo: [35.553181, 139.579468],
            hours: "10:00〜21:00",
            machines: "約750台",
            access: "市営地下鉄 センター北駅",
          },
          {
            name: "ガシャポンのデパート 港北TOKYUショッピングセンター店",
            chain: "gashadepa",
            address: "神奈川県横浜市都筑区茅ヶ崎中央5-1 港北TOKYU S.C. 6F（namco内）",
            geo: [35.544209, 139.572586],
            hours: "10:00〜21:00",
            access: "市営地下鉄 センター南駅",
          },
          {
            name: "ガシャポンのデパート イトーヨーカドーららぽーと横浜店",
            chain: "gashadepa",
            address: "神奈川県横浜市都筑区池辺町4035-1 2F",
            geo: [35.5173, 139.566422],
            hours: "10:00〜21:00",
            access: "JR横浜線 鴨居駅",
          },
          {
            name: "ガチャガチャの森 FOOD&TIME ISETAN OFUNA店",
            chain: "mori",
            address: "神奈川県横浜市栄区笠間2-2-1 FOOD&TIME ISETAN OFUNA 2F",
            geo: [35.355221, 139.533356],
            access: "JR 大船駅",
          },
        ],
      },
    ],
  },
  {
    slug: "umeda",
    name: "梅田",
    pref: "大阪府大阪市北区",
    groups: [
      {
        title: "梅田・茶屋町",
        stores: [
          {
            name: "#C-pla 梅田茶屋町店",
            chain: "cpla",
            address: "大阪府大阪市北区茶屋町2-19 JPR茶屋町ビル 1〜3F",
            geo: [34.705994, 135.498901],
            hours: "10:00〜23:00",
            machines: "設置ボックス数 2,858",
            access: "阪急 大阪梅田駅",
            note: "1〜3階の3フロア構成。23時まで営業。",
            officialUrl: "https://toshin.jpn.com/shop/%e6%a2%85%e7%94%b0%e8%8c%b6%e5%b1%8b%e7%94%ba%e5%ba%97/",
          },
          {
            name: "ガチャガチャの森 梅田茶屋町店",
            chain: "mori",
            address: "大阪府大阪市北区茶屋町15-34",
            geo: [34.708, 135.499451],
            hours: "日〜木 10:00〜21:00／金・土 10:00〜22:00",
            machines: "約2,400台",
            access: "阪急 大阪梅田駅から徒歩約5分",
            note: "西日本最大級。1階・2階の2フロア構成。",
          },
          {
            name: "ガシャポンのデパート HEP FIVE店",
            chain: "gashadepa",
            address: "大阪府大阪市北区角田町5-15 HEP FIVE 9F",
            geo: [34.703846, 135.499634],
            hours: "11:00〜22:30（エリアにより営業終了時間が異なります）",
            access: "阪急 大阪梅田駅／JR 大阪駅",
          },
        ],
      },
    ],
  },
];

export function getAreaBySlug(slug) {
  return AREAS.find((a) => a.slug === slug) || null;
}

export function storeCount(area) {
  return area.groups.reduce((n, g) => n + g.stores.length, 0);
}
