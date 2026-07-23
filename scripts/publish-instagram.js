/**
 * publish-instagram.js
 * Instagram Graph APIを使って自動投稿する
 * posts/post-YYYY-MM-DD-HHh-{連番}-{スライド}.jpg を商品ごとにまとめて投稿する
 * （2枚以上ある商品はカルーセル投稿になる）
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
const POSTS_DIR = path.join(__dirname, "..", "public", "posts");

// Vercelの公開URL
// gacha-now.net は www にリダイレクトされるため、IG側のURL検証を通しやすいように www を正として扱う
const SITE_URL = "https://www.gacha-now.net";

// 環境変数
const IG_USER_ID = process.env.IG_USER_ID;
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const GRAPH_API = "https://graph.facebook.com/v25.0";
const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "true";

// 投稿間の待機時間（秒）- API制限対策
const POST_INTERVAL_SEC = 30;

// 画像URLがデプロイに反映されるまでの待機（秒）
const PREFLIGHT_INTERVAL_SEC = parseInt(process.env.PREFLIGHT_INTERVAL_SEC || "10", 10);
const PREFLIGHT_MAX_RETRIES = parseInt(process.env.PREFLIGHT_MAX_RETRIES || "30", 10);

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function preflightImageUrl(imageUrl, maxRetries = PREFLIGHT_MAX_RETRIES) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(imageUrl, { method: "HEAD" });
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.startsWith("image/")) {
        return;
      }
      console.log(
        `    ⏳ 画像URL待機中... (${i + 1}/${maxRetries}) status=${res.status} content-type=${contentType}`
      );
    } catch (e) {
      console.log(
        `    ⏳ 画像URL待機中... (${i + 1}/${maxRetries}) fetch-error=${e.message}`
      );
    }

    await sleep(PREFLIGHT_INTERVAL_SEC * 1000);
  }

  // 最後にGETで詳細を出して失敗
  const res = await fetch(imageUrl, { method: "GET" });
  const contentType = res.headers.get("content-type") || "";
  throw new Error(
    `画像URLが有効になりませんでした: status=${res.status} content-type=${contentType} url=${imageUrl}`
  );
}

/**
 * ステップ1: メディアコンテナを作成
 *
 * 単票は image_url + caption をそのまま渡す。
 * カルーセルは「子コンテナを is_carousel_item で作る → 親を CAROUSEL で束ねる」
 * の2段構えになり、キャプションは親側にだけ付く。
 */
