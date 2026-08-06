/**
 * brand.js - ブランド判定の単一の情報源
 *
 * collect.js（収集時の判定）と structure.js（slug/色/HOT）に分かれていたロジックを集約した。
 * rebrand.js も同じ定義を使うため、BRAND_MAP をここで直すだけで
 * 「新規収集」と「既存データの再判定」の両方に効く。
 *
 * 【なぜブランド判定が重要か】
 * lib/quality.js は brand が GENERIC（その他 等）の商品ページを noindex する。
 * つまり BRAND_MAP の登録漏れ ＝ 検索に載らない、と直結する。
 * 実際、ジョジョ・カードキャプターさくら・HUNTER×HUNTER のような大型IPが
 * 未登録のため「その他」に落ちて noindex されていた（2026-07 に一括登録）。
 */

// ブランドが特定できない場合の値。lib/quality.js の GENERIC_BRANDS と対応する。
export const GENERIC_BRANDS = new Set(["その他", "New", "キャラクター"]);

// ========================================
// ブランド判定マップ
// ========================================
// 上から順に評価し、最初に一致したものを採用する（＝具体的なものほど上に置く）。
//
// キーワードは name.includes() で部分一致するため、短い英字は誤爆に注意。
// 例) "NANA" は "BANANA FISH" に一致してしまうので使わず "矢沢あい" で判定する。
export const BRAND_MAP = [
  { keywords: ["ポケモン", "ポケットモンスター", "ピカチュウ", "Pokémon", "Pokemon", "ポケピース"], brand: "ポケモン" },
  { keywords: ["サンリオ", "ハローキティ", "マイメロ", "MY MELODY", "クロミ", "KUROMI", "シナモロール", "ポムポムプリン", "シュガーバニーズ", "はぴだんぶい", "ジュエルペット"], brand: "サンリオ" },
  { keywords: ["ちいかわ", "ハチワレ"], brand: "ちいかわ" },
  { keywords: ["カービィ", "星のカービィ", "ワドルディ"], brand: "カービィ" },
  // すみっコぐらし・リラックマは San-X 作品だが、単独の検索需要が大きいので先に判定する
  { keywords: ["すみっコ"], brand: "すみっコぐらし" },
  { keywords: ["リラックマ"], brand: "リラックマ" },
  { keywords: ["San-X"], brand: "San-X" },
  { keywords: ["ディズニー", "Disney", "ミッキー", "プリンセス", "ピクサー", "トイ・ストーリー", "TOY STORY", "トイストーリー", "ポテトヘッド", "ズートピア", "ニック＆ジュディ", "リメンバー", "くまのプーさん", "プーさん", "Winnie the Pooh", "ラプンツェル", "リロ&スティッチ", "リロ＆スティッチ", "スティッチ", "ベイマックス", "モンスターズ・インク", "ナイトメアー・ビフォア・クリスマス"], brand: "ディズニー" },
  // 「ルフィ」は使わない: 「カプセルフィギュア」「プールフィギュア」が “〜ルフィギュア” で
  // 部分一致し、初音ミクやジョジョの商品までワンピース扱いになっていた（実測4件すべて誤爆、
  // 逆に「ルフィ」だけで判定が必要な商品は0件）。ONE PIECE / ワンピース表記で足りる。
  { keywords: ["ワンピース", "ONE PIECE"], brand: "ワンピース" },
  { keywords: ["ドラゴンボール"], brand: "ドラゴンボール" },
  { keywords: ["鬼滅", "鬼滅の刃"], brand: "鬼滅の刃" },
  { keywords: ["呪術廻戦", "呪術"], brand: "呪術廻戦" },
  { keywords: ["仮面ライダー", "CTION RIDE", "KAMEN RIDER"], brand: "仮面ライダー" },
  { keywords: ["ガンダム", "機動戦士", "ガンプラ"], brand: "ガンダム" },
  { keywords: ["プリキュア", "ぷちきゅあ"], brand: "プリキュア" },
  { keywords: ["SPY×FAMILY", "スパイファミリー"], brand: "SPY×FAMILY" },
  { keywords: ["転スラ", "転生したらスライム"], brand: "転スラ" },
  { keywords: ["クレヨンしんちゃん"], brand: "クレヨンしんちゃん" },
  { keywords: ["mofusand", "モフサンド"], brand: "mofusand" },
  { keywords: ["スヌーピー", "PEANUTS"], brand: "スヌーピー" },
  { keywords: ["たまごっち"], brand: "たまごっち" },
  { keywords: ["初音ミク"], brand: "初音ミク" },
  // プラレールは「カプセルプラレール きかんしゃトーマス」のように後段のIPとも
  // 一致しうるが、従来どおりトミカ扱いにするためこの位置で判定する
  { keywords: ["トミカ", "tomica", "プラレール"], brand: "トミカ" },
  { keywords: ["ゴジラ"], brand: "ゴジラ" },
  { keywords: ["ウルトラマン", "ウルトラ怪獣"], brand: "ウルトラマン" },
  { keywords: ["NARUTO", "ナルト"], brand: "NARUTO" },
  { keywords: ["ハリー・ポッター", "ハリーポッター"], brand: "ハリー・ポッター" },
  { keywords: ["アンパンマン"], brand: "アンパンマン" },
  { keywords: ["ドラえもん"], brand: "ドラえもん" },
  { keywords: ["犬夜叉"], brand: "犬夜叉" },
  { keywords: ["MOOMIN", "ムーミン"], brand: "ムーミン" },
  { keywords: ["スポンジ・ボブ"], brand: "スポンジ・ボブ" },
  { keywords: ["いきもの大図鑑"], brand: "いきもの大図鑑" },
  { keywords: ["まちぼうけ"], brand: "まちぼうけ" },
  { keywords: ["パンダの穴"], brand: "パンダの穴" },
  { keywords: ["おさるのジョージ"], brand: "おさるのジョージ" },
  { keywords: ["フリーレン", "葬送のフリーレン"], brand: "フリーレン" },
  { keywords: ["まどか☆マギカ", "まどマギ"], brand: "まどか☆マギカ" },
  { keywords: ["アイカツ"], brand: "アイカツ" },
  { keywords: ["藤子不二雄"], brand: "藤子不二雄" },
  // キタンクラブ固有IP
  { keywords: ["コップのフチ子", "フチ子"], brand: "コップのフチ子" },
  { keywords: ["PUTITTO"], brand: "PUTITTO" },
  { keywords: ["コウペンちゃん"], brand: "コウペンちゃん" },
  { keywords: ["タローマン"], brand: "タローマン" },
  { keywords: ["可愛い嘘のカワウソ", "カワウソ"], brand: "可愛い嘘のカワウソ" },
  { keywords: ["おぱんちゅうさぎ"], brand: "おぱんちゅうさぎ" },
  { keywords: ["チェンソーマン"], brand: "チェンソーマン" },
  { keywords: ["ヒロアカ", "僕のヒーローアカデミア"], brand: "ヒロアカ" },
  // ブシロードクリエイティブ関連IP
  { keywords: ["BanG Dream", "バンドリ"], brand: "バンドリ" },
  { keywords: ["ラブライブ"], brand: "ラブライブ" },
  { keywords: ["D4DJ"], brand: "D4DJ" },
  { keywords: ["ぼっち・ざ・ろっく", "ぼざろ"], brand: "ぼっち・ざ・ろっく" },
  { keywords: ["名探偵コナン", "コナン"], brand: "名探偵コナン" },
  { keywords: ["ハイキュー"], brand: "ハイキュー" },
  { keywords: ["ダンダダン"], brand: "ダンダダン" },
  { keywords: ["モブサイコ"], brand: "モブサイコ100" },
  { keywords: ["るろうに剣心", "るろ剣"], brand: "るろうに剣心" },
  { keywords: ["DEATH NOTE", "デスノート"], brand: "DEATH NOTE" },
  { keywords: ["ぴちぴちピッチ"], brand: "ぴちぴちピッチ" },
  { keywords: ["ゾンビランドサガ"], brand: "ゾンビランドサガ" },
  { keywords: ["ウマ娘"], brand: "ウマ娘" },
  { keywords: ["PINGU", "ピングー"], brand: "ピングー" },
  { keywords: ["セサミストリート", "セサミ"], brand: "セサミストリート" },
  { keywords: ["ケアベア", "Care Bears"], brand: "ケアベア" },

  // ── 2026-07 追加分 ────────────────────────────────────────────
  // 「その他」に落ちて noindex されていた大型IPを救出する。
  { keywords: ["ジョジョ"], brand: "ジョジョの奇妙な冒険" },
  { keywords: ["カードキャプターさくら"], brand: "カードキャプターさくら" },
  { keywords: ["HUNTER×HUNTER", "ハンター×ハンター"], brand: "HUNTER×HUNTER" },
  { keywords: ["MINECRAFT", "Minecraft", "マインクラフト"], brand: "マインクラフト" },
  { keywords: ["ケロロ軍曹"], brand: "ケロロ軍曹" },
  { keywords: ["銀魂"], brand: "銀魂" },
  { keywords: ["にゃんこ大戦争"], brand: "にゃんこ大戦争" },
  { keywords: ["パワーパフ"], brand: "パワーパフガールズ" },
  { keywords: ["TOM and JERRY", "トムとジェリー"], brand: "トムとジェリー" },
  { keywords: ["夏目友人帳"], brand: "夏目友人帳" },
  { keywords: ["おジャ魔女どれみ"], brand: "おジャ魔女どれみ" },
  { keywords: ["刃牙"], brand: "刃牙" },
  { keywords: ["封神演義"], brand: "封神演義" },
  { keywords: ["BLEACH"], brand: "BLEACH" },
  { keywords: ["妖怪ウォッチ"], brand: "妖怪ウォッチ" },
  { keywords: ["東方Project"], brand: "東方Project" },
  { keywords: ["スーパーマリオ", "ヨッシー"], brand: "スーパーマリオ" },
  { keywords: ["モンスターハンター"], brand: "モンスターハンター" },
  { keywords: ["キン肉マン", "キンケシ"], brand: "キン肉マン" },
  { keywords: ["グレムリン"], brand: "グレムリン" },
  { keywords: ["STAR WARS", "スター・ウォーズ", "スターウォーズ"], brand: "スター・ウォーズ" },
  { keywords: ["ミニオンズ", "ミニオン"], brand: "ミニオンズ" },
  { keywords: ["ひつじのショーン"], brand: "ひつじのショーン" },
  { keywords: ["miffy", "ミッフィー"], brand: "ミッフィー" },
  { keywords: ["ノンタン"], brand: "ノンタン" },
  { keywords: ["お文具といっしょ"], brand: "お文具といっしょ" },
  { keywords: ["パペットスンスン"], brand: "パペットスンスン" },
  { keywords: ["ざわざわ森のがんこちゃん"], brand: "ざわざわ森のがんこちゃん" },
  { keywords: ["なめこ栽培キット"], brand: "なめこ栽培キット" },
  { keywords: ["都市伝説解体センター"], brand: "都市伝説解体センター" },
  { keywords: ["黄泉のツガイ"], brand: "黄泉のツガイ" },
  { keywords: ["ぷよぷよ"], brand: "ぷよぷよ" },
  { keywords: ["モンチッチ"], brand: "モンチッチ" },
  { keywords: ["パンどろぼう"], brand: "パンどろぼう" },
  { keywords: ["ブルーロック"], brand: "ブルーロック" },
  { keywords: ["黒子のバスケ"], brand: "黒子のバスケ" },
  { keywords: ["文豪ストレイドッグス"], brand: "文豪ストレイドッグス" },
  { keywords: ["刀剣乱舞"], brand: "刀剣乱舞" },
  { keywords: ["ホロライブ"], brand: "ホロライブ" },
  { keywords: ["アイドリッシュセブン"], brand: "アイドリッシュセブン" },
  { keywords: ["家庭教師ヒットマン"], brand: "家庭教師ヒットマンREBORN!" },
  { keywords: ["スパイダーマン", "マーベル", "MARVEL", "アベンジャーズ"], brand: "マーベル" },
  { keywords: ["トランスフォーマー"], brand: "トランスフォーマー" },
  { keywords: ["きかんしゃトーマス", "トップハム・ハット卿"], brand: "きかんしゃトーマス" },
  { keywords: ["ソウルイーター"], brand: "ソウルイーター" },
  { keywords: ["ウォレスとグルミット"], brand: "ウォレスとグルミット" },
  { keywords: ["LOONEY TUNES", "ルーニー・テューンズ"], brand: "ルーニー・テューンズ" },
  { keywords: ["手塚治虫"], brand: "手塚治虫" },
  { keywords: ["ワールドトリガー"], brand: "ワールドトリガー" },
  { keywords: ["うる星やつら"], brand: "うる星やつら" },
  { keywords: ["キングダム"], brand: "キングダム" },
  { keywords: ["戦国BASARA"], brand: "戦国BASARA" },
  { keywords: ["デュラララ"], brand: "デュラララ!!" },
  { keywords: ["桜蘭高校ホスト部"], brand: "桜蘭高校ホスト部" },
  { keywords: ["ぬ～べ～", "地獄先生"], brand: "地獄先生ぬ～べ～" },
  { keywords: ["サマーウォーズ"], brand: "サマーウォーズ" },
  { keywords: ["ドラゴンクエスト"], brand: "ドラゴンクエスト" },
  { keywords: ["学園アイドルマスター"], brand: "学園アイドルマスター" },
  { keywords: ["コジコジ"], brand: "コジコジ" },
  { keywords: ["はらぺこあおむし"], brand: "はらぺこあおむし" },
  { keywords: ["しまじろう"], brand: "しまじろう" },
  { keywords: ["リサとガスパール"], brand: "リサとガスパール" },
  { keywords: ["ほっぺちゃん"], brand: "ほっぺちゃん" },
  { keywords: ["ぷにるんず"], brand: "ぷにるんず" },
  { keywords: ["カラフルピーチ"], brand: "カラフルピーチ" },
  { keywords: ["UNDERTALE"], brand: "UNDERTALE" },
  { keywords: ["LITTLE NIGHTMARES"], brand: "LITTLE NIGHTMARES" },
  { keywords: ["デス・ストランディング"], brand: "デス・ストランディング" },
  { keywords: ["ワイルド・スピード"], brand: "ワイルド・スピード" },
  { keywords: ["矢沢あい"], brand: "矢沢あい" },
  { keywords: ["Esther Bunny", "エスターバニー"], brand: "エスターバニー" },
  { keywords: ["ZANMANG LOOPY"], brand: "ZANMANG LOOPY" },
  { keywords: ["SKZOO"], brand: "SKZOO" },
  { keywords: ["おねがいアイプリ"], brand: "アイプリ" },
  { keywords: ["Suzy’s Zoo", "Suzy's Zoo", "スージー・ズー"], brand: "スージー・ズー" },
  { keywords: ["ヒグチユウコ"], brand: "ヒグチユウコ" },
  { keywords: ["くまのがっこう"], brand: "くまのがっこう" },
  { keywords: ["宇宙刑事ギャバン"], brand: "宇宙刑事ギャバン" },
  { keywords: ["ラッキーマン"], brand: "とっても！ラッキーマン" },

  // ── ブシロードクリエイティブ収集開始にあわせて追加 ──────────────
  { keywords: ["ワンパンマン"], brand: "ワンパンマン" },
  { keywords: ["ペルソナ"], brand: "ペルソナ" },
  { keywords: ["SAKAMOTO DAYS", "サカモトデイズ"], brand: "SAKAMOTO DAYS" },
  { keywords: ["俺だけレベルアップな件"], brand: "俺だけレベルアップな件" },
  { keywords: ["その着せ替え人形は恋をする", "着せ恋"], brand: "その着せ替え人形は恋をする" },
  { keywords: ["Fate"], brand: "Fate" },
  { keywords: ["リリカルなのは"], brand: "魔法少女リリカルなのは" },
  { keywords: ["がんばれゴエモン"], brand: "がんばれゴエモン" },
  { keywords: ["SILENT HILL", "サイレントヒル"], brand: "SILENT HILL" },
  { keywords: ["NEEDY GIRL OVERDOSE"], brand: "NEEDY GIRL OVERDOSE" },
  { keywords: ["テレタビーズ"], brand: "テレタビーズ" },
  { keywords: ["正反対な君と僕"], brand: "正反対な君と僕" },
  { keywords: ["スノウボールアース"], brand: "スノウボールアース" },
  { keywords: ["春夏秋冬代行者"], brand: "春夏秋冬代行者" },

  // ── 2026-08 追加分 ────────────────────────────────────────────
  // 「その他」213件（全体の27%）の棚卸しで、検索需要のあるIP・ブランドを救出する。
  //
  // 【なぜ末尾に置くか】
  // BRAND_MAP は上から順に評価され最初の一致が勝つ。ここに並ぶキーワードの一部は
  // 既存ブランドの商品名にも含まれており、上に置くと既存の判定を奪ってしまう:
  //   「とっとこハム太郎 まちぼうけ」   → まちぼうけ のまま残したい
  //   「みいつけた！ まちぼうけ」       → 同上
  //   「まちぼうけ スーパー戦隊のおともだち」→ 同上
  //   「富士ホーロー MOOMIN ミニコレクション2」→ ムーミン のまま残したい
  // 末尾に置くことで既存ブランドが優先され、これらは一切変化しない。
  // 新規追加時は原則このブロックの末尾に足すこと。
  { keywords: ["どうぶつの森"], brand: "どうぶつの森" },
  { keywords: ["とっとこハム太郎"], brand: "とっとこハム太郎" },
  { keywords: ["ブルーイ"], brand: "ブルーイ" },
  { keywords: ["パックマン"], brand: "パックマン" },
  { keywords: ["MOTHER2"], brand: "MOTHER2" },
  { keywords: ["スーパーマン"], brand: "スーパーマン" },
  { keywords: ["BT21"], brand: "BT21" },
  { keywords: ["宇宙兄弟"], brand: "宇宙兄弟" },
  { keywords: ["氷の城壁"], brand: "氷の城壁" },
  { keywords: ["スーパーの裏でヤニ吸うふたり"], brand: "スーパーの裏でヤニ吸うふたり" },
  { keywords: ["アシベ"], brand: "少年アシベ" },
  { keywords: ["花ざかりの君たちへ"], brand: "花ざかりの君たちへ" },
  { keywords: ["うちの3姉妹"], brand: "うちの3姉妹" },
  { keywords: ["マリッジトキシン"], brand: "マリッジトキシン" },
  { keywords: ["Sky星を紡ぐ"], brand: "Sky 星を紡ぐ子どもたち" },
  { keywords: ["PICO PARK"], brand: "PICO PARK" },
  { keywords: ["duolingo"], brand: "Duolingo" },
  { keywords: ["LOVOT"], brand: "LOVOT" },
  { keywords: ["Polly Pocket"], brand: "Polly Pocket" },
  { keywords: ["BE@RBRICK"], brand: "BE@RBRICK" },
  { keywords: ["PEZ"], brand: "PEZ" },
  { keywords: ["UNO"], brand: "UNO" },
  { keywords: ["パワプロ"], brand: "パワプロ" },
  { keywords: ["ハイパーヨーヨー"], brand: "ハイパーヨーヨー" },
  { keywords: ["どこでもいっしょ"], brand: "どこでもいっしょ" },
  { keywords: ["チャギントン"], brand: "チャギントン" },
  { keywords: ["ニャンちゅう"], brand: "ニャンちゅう" },
  { keywords: ["ニャッキ"], brand: "ニャッキ！" },
  { keywords: ["おじゃる丸"], brand: "おじゃる丸" },
  { keywords: ["ぜんまいざむらい"], brand: "ぜんまいざむらい" },
  { keywords: ["はなかっぱ"], brand: "はなかっぱ" },
  { keywords: ["みいつけた"], brand: "みいつけた！" },
  { keywords: ["ぐ〜チョコランタン"], brand: "ぐ〜チョコランタン" },
  { keywords: ["モリゾーとキッコロ"], brand: "モリゾーとキッコロ" },
  { keywords: ["こんなこいるかな"], brand: "こんなこいるかな" },
  { keywords: ["コロコロコミック"], brand: "コロコロコミック" },
  { keywords: ["週刊少年ジャンプ"], brand: "週刊少年ジャンプ" },
  { keywords: ["おしゅしだよ"], brand: "おしゅしだよ" },
  { keywords: ["にしむらゆうじ"], brand: "にしむらゆうじ" },
  { keywords: ["パンクドランカーズ"], brand: "パンクドランカーズ" },
  { keywords: ["水森亜土"], brand: "水森亜土" },
  { keywords: ["お茶犬"], brand: "お茶犬" },
  { keywords: ["平成ファンシー"], brand: "平成ファンシー" },
  { keywords: ["ナルミヤ"], brand: "ナルミヤ" },
  { keywords: ["夢限大みゅーたいぷ"], brand: "夢限大みゅーたいぷ" },
  { keywords: ["スーパー戦隊"], brand: "スーパー戦隊" },
  { keywords: ["不思議の国のアリス"], brand: "不思議の国のアリス" },
  // 音楽・アーティスト
  { keywords: ["米津玄師"], brand: "米津玄師" },
  { keywords: ["GLAY"], brand: "GLAY" },
  { keywords: ["aespa"], brand: "aespa" },
  { keywords: ["Kep1er"], brand: "Kep1er" },
  { keywords: ["NCT WISH"], brand: "NCT WISH" },
  { keywords: ["2PM"], brand: "2PM" },
  // スポーツ
  { keywords: ["MLB"], brand: "MLB" },
  { keywords: ["NPB"], brand: "NPB" },
  { keywords: ["B.LEAGUE"], brand: "B.LEAGUE" },
  { keywords: ["RIZIN"], brand: "RIZIN" },
  { keywords: ["サッカー日本代表"], brand: "サッカー日本代表" },
  { keywords: ["日本ハムファイターズ"], brand: "北海道日本ハムファイターズ" },
  { keywords: ["甲子園"], brand: "阪神甲子園球場" },
  // 企業・食品ミニチュア（パッケージ系は元ブランド名で検索される）
  { keywords: ["ペコちゃん"], brand: "不二家" },
  { keywords: ["カップヌードル"], brand: "カップヌードル" },
  { keywords: ["チロルチョコ"], brand: "チロルチョコ" },
  { keywords: ["ミンティア"], brand: "ミンティア" },
  { keywords: ["meiji"], brand: "明治" },
  { keywords: ["ニチレイ"], brand: "ニチレイ" },
  { keywords: ["ヤシノミ洗剤"], brand: "ヤシノミ洗剤" },
  { keywords: ["シュガーバターサンドの木"], brand: "シュガーバターサンドの木" },
  { keywords: ["富士ホーロー"], brand: "富士ホーロー" },
  { keywords: ["Pigeon"], brand: "ピジョン" },
  // ストリーマー・eスポーツ
  { keywords: ["ドズル社"], brand: "ドズル社" },
  { keywords: ["CRAZY RACCOON"], brand: "CRAZY RACCOON" },
  { keywords: ["赤見かるび"], brand: "赤見かるび" },

  // ── 2026-08-06 追加分（第2次棚卸し）─────────────────────────
  // 残り135件の「その他」を再棚卸しした結果。前ブロックと同じ理由で末尾に置く。

  // 【表記ゆれによる取りこぼしの修正】
  // 既にBRAND_MAPに存在するブランドなのに、商品名の表記が違うため
  // その他に落ちて noindex されていたもの。
  // "Esther Bunny"（空白あり）しか登録がなく "EstherBunny" が漏れていた
  { keywords: ["EstherBunny"], brand: "エスターバニー" },
  // ナルミヤ傘下のレーベル名で出品されるため、ブランド名では拾えない
  { keywords: ["メゾピアノ", "ポンポネット"], brand: "ナルミヤ" },
  // "NANA" 単体は BANANA FISH に誤爆するため、商品名側で限定する
  { keywords: ["NANA CD"], brand: "矢沢あい" },

  // 実写・映像IP
  { keywords: ["踊る大捜査線"], brand: "踊る大捜査線" },
  { keywords: ["映画泥棒"], brand: "NO MORE映画泥棒" },
  { keywords: ["What’s Michael", "What's Michael"], brand: "What's Michael?" },
  { keywords: ["ゴジにゃ"], brand: "ゴジにゃ。" },
  { keywords: ["仮面にゃいだー"], brand: "仮面にゃいだー" },

  // 音楽・アーティスト
  { keywords: ["IVE FROM"], brand: "IVE" },
  { keywords: ["kikuo"], brand: "きくお" },

  // 企業・自動車ブランド（パッケージ／ミニチュア系は元ブランド名で検索される）
  { keywords: ["NISSAN", "GT-R"], brand: "日産" },
  { keywords: ["MAZDA", "RX-7"], brand: "マツダ" },
  { keywords: ["ミズノ"], brand: "ミズノ" },
  { keywords: ["CHUMS"], brand: "CHUMS" },
  { keywords: ["コラショ"], brand: "コラショ" },
  { keywords: ["wiggle wiggle"], brand: "wiggle wiggle" },
  { keywords: ["JOGUMAN"], brand: "JOGUMAN" },
  { keywords: ["ファグラー"], brand: "ファグラー" },
  { keywords: ["onちゃん"], brand: "onちゃん" },
  { keywords: ["東京ラーメンストリート"], brand: "東京ラーメンストリート" },

  // 作家・イラストレーター（作家名で指名検索される）
  { keywords: ["はしもとみお"], brand: "はしもとみお" },
  { keywords: ["てらおかなつみ"], brand: "てらおかなつみ" },
  { keywords: ["よこみぞゆり"], brand: "よこみぞゆり" },
  { keywords: ["森口修"], brand: "森口修" },
  { keywords: ["タカハシカオリ"], brand: "タカハシカオリ" },
  { keywords: ["KIYATA"], brand: "KIYATA" },

  // メーカー人気シリーズ（IPではないがシリーズ名単独で検索される）
  { keywords: ["Lil ala mode"], brand: "Lil ala mode" },
  { keywords: ["紙袋に入った猫"], brand: "紙袋に入った猫" },
  { keywords: ["あそべる生物フィギュア"], brand: "あそべる生物フィギュアシリーズ" },
  { keywords: ["わんちゃあぁぁん"], brand: "わんちゃあぁぁん" },
  { keywords: ["猫ちゃあぁぁん"], brand: "猫ちゃあぁぁん" },
  { keywords: ["VIRUSWEETS"], brand: "VIRUSWEETS" },
  { keywords: ["MINITEEN"], brand: "MINITEEN" },
  { keywords: ["角醒ハンター", "オメガホーン"], brand: "角醒ハンター オメガホーン" },
  { keywords: ["まてぼうけ"], brand: "まてぼうけ" },
  { keywords: ["こぼすシリーズ"], brand: "こぼすシリーズ" },
  { keywords: ["ムキムキのハムちゃん"], brand: "ムキムキのハムちゃん" },
  { keywords: ["ひま太郎"], brand: "ひまのかたまり ひま太郎" },
  { keywords: ["芝犬ヶ丘"], brand: "芝犬ヶ丘" },
  { keywords: ["ニャニィニュニェニョン"], brand: "ニャニィニュニェニョン" },
  { keywords: ["タイニーチャム"], brand: "タイニーチャム" },
  { keywords: ["デュラハンボーイ"], brand: "デュラハンボーイ" },
  { keywords: ["こむしちゃん"], brand: "こむしちゃんのかんづめ!" },
  { keywords: ["フレブルフレンズ"], brand: "フレブルフレンズ" },
  { keywords: ["おしりを見せてくれる犬"], brand: "おしりを見せてくれる犬" },
  { keywords: ["やさいのようせい"], brand: "やさいのようせい" },
  { keywords: ["うんたねこ"], brand: "うんたねこ" },
  { keywords: ["パーフェクトピギー"], brand: "パーフェクトピギー" },
  { keywords: ["蕾狐", "つぼみっこ"], brand: "蕾狐 -つぼみっこ-" },
  { keywords: ["ばあちゃんちの昭和レトロライト"], brand: "昭和レトロライト" },
  { keywords: ["えんぴつけずり森の家"], brand: "えんぴつけずり森の家" },
  { keywords: ["コスチュームエイリアン"], brand: "コスチュームエイリアン" },
  { keywords: ["伝説の御神輿"], brand: "伝説の御神輿" },
  { keywords: ["ふっくら福福すずめ"], brand: "ふっくら福福すずめ" },
];

