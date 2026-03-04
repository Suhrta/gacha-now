/**
 * publish-instagram.js
 * Instagram Graph APIを使って自動投稿する
 * posts/post-YYYY-MM-DD-*.png の全ファイルを順番に投稿
 * 投稿ファイルが0件ならスキップ
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
const SITE_URL = "https://gacha-now.net";

// 環境変数
const IG_USER_ID = process.env.IG_USER_ID;
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const GRAPH_API = "https://graph.facebook.com/v25.0";

// 投稿間の待機時間（秒）- API制限対策
const POST_INTERVAL_SEC = 30;

/**
 * ステップ1: メディアコンテナを作成
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
  return data.id;
}

/**
 * ステップ2: コンテナのステータスを確認
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

    console.log(`    ⏳ 処理中... (${i + 1}/${maxRetries})`);
    await new Promise((r) => setTimeout(r, 5000));
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
  return data.id;
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

  // 今日の投稿ファイルを探す（post-YYYY-MM-DD-1.png, post-YYYY-MM-DD-2.png, ...）
  const today = new Date().toISOString().split("T")[0];
  const pattern = new RegExp(`^post-${today}-(\\d+)\\.png$`);

  if (!fs.existsSync(POSTS_DIR)) {
    console.log("⚠️ postsディレクトリが見つかりません、スキップ");
    return;
  }

  const pngFiles = fs.readdirSync(POSTS_DIR)
    .filter((f) => pattern.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(pattern)[1]);
      const numB = parseInt(b.match(pattern)[1]);
      return numA - numB;
    });

  if (pngFiles.length === 0) {
    console.log("⚠️ 今日の投稿ファイルが見つかりません、スキップ");
    return;
  }

  console.log(`  📋 投稿予定: ${pngFiles.length}件`);

  let successCount = 0;

  for (let i = 0; i < pngFiles.length; i++) {
    const pngFile = pngFiles[i];
    const idx = pngFile.match(pattern)[1];
    const txtFile = `post-${today}-${idx}.txt`;
    const txtPath = path.join(POSTS_DIR, txtFile);

    console.log(`\n  [${parseInt(idx)}/${pngFiles.length}] ${pngFile}`);

    if (!fs.existsSync(txtPath)) {
      console.log(`    ⚠️ キャプションファイルなし、スキップ: ${txtFile}`);
      continue;
    }

    const caption = fs.readFileSync(txtPath, "utf-8");
    const imageUrl = `${SITE_URL}/posts/${pngFile}`;
    console.log(`    🖼️ ${imageUrl}`);
    console.log(`    📝 ${caption.split("\n")[0]}...`);

    try {
      // ステップ1: メディアコンテナ作成
      console.log("    1️⃣ メディアコンテナを作成中...");
      const containerId = await createMediaContainer(imageUrl, caption);
      console.log(`    ✅ コンテナID: ${containerId}`);

      // ステップ2: 処理完了を待つ
      console.log("    2️⃣ 処理完了を待機中...");
      await waitForContainer(containerId);

      // ステップ3: 公開
      console.log("    3️⃣ Instagramに公開中...");
      const mediaId = await publishMedia(containerId);
      console.log(`    ✅ 投稿完了！ Media ID: ${mediaId}`);
      successCount++;

      // 次の投稿まで待機（最後の投稿の後は不要）
      if (i < pngFiles.length - 1) {
        console.log(`    ⏳ ${POST_INTERVAL_SEC}秒待機中...`);
        await new Promise((r) => setTimeout(r, POST_INTERVAL_SEC * 1000));
      }
    } catch (e) {
      console.error(`    ❌ 投稿失敗: ${e.message}`);
      // 1件失敗しても次の投稿は続行
    }
  }

  console.log(`\n🎉 Instagram投稿完了！ ${successCount}/${pngFiles.length}件成功`);
  console.log(`  https://www.instagram.com/gacha.gacha_now/`);
}

main().catch((e) => {
  console.error("❌ エラー:", e.message);
  process.exit(1);
});
