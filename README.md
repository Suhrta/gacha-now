# ガチャなう 🎪

カプセルトイ（ガチャガチャ）の新作情報をまとめた情報サイト。  
バンダイ・タカラトミーアーツ・キタンクラブの公式サイトから毎日自動でデータを収集・更新する

🔗 https://gacha-now.net

---

## 何ができるサイトか

- **新作・発売予定・発売中**のカプセルトイを一覧で確認できる
- ポケモン・サンリオ・ちいかわなど **40以上のブランド**でフィルタリング
- 商品名・ブランド名での**検索**
- 気に入った商品を**お気に入り登録**（ローカルストレージに保存）
- 各商品の公式サイトリンク・**店舗検索**リンク
- 毎日1商品をピックアップする**新着モーダル**

---

## 技術スタック

| カテゴリ | 使用技術 |
|----------|----------|
| フレームワーク | Next.js 14 (App Router) |
| UI | React 18 |
| スタイリング | Tailwind CSS 3 + カスタムCSSアニメーション |
| フォント | Google Fonts "Press Start 2P"（レトロピクセル） |
| デプロイ | Vercel |
| データ収集 | Puppeteer + Cheerio（Node.js スクリプト群） |
| AI説明文生成 | Anthropic Claude API |

---

## ディレクトリ構成

```
gacha-now/
├── app/                        # Next.js App Router ページ
│   ├── page.jsx               # トップページ（商品一覧・フィルター）
│   ├── layout.jsx             # ルートレイアウト（GA・AdSense設定含む）
│   ├── globals.css            # グローバルスタイル・アニメーション定義
│   ├── item/[id]/page.jsx     # 商品詳細ページ（SSG）
│   ├── brand/[slug]/page.jsx  # ブランド別一覧ページ
│   ├── about/page.jsx         # 使い方・サービス説明
│   ├── privacy/page.jsx       # プライバシーポリシー
│   └── sitemap.js             # 動的サイトマップ（SEO）
│
├── components/                 # 再利用可能なUIコンポーネント
│   ├── Header.jsx             # スティッキーヘッダー（マーキー + ブランドタブ）
│   ├── FilterTabs.jsx         # ブランドフィルターボタン群
│   ├── GachaMachine.jsx       # 商品カード（ガチャマシン風UI）
│   ├── ReceiptPaper.jsx       # 商品詳細モーダル（レシート風デザイン）
│   ├── NewArrivalModal.jsx    # 日替わり新着ポップアップ
│   └── Footer.jsx             # フッター
│
├── data/                       # 商品データ（自動更新）
│   ├── products.json          # メインDB（約330件、毎日自動更新）
│   ├── structured.json        # スクレイパー出力の正規化済みデータ
│   ├── collected.json         # スクレイパーの生データ
│   └── new-today.json         # 当日追加した商品名リスト
│
├── scripts/                    # データ更新パイプライン（Node.js）
│   └── README.md              # ← スクリプトの詳細はこちら
│
├── posts/                      # 自動生成された商品ブログ記事（HTML）
│   ├── index.html             # 記事一覧
│   └── post-2026-**.html      # 個別商品記事
│
├── public/                     # 静的アセット
│   └── og-image.png           # OGP画像
│
├── package.json
├── next.config.js              # Next.js設定（外部画像ドメイン許可など）
├── tailwind.config.js          # Tailwindカラーテーマ設定
└── jsconfig.json               # パスエイリアス（@/* → ./）
```

---

## ローカル開発のセットアップ

### 前提条件
- Node.js 18 以上
- npm

### 手順

```bash
# リポジトリをクローン
git clone https://github.com/Suhrta/gacha-now.git
cd gacha-now

# 依存関係をインストール
npm install

# 開発サーバー起動
npm run dev
```

http://localhost:3000 でアクセスできる。

> **注意**: `data/products.json` が商品データの本体。このファイルがないとトップページが空になる。  
> Git管理されているので、クローン後はそのまま使える。

### ビルド

```bash
npm run build   # 本番用ビルド
npm run start   # 本番サーバー起動
npm run lint    # ESLintチェック
```

---

## データ更新の仕組み

商品データは **scripts/ 以下のスクリプト群** によって自動収集・更新される。

```
公式サイト（バンダイ / タカラトミーアーツ / キタンクラブ）
    ↓ collect.js（Puppeteer + Cheerio でスクレイピング）
collected.json（生データ）
    ↓ structure.js（データ正規化・ブランドスラグ・カラー割り当て）
structured.json
    ↓ generate-descriptions.js（Claude API で日本語説明文を自動生成）
    ↓ update.js（既存データにマージ・3ヶ月以上前の商品を自動削除）
data/products.json ← Next.jsアプリが読み込む最終データ
    ↓
publish-instagram.js / publish-x.js（SNSに自動投稿）
generate-post.js（posts/ にブログ記事HTMLを生成）
```

詳細は [`scripts/README.md`](./scripts/README.md) を参照。

---

## デプロイ

**Vercel** を使用。`main` ブランチへのプッシュで自動デプロイされる。

```bash
# 手動デプロイ（Vercel CLI 使用時）
vercel --prod
```

### 環境変数（Vercel ダッシュボードで設定）

本番環境で必要な環境変数はデータ更新スクリプト側のみ。  
Next.jsアプリ本体は環境変数不要（`data/products.json` を直接読み込む）。

---

## 商品データの構造

`data/products.json` の各商品オブジェクトの主なフィールド：

```json
{
  "id": "gacha-5cc1dd76",
  "name": "でふぉラバ! 呪術廻戦",
  "brand": "呪術廻戦",
  "brandSlug": "jujutsu",
  "price": 300,
  "types": 6,
  "releaseWeek": "3月 16日週",
  "color": "#7986CB",
  "hot": false,
  "img": "https://...",
  "images": ["url1", "url2"],
  "affiliateUrl": "#",
  "sourceUrl": "https://...",
  "source": "タカラトミーアーツ公式",
  "collectedAt": "2026-03-06T...",
  "description": "AIが生成した紹介文"
}
```

---

## お問い合わせ

info@gacha-now.com