// カテゴリタグ除外リスト（ブランドではないタグ）
export const CATEGORY_IGNORE = new Set([
  "新商品", "オリジナル", "企業コラボ", "キタンクラブオリジナル",
  "カプセルトイ", "ねこのかぶりもの", "座るシリーズ", "シリーズ生きる",
  "コップのフチ子シリーズ", "PUTITTOシリーズ", "フィギュア", "アーティスト",
  "wovn-translate-widget[wovn]", // WOVNウィジェットの注入テキストを除外
]);

/**
 * ブランド判定（3段階フォールバック）
 * 1. BRAND_MAP キーワードマッチ
 * 2. サイトのカテゴリタグ（キタンクラブ等）
 * 3. 「その他」
 */
export function detectBrand(name, categoryTags = []) {
  // 1. BRAND_MAP キーワードマッチ
  for (const entry of BRAND_MAP) {
    for (const kw of entry.keywords) {
      if (name.includes(kw)) return entry.brand;
    }
  }

  // 2. サイトのカテゴリタグから判定
  for (const tag of categoryTags) {
    const cleaned = tag.replace(/^#/, "").trim();
    if (cleaned && !CATEGORY_IGNORE.has(cleaned) && cleaned.length >= 2) {
      // タグがBRAND_MAPのブランド名に一致するか確認
      for (const entry of BRAND_MAP) {
        if (entry.brand === cleaned) return entry.brand;
        for (const kw of entry.keywords) {
          if (cleaned.includes(kw)) return entry.brand;
        }
      }
      // 一致しなければタグ名をそのまま新ブランドとして採用
      return cleaned;
    }
  }

  // 3. フォールバック
  return "その他";
}

// ブランド名 → URLスラッグ。/brand/[slug] のURLになるため、
// 未登録のままだと brand-1a2b3c のようなハッシュになり検索的にも読みにくい。
const SLUG_MAP = {
  "ポケモン": "pokemon", "サンリオ": "sanrio", "ちいかわ": "chiikawa",
  "カービィ": "kirby", "ディズニー": "disney", "ワンピース": "onepiece",
  "ドラゴンボール": "dragonball", "鬼滅の刃": "kimetsu", "呪術廻戦": "jujutsu",
  "仮面ライダー": "kamenrider", "ガンダム": "gundam", "プリキュア": "precure",
  "SPY×FAMILY": "spyfamily", "転スラ": "tensura", "クレヨンしんちゃん": "shinchan",
  "mofusand": "mofusand", "すみっコぐらし": "sumikko", "スヌーピー": "snoopy",
  "たまごっち": "tamagotchi", "初音ミク": "miku", "トミカ": "tomica",
  "ゴジラ": "godzilla", "ウルトラマン": "ultraman", "NARUTO": "naruto",
  "ハリー・ポッター": "harrypotter", "アンパンマン": "anpanman",
  "ドラえもん": "doraemon", "犬夜叉": "inuyasha", "ムーミン": "moomin",
  "スポンジ・ボブ": "spongebob", "いきもの大図鑑": "ikimono",
  "まちぼうけ": "machiboke", "パンダの穴": "pandanoana",
  "おさるのジョージ": "george", "フリーレン": "frieren",
  "まどか☆マギカ": "madoka", "アイカツ": "aikatsu",
  "藤子不二雄": "fujiko", "その他": "other",
  // キタンクラブ固有
  "コップのフチ子": "fuchiko", "PUTITTO": "putitto",
  "コウペンちゃん": "koupen", "タローマン": "taroman",
  "可愛い嘘のカワウソ": "kawauso", "おぱんちゅうさぎ": "opanchu",
  "チェンソーマン": "chainsawman", "ヒロアカ": "heroaca",
  // ブシロードクリエイティブ関連
  "バンドリ": "bandori", "ラブライブ": "lovelive", "D4DJ": "d4dj",
  "ぼっち・ざ・ろっく": "bocchi", "名探偵コナン": "conan",
  "ハイキュー": "haikyu", "ダンダダン": "dandadan",
  "モブサイコ100": "mobpsycho", "るろうに剣心": "rurouni",
  "DEATH NOTE": "deathnote", "ぴちぴちピッチ": "pitchipitch",
  "ゾンビランドサガ": "zombieland", "ウマ娘": "umamusume",
  // Qualia・ケンエレファント関連
  "ピングー": "pingu", "セサミストリート": "sesame",
  "ケアベア": "carebears",
  // 2026-07 追加分
  "リラックマ": "rilakkuma", "San-X": "sanx",
  "ジョジョの奇妙な冒険": "jojo", "カードキャプターさくら": "ccsakura",
  "HUNTER×HUNTER": "hunterhunter", "マインクラフト": "minecraft",
  "ケロロ軍曹": "keroro", "銀魂": "gintama", "にゃんこ大戦争": "nyanko",
  "パワーパフガールズ": "powerpuff", "トムとジェリー": "tomjerry",
  "夏目友人帳": "natsume", "おジャ魔女どれみ": "doremi", "刃牙": "baki",
  "封神演義": "hoshin", "BLEACH": "bleach", "妖怪ウォッチ": "yokaiwatch",
  "東方Project": "touhou", "スーパーマリオ": "mario",
  "モンスターハンター": "monhun", "キン肉マン": "kinnikuman",
  "グレムリン": "gremlins", "スター・ウォーズ": "starwars",
  "ミニオンズ": "minions", "ひつじのショーン": "shaun", "ミッフィー": "miffy",
  "ノンタン": "nontan", "お文具といっしょ": "obungu",
  "パペットスンスン": "sunsun", "ざわざわ森のがんこちゃん": "gankochan",
  "なめこ栽培キット": "nameko", "都市伝説解体センター": "toshidensetsu",
  "黄泉のツガイ": "yomitsugai", "ぷよぷよ": "puyopuyo",
  "モンチッチ": "monchhichi", "パンどろぼう": "pandorobo",
  "ブルーロック": "bluelock", "黒子のバスケ": "kuroko",
  "文豪ストレイドッグス": "bungosd", "刀剣乱舞": "touken",
  "ホロライブ": "hololive", "アイドリッシュセブン": "idolish7",
  "家庭教師ヒットマンREBORN!": "reborn", "マーベル": "marvel",
  "トランスフォーマー": "transformers", "きかんしゃトーマス": "thomas",
  "ソウルイーター": "souleater", "ウォレスとグルミット": "wallace",
  "ルーニー・テューンズ": "looneytunes", "手塚治虫": "tezuka",
  "ワールドトリガー": "worldtrigger", "うる星やつら": "urusei",
  "キングダム": "kingdom", "戦国BASARA": "basara", "デュラララ!!": "durarara",
  "桜蘭高校ホスト部": "ouran", "地獄先生ぬ～べ～": "nube",
  "サマーウォーズ": "summerwars", "ドラゴンクエスト": "dragonquest",
  "学園アイドルマスター": "gakumas", "コジコジ": "kojikoji",
  "はらぺこあおむし": "aomushi", "しまじろう": "shimajiro",
  "リサとガスパール": "gaspard", "ほっぺちゃん": "hoppechan",
  "ぷにるんず": "punirunes", "カラフルピーチ": "colorfulpeach",
  "UNDERTALE": "undertale", "LITTLE NIGHTMARES": "littlenightmares",
  "デス・ストランディング": "deathstranding", "ワイルド・スピード": "wildspeed",
  "矢沢あい": "yazawaai", "エスターバニー": "estherbunny",
  "ZANMANG LOOPY": "loopy", "SKZOO": "skzoo", "アイプリ": "aipri",
  "スージー・ズー": "suzyszoo", "ヒグチユウコ": "higuchiyuko",
  "くまのがっこう": "kumanogakko", "宇宙刑事ギャバン": "gavan",
  "とっても！ラッキーマン": "luckyman",
  // ブシロードクリエイティブ収集開始にあわせて追加
  "ワンパンマン": "onepunchman", "ペルソナ": "persona",
  "SAKAMOTO DAYS": "sakamotodays", "俺だけレベルアップな件": "orelevel",
  "その着せ替え人形は恋をする": "kisekoi", "Fate": "fate",
  "魔法少女リリカルなのは": "nanoha", "がんばれゴエモン": "goemon",
  "SILENT HILL": "silenthill", "NEEDY GIRL OVERDOSE": "needygirl",
  "テレタビーズ": "teletubbies", "正反対な君と僕": "seihantai",
  "スノウボールアース": "snowballearth", "春夏秋冬代行者": "daikousha",
  // 2026-08 追加分
  "どうぶつの森": "animalcrossing", "とっとこハム太郎": "hamtaro",
  "ブルーイ": "bluey", "パックマン": "pacman", "MOTHER2": "mother2",
  "スーパーマン": "superman", "BT21": "bt21", "宇宙兄弟": "uchukyodai",
  "氷の城壁": "koorinojouheki",
  "スーパーの裏でヤニ吸うふたり": "yanifutari",
  "少年アシベ": "ashibe", "花ざかりの君たちへ": "hanakimi",
  "うちの3姉妹": "uchino3shimai", "マリッジトキシン": "marriagetoxin",
  "Sky 星を紡ぐ子どもたち": "skychildren", "PICO PARK": "picopark",
  "Duolingo": "duolingo", "LOVOT": "lovot", "Polly Pocket": "pollypocket",
  // BE@RBRICK は自動生成だと "@" が落ちて berbrick になるため明示する
  "BE@RBRICK": "bearbrick",
  "PEZ": "pez", "UNO": "uno", "パワプロ": "powerpro",
  "ハイパーヨーヨー": "hyperyoyo", "どこでもいっしょ": "dokodemoissho",
  "チャギントン": "chuggington", "ニャンちゅう": "nyanchu",
  "ニャッキ！": "nyakki", "おじゃる丸": "ojarumaru",
  "ぜんまいざむらい": "zenmaizamurai", "はなかっぱ": "hanakappa",
  "みいつけた！": "miitsuketa", "ぐ〜チョコランタン": "guchocolantan",
  "モリゾーとキッコロ": "morizokkoro", "こんなこいるかな": "konnakoirukana",
  "コロコロコミック": "corocoro", "週刊少年ジャンプ": "shonenjump",
  "おしゅしだよ": "oshushidayo", "にしむらゆうじ": "nishimurayuji",
  "パンクドランカーズ": "punkdrunkers", "水森亜土": "mizumoriado",
  "お茶犬": "ochaken", "平成ファンシー": "heiseifancy", "ナルミヤ": "narumiya",
  "夢限大みゅーたいぷ": "mugendaimutype", "スーパー戦隊": "supersentai",
  "不思議の国のアリス": "alice",
  // 音楽・アーティスト
  "米津玄師": "yonezukenshi", "GLAY": "glay", "aespa": "aespa",
  "Kep1er": "kep1er", "NCT WISH": "nctwish", "2PM": "2pm",
  // スポーツ
  "MLB": "mlb", "NPB": "npb", "B.LEAGUE": "bleague", "RIZIN": "rizin",
  "サッカー日本代表": "soccerjapan",
  "北海道日本ハムファイターズ": "fighters", "阪神甲子園球場": "koshien",
  // 企業・食品ミニチュア
  "不二家": "fujiya", "カップヌードル": "cupnoodle", "チロルチョコ": "tirol",
  "ミンティア": "mintia", "明治": "meiji", "ニチレイ": "nichirei",
  "ヤシノミ洗剤": "yashinomi", "シュガーバターサンドの木": "sugarbutter",
  "富士ホーロー": "fujihoro", "ピジョン": "pigeon",
  // ストリーマー・eスポーツ
  "ドズル社": "dozle", "CRAZY RACCOON": "crazyraccoon", "赤見かるび": "akamikarubi",
  // 2026-08-06 追加分（第2次棚卸し）
  // 日本語のみのブランド名は未登録だと brand-xxxx のハッシュslugになるため必ず書く
  "踊る大捜査線": "odoru", "NO MORE映画泥棒": "eigadorobo",
  "What's Michael?": "whatsmichael", "ゴジにゃ。": "gojinya",
  "仮面にゃいだー": "kamennyaider", "IVE": "ive", "きくお": "kikuo",
  "日産": "nissan", "マツダ": "mazda", "ミズノ": "mizuno",
  "CHUMS": "chums", "コラショ": "korasho", "wiggle wiggle": "wigglewiggle",
  "JOGUMAN": "joguman", "ファグラー": "fuggler", "onちゃん": "onchan",
  "東京ラーメンストリート": "tokyoramenstreet",
  "はしもとみお": "hashimotomio", "てらおかなつみ": "teraokanatsumi",
  "よこみぞゆり": "yokomizoyuri", "森口修": "moriguchiosamu",
  "タカハシカオリ": "takahashikaori", "KIYATA": "kiyata",
  "Lil ala mode": "lilalamode", "紙袋に入った猫": "kamibukuroneko",
  "あそべる生物フィギュアシリーズ": "asoberuseibutsu",
  "わんちゃあぁぁん": "wanchaan", "猫ちゃあぁぁん": "nekochaan",
  "VIRUSWEETS": "virusweets", "MINITEEN": "miniteen",
  "角醒ハンター オメガホーン": "omegahorn", "まてぼうけ": "mateboke",
  "こぼすシリーズ": "kobosu", "ムキムキのハムちゃん": "mukimukihamchan",
  "ひまのかたまり ひま太郎": "himataro", "芝犬ヶ丘": "shibainugaoka",
  "ニャニィニュニェニョン": "nyanyinyunyenyon", "タイニーチャム": "tinycham",
  "デュラハンボーイ": "dullahanboy", "こむしちゃんのかんづめ!": "komushichan",
  "フレブルフレンズ": "freblefriends", "おしりを見せてくれる犬": "oshiriinu",
  "やさいのようせい": "yasainoyousei", "うんたねこ": "untaneko",
  "パーフェクトピギー": "perfectpiggy", "蕾狐 -つぼみっこ-": "tsubomikko",
  "昭和レトロライト": "showaretrolight", "えんぴつけずり森の家": "enpitsukezuri",
  "コスチュームエイリアン": "costumealien", "伝説の御神輿": "densetsunomikoshi",
  "ふっくら福福すずめ": "fukufukusuzume",
};

export function toBrandSlug(brand) {
  if (SLUG_MAP[brand]) return SLUG_MAP[brand];
  // 未登録ブランド → 自動スラッグ生成
  // 英数字はそのまま、日本語はハッシュベースの短い文字列に変換
  const ascii = brand.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ascii.length >= 3) return ascii;
  // 日本語のみのブランド名 → ハッシュで一意なスラッグを生成
  let hash = 0;
  for (let i = 0; i < brand.length; i++) {
    hash = ((hash << 5) - hash + brand.charCodeAt(i)) | 0;
  }
  return "brand-" + Math.abs(hash).toString(36);
}