async function createContainer(body) {
  const res = await fetch(`${GRAPH_API}/${IG_USER_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: IG_ACCESS_TOKEN }),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`メディアコンテナ作成失敗: ${data.error.message}`);
  }
  return data.id;
}

async function createMediaContainer(imageUrls, caption) {
  if (imageUrls.length === 1) {
    return createContainer({ image_url: imageUrls[0], caption });
  }

  const children = [];
  for (const imageUrl of imageUrls) {
    children.push(await createContainer({ image_url: imageUrl, is_carousel_item: true }));
  }
  console.log(`    🎠 子コンテナ ${children.length}件`);

  return createContainer({
    media_type: "CAROUSEL",
    children: children.join(","),
    caption,
  });
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

  if (DRY_RUN) {
    console.log("  🧪 DRY_RUN=true のため投稿は行いません");
  }

  // 環境変数チェック（DRY_RUN では不要）
  if (!DRY_RUN && (!IG_USER_ID || !IG_ACCESS_TOKEN)) {
    console.error("❌ IG_USER_ID または IG_ACCESS_TOKEN が未設定です");
    process.exit(1);
  }

  // 投稿対象日（TARGET_DATE 環境変数が指定されていればそれを使用、なければ当日）
  const targetDate = process.env.TARGET_DATE || new Date().toISOString().split("T")[0];
  console.log(`  📅 対象日: ${targetDate}`);
  // post-YYYY-MM-DD-HHh-{商品連番}-{スライド番号}.jpg
  // 同じ商品連番のファイルを1投稿（カルーセル）としてまとめる
  const pattern = new RegExp(`^post-${targetDate}-\\d+h-(\\d+)-(\\d+)\\.jpg$`);

  // 投稿済みログ（CI/手動実行で永続化して重複投稿を防ぐ）
  const LOG_PATH = path.join(__dirname, "..", "data", "instagram-posted-log.json");
  let postedLog = [];
  try {
    if (fs.existsSync(LOG_PATH)) {
      postedLog = JSON.parse(fs.readFileSync(LOG_PATH, "utf-8"));
    }
  } catch (e) {
    console.log(`⚠️ 投稿済みログの読み込みに失敗しました。新規扱いで続行します: ${e.message}`);
    postedLog = [];
  }

  if (!Array.isArray(postedLog)) {
    postedLog = [];
  }

  const postedSet = new Set(postedLog);

  if (!fs.existsSync(POSTS_DIR)) {
    console.log("⚠️ postsディレクトリが見つかりません、スキップ");
    return;
  }

  // 商品連番ごとにスライドをまとめる。投稿済みの記録も商品単位（キャプションの
  // ファイル名と同じ post-YYYY-MM-DD-HHh-{連番}）で持つ。
  const groups = new Map();
  for (const f of fs.readdirSync(POSTS_DIR)) {
    const m = f.match(pattern);
    if (!m) continue;
    const key = f.slice(0, f.lastIndexOf("-"));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ file: f, idx: parseInt(m[1], 10), slide: parseInt(m[2], 10) });
  }

  const allPosts = [...groups.entries()]
    .map(([key, slides]) => ({
      key,
      idx: slides[0].idx,
      files: slides.sort((a, b) => a.slide - b.slide).map((s) => s.file),
    }))
    .sort((a, b) => a.idx - b.idx);

  const posts = allPosts.filter((p) => !postedSet.has(p.key));

  if (allPosts.length === 0) {
    console.log("⚠️ 今日の投稿ファイルが見つかりません、スキップ");
    return;
  }

  if (posts.length === 0) {
    console.log("⏭️ 対象ファイルはすべて投稿済みのためスキップ");
    return;
  }

  console.log(`  📋 投稿予定: ${posts.length}件`);

  if (DRY_RUN) {
    for (const p of posts) {
      console.log(`  - ${p.key} (${p.files.length}枚)`);
    }
    return;
  }

  let successCount = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const txtPath = path.join(POSTS_DIR, `${post.key}.txt`);

    console.log(`\n  [${i + 1}/${posts.length}] ${post.key} (${post.files.length}枚)`);

    if (!fs.existsSync(txtPath)) {
      console.log(`    ⚠️ キャプションファイルなし、スキップ: ${post.key}.txt`);
      continue;
    }

    const caption = fs.readFileSync(txtPath, "utf-8");
    const imageUrls = post.files.map((f) => `${SITE_URL}/posts/${f}`);
    console.log(`    🖼️ ${imageUrls[0]}`);
    console.log(`    📝 ${caption.split("\n")[0]}...`);

    // Vercelデプロイ反映待ち（URLが 200 かつ image/* になるまで待機）。
    // 同じデプロイに含まれるので、1枚目が見えたら残りも見えているはず。
    // 全スライドで最大回数待つと待ち時間が枚数分に膨らむため、2枚目以降は短く確認する。
    await preflightImageUrl(imageUrls[0]);
    for (const u of imageUrls.slice(1)) {
      await preflightImageUrl(u, 3);
    }

    try {
      // ステップ1: メディアコンテナ作成
      console.log("    1️⃣ メディアコンテナを作成中...");
      const containerId = await createMediaContainer(imageUrls, caption);
      console.log(`    ✅ コンテナID: ${containerId}`);

      // ステップ2: 処理完了を待つ
      console.log("    2️⃣ 処理完了を待機中...");
      await waitForContainer(containerId);

      // ステップ3: 公開
      console.log("    3️⃣ Instagramに公開中...");
      const mediaId = await publishMedia(containerId);
      console.log(`    ✅ 投稿完了！ Media ID: ${mediaId}`);
      successCount++;

      if (!postedSet.has(post.key)) {
        postedSet.add(post.key);
        postedLog.push(post.key);
        fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
        fs.writeFileSync(LOG_PATH, JSON.stringify(postedLog, null, 2), "utf-8");
      }

      // 次の投稿まで待機（最後の投稿の後は不要）
      if (i < posts.length - 1) {
        console.log(`    ⏳ ${POST_INTERVAL_SEC}秒待機中...`);
        await new Promise((r) => setTimeout(r, POST_INTERVAL_SEC * 1000));
      }
    } catch (e) {
      console.error(`    ❌ 投稿失敗: ${e.message}`);
      // 1件失敗しても次の投稿は続行
    }
  }

  console.log(`\n🎉 Instagram投稿完了！ ${successCount}/${posts.length}件成功`);
  console.log(`  https://www.instagram.com/gacha.gacha_now/`);

  // 投稿対象があるのに成功0件なら失敗として扱い、CIで検知できるようにする
  if (posts.length > 0 && successCount === 0) {
    console.error("❌ 投稿対象があるのに成功0件でした");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("❌ エラー:", e.message);
  process.exit(1);
});
