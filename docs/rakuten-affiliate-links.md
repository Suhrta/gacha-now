# 楽天アフィリエイト購入導線（コンプセット / 予約）

商品ページに「ダブりなく全種そろえるコンプセット」「発売前の予約」を楽天で探す導線を
自動生成で追加する仕組み。転換率(アフィリエイト購入)改善が目的。

## 構成

| ファイル | 役割 |
|---|---|
| `scripts/rakuten-api.js` | 楽天商品検索API(2026新仕様)の共有ヘルパー |
| `scripts/build-rakuten-links.js` | 各商品の検索クエリをAPI検証して `data/rakuten-links.json` を生成 |
| `data/rakuten-links.json` | 生成データ（コミット対象）。`{ [id]: { compset?, preorder? } }` |
| `components/RakutenLinks.jsx` | ボタンUI + GA4計測 + PR表記（クライアント） |
| `app/item/[id]/page.jsx` | 商品ページに `<RakutenLinks>` を描画（追加のみ） |
| `lib/affiliate.js` | アフィリエイトIDの一元付与（`rakutenSearchUrl`） |

## クエリ生成のしくみ（0件・無関係リンクを出さない）

意図別に候補クエリを「具体 → 広義」で作り、楽天APIで**実ヒット件数≥3**の最も具体的な
クエリだけを採用する。全滅した意図はボタンを出さない。

- **コンプセット**（`types≥2` の発売済み・発売前どちらも）:
  `{商品名コア} コンプ/セット` → `{IPシード} ガチャ コンプ/セット`
- **予約**（`!isReleased` の発売前のみ）:
  `{商品名コア} 予約` → `{IPシード} ガチャ 予約`

IPシード = シリーズ名(`data/series.js`) / キャラ名(`data/characters.js`) / 商品名の
CJK3文字以上トークン。英語partial・2文字汎用語・`映画`等の汎用語は除外（無関係ページ回避）。

### 調整パラメータ（`scripts/build-rakuten-links.js`）

- `MIN_HITS`（既定3）: 採用に必要な最低ヒット件数。上げると関連性↑・網羅率↓
- `MAX_AGE_DAYS`（既定14）: キャッシュ有効日数。過ぎた項目は再検証（在庫変動に追従）
- `GENERIC`: シードにしない汎用語の正規表現。無関係リンクが出たら語を追加

## 楽天API（2026年新仕様）の要点

2026/5/14に旧APIが停止。新仕様は**3点セット**が必須:

1. 新エンドポイント: `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601`
2. `applicationId` + **`accessKey`**（クエリパラメータ）
3. **`Origin` ヘッダー**が楽天アプリの「Allowed websites」と一致（当サイトは `gacha-now.vercel.app`）

> Node の `fetch` は `Origin`/`Referer` を禁止ヘッダーとして削除するため、`node:https` を使う。

認証情報は環境変数から読む: `RAKUTEN_APP_ID` / `RAKUTEN_ACCESS_KEY` / `RAKUTEN_ORIGIN`(任意)。
ローカルは `.env`（gitignore 済み）、CIは GitHub Secrets。

### 必要な GitHub Secrets

Settings → Secrets and variables → Actions に登録:

- `RAKUTEN_APP_ID` … `94f638b5-…`（Application ID）
- `RAKUTEN_ACCESS_KEY` … `pk_…`（Access Key。楽天Developers のアプリ一覧で👁表示）
- `RAKUTEN_ORIGIN` …（任意）未設定なら `gacha-now.vercel.app` を既定使用

## GA4 での効果検証

ボタンクリックで `affiliate_click` イベントを送信。パラメータ:
`affiliate`(=rakuten) / `link_intent`(compset|preorder) / `item_id` / `item_name` /
`item_brand` / `search_query` / `value`(=価格) / `currency`(=JPY)。

### 設定手順（GA4管理画面）

1. **カスタムディメンション登録**（管理 → カスタム定義 → カスタムディメンションを作成）
   - `link_intent`（イベント スコープ）… コンプ vs 予約の比較用
   - `item_brand`、`search_query` も必要に応じて登録
2. **キーイベント化**（管理 → イベント → `affiliate_click` を「キーイベントとしてマーク」）
   - コンバージョンとして計測・レポートできる
3. **探索レポート**（探索 → 自由形式）
   - ディメンション: `link_intent`、指標: イベント数 → コンプ/予約どちらが押されるか
   - 「item_name 別のクリック数」で売れ筋商品の把握

効果の見方: `affiliate_click` 数の推移 + 楽天アフィリエイト管理画面の成果（クリック→注文）を
突き合わせる。intent別に見ることで「コンプセット導線が効くか」を検証できる。

## 補足: fetch-images.js について

`scripts/fetch-images.js` も旧API依存で現在動作していない（画像取得が停止）。
`scripts/rakuten-api.js` の `searchItems()` を使えば同様に復活可能（商品画像 + 直リンク取得）。
本導線とは別タスクのため未対応。