// ブランド別テーマカラー（未登録ブランドは自動生成）
export function getBrandColor(brand) {
  const colors = {
    "ポケモン": "#FFD54F", "サンリオ": "#F06292", "ちいかわ": "#4FC3F7",
    "カービィ": "#F48FB1", "ディズニー": "#CE93D8", "ワンピース": "#E57373",
    "ドラゴンボール": "#FFB74D", "鬼滅の刃": "#80CBC4", "呪術廻戦": "#7986CB",
    "仮面ライダー": "#4DB6AC", "ガンダム": "#78909C", "プリキュア": "#F48FB1",
    "転スラ": "#4FC3F7", "mofusand": "#FFCC80", "すみっコぐらし": "#A5D6A7",
    "たまごっち": "#81D4FA", "初音ミク": "#4DD0E1", "ゴジラ": "#A1887F",
    "ウルトラマン": "#E57373", "いきもの大図鑑": "#AED581",
    "まちぼうけ": "#FFB74D", "パンダの穴": "#90A4AE",
    // キタンクラブ固有
    "コップのフチ子": "#FF8A65", "PUTITTO": "#9575CD",
    "コウペンちゃん": "#FFF176", "タローマン": "#EF5350",
    "可愛い嘘のカワウソ": "#80DEEA", "おぱんちゅうさぎ": "#F8BBD0",
    "チェンソーマン": "#B71C1C", "ヒロアカ": "#43A047",
  };
  if (colors[brand]) return colors[brand];
  // 未登録ブランド → ハッシュからパステルカラーを自動生成
  let hash = 0;
  for (let i = 0; i < brand.length; i++) {
    hash = ((hash << 5) - hash + brand.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  // HSL → Hex（彩度60%、明度75%でパステル調に）
  const s = 0.6, l = 0.75;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if (hue < 60) { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// 注目度判定
export function isHot(name, brand) {
  const hotBrands = ["サンリオ", "たまごっち", "ちいかわ", "ポケモン"];
  return hotBrands.includes(brand);
}
