/**
 * publish-instagram.js
 * Instagram Graph APIを使って自動投稿する
 *
 * 必要な環境変数:
 *   IG_USER_ID       - InstagramビジネスアカウントID
 *   IG_ACCESS_TOKEN   - システムユーザーのアクセストークン
 *
 * 使い方: node scripts/publish-instagram.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, "..", "posts");

// Vercelの公開URL
const SITE_URL = "https://gacha-now.vercel.app";

// 環境変数
const IG_USER_ID = process.env.IG_USER_ID;
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const GRAPH_API = "https://graph.facebook.com/v25.0";

/**
 * ステップ1: メディアコンテナを作成
 * 画像URLとキャプションをInstagramに送信し、コンテナIDを取得
 */
async function createMediaContainer(imageUrl, caption) {
  const url = `${GRAPH_API}/${IG_USER_ID}/media`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption: caption,
      access_token: IG_ACCESS_TOKEN,
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`メディアコンテナ作成失敗: ${data.error.message}`);
  }
  return data.id; // creation_id
}

/**
 * ステップ2: コンテナのステータスを確認
 * アップロード処理が完了するまで待つ
 */
async function waitForContainer(containerId, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    const url = `${GRAPH_API}/${containerId}?fields=status_code&access_token=${IG_ACCESS_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status_code === "FINISHED") {
      return true;
    }
    if (data.status_code === "ERROR") {
      throw new Error(`コンテナ処理エラー: ${JSON.stringify(data)}`);
    }

    console.log(`  ⏳ 処理中... (${i + 1}/${maxRetries})`);
    await new Promise((r) => setTimeout(r, 5000)); // 5秒待つ
  }
  throw new Error("コンテナ処理がタイムアウトしました");
}

/**
 * ステップ3: メディアを公開
 */
async function publishMedia(containerId) {
  const url = `${GRAPH_API}/${IG_USER_ID}/media_publish`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: IG_ACCESS_TOKEN,
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`公開失敗: ${data.error.message}`);
  }
  return data.id; // media_id
}

/**
 * メイン処理
 */
async function main() {
  console.log("📷 Instagram自動投稿を開始...");

  // 環境変数チェック
  if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
    console.error("❌ IG_USER_ID または IG_ACCESS_TOKEN が未設定です");
    process.exit(1);
  }

  // 今日の投稿ファイルを探す
  const today = new Date().toISOString().split("T")[0];
  const pngFile = path.join(POSTS_DIR, `post-${today}.png`);
  const txtFile = path.join(POSTS_DIR, `post-${today}.txt`);

  if (!fs.existsSync(pngFile) || !fs.existsSync(txtFile)) {
    console.log("⚠️ 今日の投稿ファイルが見つかりません、スキップ");
    return;
  }

  // キャプション読み込み
  const caption = fs.readFileSync(txtFile, "utf-8");
  console.log(`  📝 キャプション: ${caption.split("\n")[0]}...`);

  // 公開画像URL（Vercelでホストされている前提）
  const imageUrl = `${SITE_URL}/posts/post-${today}.png`;
  console.log(`  🖼️ 画像URL: ${imageUrl}`);

  // ステップ1: メディアコンテナ作成
  console.log("  1️⃣ メディアコンテナを作成中...");
  const containerId = await createMediaContainer(imageUrl, caption);
  console.log(`  ✅ コンテナID: ${containerId}`);

  // ステップ2: 処理完了を待つ
  console.log("  2️⃣ 処理完了を待機中...");
  await waitForContainer(containerId);
  console.log("  ✅ 処理完了");

  // ステップ3: 公開
  console.log("  3️⃣ Instagramに公開中...");
  const mediaId = await publishMedia(containerId);
  console.log(`  ✅ 投稿完了！ Media ID: ${mediaId}`);

  console.log(`\n🎉 Instagram投稿が完了しました！`);
  console.log(`  https://www.instagram.com/gacha.gacha_now/`);
}

main().catch((e) => {
  console.error("❌ エラー:", e.message);
  process.exit(1);
});
