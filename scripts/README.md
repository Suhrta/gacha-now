# データ更新パイプライン

`scripts/` 以下は、ガチャなうの商品データを自動収集・更新するためのNode.jsスクリプト群。  
Next.jsアプリとは独立した別パッケージ（`scripts/package.json`）として管理されている。

---

## 全体フロー

```
公式サイト（バンダイ / タカラトミーアーツ / キタンクラブ）
    │
    ▼
 collect.js          ← Puppeteer + Cheerio でスクレイピング
    │
    ▼ data/collected.json（生データ）
    │
 structure.js        ← データ正規化・ブランド分類・色/スラグ自動付与
    │
    ▼ data/structured.json
    │
 generate-descriptions.js  ← Claude API で未記入商品の説明文を自動生成
    │
 update.js           ← 既存 products.json にマージ・3ヶ月超の商品を削除
    │
    ▼ data/products.json（Next.jsアプリが読み込む最終データ）
       data/new-today.json（当日追加分の商品名リスト）
    │
    ├── publish-instagram.js  ← Instagram に画像+キャプションを自動投稿
    ├── publish-x.js          ← X (Twitter) に自動投稿
    └── generate-post.js      ← posts/ に商品ブログ記事HTMLを生成
```

---

## セットアップ

### 依存関係のインストール

```bash
cd scripts
npm install
```

### 必要な環境変数

`.env` ファイルを `scripts/` フォルダに作成するか、CI/CD環境で設定する。

| 環境変数 | 用途 | 必須 |
|----------|------|------|
| `ANTHROPIC_API_KEY` | Claude API（説明文生成） | generate-descriptions.js 実行時のみ |
| `X_API_KEY` | X (Twitter) Consumer API Key | publish-x.js 実行時のみ |
| `X_API_SECRET` | X Consumer API Key Secret | publish-x.js 実行時のみ |
| `X_ACCESS_TOKEN` | X Access Token | publish-x.js 実行時のみ |
| `X_ACCESS_TOKEN_SECRET` | X Access Token Secret | publish-x.js 実行時のみ |
| `IG_USER_ID` | Instagram ビジネスアカウントID | publish-instagram.js 実行時のみ |
| `IG_ACCESS_TOKEN` | Instagram システムユーザーのアクセストークン | publish-instagram.js 実行時のみ |
| `PRODUCTS_PATH` | products.jsonのパス（省略時はデフォルト） | 任意 |

---

## 各スクリプトの説明

### `collect.js` — スクレイピング

3つの公式サイトから最新商品情報を収集し、`data/collected.json` に保存する。

- **バンダイ（ガシャポン公式）**: スケジュールページから商品URLを取得 → 詳細ページをパース
- **タカラトミーアーツ**: カレンダーページ + 商品詳細ページをパース
- **キタンクラブ**: Puppeteerで新商品ページを操作 → Cheerioで詳細をパース

ブランド判定は3段階フォールバック:
1. `BRAND_MAP`（キーワードマッチング）
2. サイトのカテゴリタグ
3. 商品名から推定

```bash
node collect.js
```

---

### `structure.js` — データ正規化

`data/collected.json` を読み込み、`data/structured.json` に変換する。

主な処理:
- ブランドごとにカラーコード（`color`）を割り当て
- URL安全なブランドスラグ（`brandSlug`）を生成
- 商品IDの採番（`gacha-XXXXXXXX`）
- 価格・バリエーション数の数値化

```bash
node structure.js
```

---

### `generate-descriptions.js` — AI説明文生成

`data/products.json` を読み込み、`description` が未設定の商品に対してClaude API（claude-sonnet）で40〜80文字の紹介文を自動生成する。

- 既存の `description` はスキップ（APIコスト節約）
- 結果は `data/products.json` に直接上書き保存

```bash
# ANTHROPIC_API_KEY が必要
node generate-descriptions.js
```

---

### `update.js` — データマージ

`data/structured.json` の新商品を `data/products.json` に統合する。

主な処理:
1. 既存の `products.json` を読み込む
2. `structured.json` の商品のうち、まだ登録されていないものだけを追加
3. **収集日から3ヶ月以上経過した商品を自動削除**（データ肥大化防止）
4. 当日追加した商品名を `data/new-today.json` に保存

```bash
node update.js
```

---

### `fix-kitan-brands.js` — キタンクラブ ブランド修正

キタンクラブ商品のブランド分類を手動で修正するためのユーティリティスクリプト。  
スクレイピング後にブランドが正しく取れていない場合に使用する。

```bash
node fix-kitan-brands.js
```

---

### `fetch-images.js` — 画像ダウンロード

商品画像をローカルまたはCDNにダウンロードする。  
画像URLが壊れている場合の再取得にも使用。

```bash
node fetch-images.js
```

---

### `patch-images.js` — 画像URL修正

Cheerio を使って `products.json` 内の壊れた画像URLを修正するユーティリティ。

```bash
node patch-images.js
```

---

### `generate-post.js` — ブログ記事生成

`data/products.json` をもとに、`posts/` フォルダに商品ごとのHTMLブログ記事を生成する。  
ファイル名は `post-YYYY-MM-DD-N.html` 形式。

```bash
node generate-post.js
```

---

### `publish-instagram.js` — Instagram 自動投稿

Instagram Graph API を使って、当日生成した商品記事の画像をInstagramに投稿する。  
`posts/post-YYYY-MM-DD-*.png` ファイルを順番に投稿。投稿ファイルが0件の場合はスキップ。

```bash
# IG_USER_ID, IG_ACCESS_TOKEN が必要
node publish-instagram.js
```

---

### `publish-x.js` — X (Twitter) 自動投稿

X (Twitter) API v2 を使って、当日生成した商品記事の画像をXに投稿する。  
Instagramと同じ画像・キャプションを使用。

```bash
# X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET が必要
node publish-x.js
```

---

## 実行順序（まとめて実行する場合）

```bash
cd scripts

# 1. スクレイピング
node collect.js

# 2. データ正規化
node structure.js

# 3. AIで説明文生成（省略可）
node generate-descriptions.js

# 4. products.jsonに反映
node update.js

# 5. SNS投稿・記事生成（省略可）
node generate-post.js
node publish-instagram.js
node publish-x.js
```

---

## 注意事項

- `collect.js` は Puppeteer（ヘッドレスChrome）を使うため、初回実行時はブラウザのダウンロードが入る
- スクレイピング対象の公式サイトのHTML構造が変わった場合はパーサーの修正が必要
- Claude API は `ANTHROPIC_API_KEY` を環境変数として自動検出する（明示的な指定不要）
- Instagram のアクセストークンは60日で期限切れになるため定期更新が必要
