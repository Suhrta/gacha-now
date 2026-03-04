/**
 * publish-x.js
 * X (Twitter) API v2を使って自動投稿する
 * posts/post-YYYY-MM-DD-*.png の全ファイルを順番に投稿
 * IGと同じ画像+キャプションを使用
 *
 * 必要な環境変数:
 *   X_API_KEY            - Consumer API Key
 *   X_API_KEY_SECRET     - Consumer API Key Secret
 *   X_ACCESS_TOKEN       - Access Token
 *   X_ACCESS_TOKEN_SECRET - Access Token Secret
 *
 * 使い方: node scripts/publish-x.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TwitterApi } from "twitter-api-v2";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, "..", "posts");

// サイトURL
const SITE_URL = "https://gacha-now.vercel.app";

// 環境変数
const API_KEY = process.env.X_API_KEY;
const API_SECRET = process.env.X_API_KEY_SECRET;
const ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const ACCESS_SECRET = process.env.X_ACCESS_TOKEN_SECRET;

// 投稿間の待機時間（秒）
const POST_INTERVAL_SEC = 10;

// Xの文字数制限（280文字）に合わせてキャプションを調整
function trimCaption(caption) {
  // IG用キャプションからX用に変換
  // URLを末尾に追加する分を考慮して250文字以内に
  const lines = caption.split("\n").filter((l) => l.trim());
  let text = "";
  for (const line of lines) {
    if ((text + "\n" + line).length > 240) break;
    text += (text ? "\n" : "") + line;
  }
  // サイトURLを末尾に追加
  text += `\n\n${SITE_URL}`;
  return text;
}

async function main() {
  console.log("🐦 X (Twitter) 自動投稿を開始...");

  // 環境変数チェック
  if (!API_KEY || !API_SECRET || !ACCESS_TOKEN || !ACCESS_SECRET) {
    console.error("❌ X API の環境変数が未設定です");
    process.exit(1);
  }

  // Twitter クライアント初期化
  const client = new TwitterApi({
    appKey: API_KEY,
    appSecret: API_SECRET,
    accessToken: ACCESS_TOKEN,
    accessSecret: ACCESS_SECRET,
  });

  // 今日の投稿ファイルを探す
  const today = new Date().toISOString().split("T")[0];
  const pattern = new RegExp(`^post-${today}-(\\d+)\\.png$`);

  if (!fs.existsSync(POSTS_DIR)) {
    console.log("⚠️ postsディレクトリが見つかりません、スキップ");
    return;
  }

  const pngFiles = fs
    .readdirSync(POSTS_DIR)
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
    const pngPath = path.join(POSTS_DIR, pngFile);

    console.log(`\n  [${parseInt(idx)}/${pngFiles.length}] ${pngFile}`);

    if (!fs.existsSync(txtPath)) {
      console.log(`    ⚠️ キャプションファイルなし、スキップ: ${txtFile}`);
      continue;
    }

    const caption = fs.readFileSync(txtPath, "utf-8");
    const tweetText = trimCaption(caption);
    console.log(`    📝 ${tweetText.split("\n")[0]}...`);

    try {
      // 画像をアップロード
      console.log("    1️⃣ 画像をアップロード中...");
      const mediaId = await client.v1.uploadMedia(pngPath, {
        mimeType: "image/png",
      });
      console.log(`    ✅ Media ID: ${mediaId}`);

      // ツイート投稿
      console.log("    2️⃣ ツイートを投稿中...");
      const tweet = await client.v2.tweet({
        text: tweetText,
        media: { media_ids: [mediaId] },
      });
      console.log(`    ✅ 投稿完了！ Tweet ID: ${tweet.data.id}`);
      successCount++;

      // 次の投稿まで待機
      if (i < pngFiles.length - 1) {
        console.log(`    ⏳ ${POST_INTERVAL_SEC}秒待機中...`);
        await new Promise((r) => setTimeout(r, POST_INTERVAL_SEC * 1000));
      }
    } catch (e) {
      console.error(`    ❌ 投稿失敗: ${e.message}`);
      if (e.data) console.error(`    詳細: ${JSON.stringify(e.data)}`);
    }
  }

  console.log(`\n🎉 X投稿完了！ ${successCount}/${pngFiles.length}件成功`);
}

main().catch((e) => {
  console.error("❌ エラー:", e.message);
  process.exit(1);
});
