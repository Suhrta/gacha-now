/**
 * check-ig-token.js
 * Instagram(Graph API)アクセストークンの有効性と残り日数をチェックし、
 * 失効が近い／失効済みの場合に Discord Webhook へ警告を送る。
 *
 * 背景: システムユーザートークンは最長でも60日で失効する。失効すると
 * 自動投稿が静かに止まり気づきにくいため、切れる前に予告通知する。
 *
 * 必要な環境変数:
 *   IG_ACCESS_TOKEN     - チェック対象のトークン（必須）
 *   DISCORD_WEBHOOK_URL  - 通知先（無ければ標準出力のみ）
 *   WARN_DAYS            - 残りこの日数以下で警告（既定: 7）
 *
 * このスクリプトは常に exit 0 で終了する（ワークフローを止めない）。
 */

const GRAPH_API = "https://graph.facebook.com/v25.0";
const TOKEN = process.env.IG_ACCESS_TOKEN;
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
const WARN_DAYS = parseInt(process.env.WARN_DAYS || "7", 10);

async function notifyDiscord(content) {
  console.log(content);
  if (!WEBHOOK) {
    console.log("  （DISCORD_WEBHOOK_URL 未設定のため通知はスキップ）");
    return;
  }
  try {
    const res = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      console.error(`  Discord通知失敗: status=${res.status}`);
    }
  } catch (e) {
    console.error(`  Discord通知失敗: ${e.message}`);
  }
}

const UPDATE_HINT =
  "更新先: GitHub → Settings → Secrets and variables → Actions → IG_ACCESS_TOKEN\n" +
  "（Metaビジネス設定のシステムユーザーで新トークンを発行 → 上記Secretを更新）";

async function main() {
  if (!TOKEN) {
    console.error("IG_ACCESS_TOKEN が未設定です。チェックをスキップします。");
    return;
  }

  // 1. トークンが今そもそも有効か（失効済みならここで弾かれる）
  let valid = false;
  try {
    const res = await fetch(
      `${GRAPH_API}/me?fields=id&access_token=${encodeURIComponent(TOKEN)}`
    );
    const j = await res.json();
    valid = !j.error && !!j.id;
    if (!valid) {
      await notifyDiscord(
        `❌ **Instagramトークンが無効/失効しています**\n` +
          `自動投稿が停止します。至急更新してください。\n` +
          `理由: ${j.error ? j.error.message : "不明"}\n${UPDATE_HINT}`
      );
      return;
    }
  } catch (e) {
    console.error(`トークン検証中にネットワークエラー: ${e.message}`);
    return; // 一時的な障害でDiscordをスパムしないようにここではAlertしない
  }

  // 2. 有効なら残り日数を確認
  try {
    const res = await fetch(
      `${GRAPH_API}/debug_token?input_token=${encodeURIComponent(TOKEN)}` +
        `&access_token=${encodeURIComponent(TOKEN)}`
    );
    const j = await res.json();
    const data = j.data || {};
    const expiresAt = data.expires_at; // unix秒。0は無期限

    if (!expiresAt || expiresAt === 0) {
      console.log("✅ トークンは有効（無期限）。通知不要。");
      return;
    }

    const daysLeft = Math.floor((expiresAt * 1000 - Date.now()) / 86400000);
    const dateStr = new Date(expiresAt * 1000).toISOString().slice(0, 10);
    console.log(`✅ トークン有効。失効まで残り ${daysLeft} 日（${dateStr}）`);

    if (daysLeft <= WARN_DAYS) {
      await notifyDiscord(
        `⚠️ **Instagramトークンがあと ${daysLeft} 日で失効します**（${dateStr}）\n` +
          `失効すると自動投稿が止まります。早めに更新してください。\n${UPDATE_HINT}`
      );
    }
  } catch (e) {
    console.error(`有効期限の確認に失敗: ${e.message}`);
  }
}

main().catch((e) => console.error(e));
