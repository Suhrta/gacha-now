/**
 * cleanup-posts.js
 * public/posts の古い投稿ファイルを削除する
 *
 * 投稿画像はInstagram APIに「公開URL」を渡すためだけに存在し、
 * サイトのどこからも参照されていない。公開後はInstagram側が自前の
 * コピーを持つため、こちらに残し続ける必要がない。
 *
 * 判定はファイル名の日付で行う。CIのチェックアウトでは全ファイルの
 * mtimeが同じになるため、更新日時では判定できない。
 *
 * 注意: gitの履歴からは消えないのでリポジトリ自体は小さくならない。
 * 効くのはデプロイサイズと作業ツリー、これ以上増やさないこと。
 *
 * 中間HTML（generate-post.js が puppeteer に読ませるためだけに書くファイル）は
 * 日付に関係なく全部落とす。撮影が終われば用済みで、data URIで画像を抱える都合上
 * jpg本体より嵩む（2026-09-02時点で .html 233MB > .jpg 164MB）。
 *
 * 使い方:
 *   node scripts/cleanup-posts.js              # 7日より古いものを削除
 *   RETENTION_DAYS=60 node scripts/cleanup-posts.js
 *   DRY_RUN=true node scripts/cleanup-posts.js  # 消さずに一覧だけ
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, "..", "public", "posts");

// 30日は長すぎた。投稿画像がURLとして要るのは publish-instagram.js が
// Instagramに渡す数分間だけで、あとは publish-instagram.yml の日付指定バックフィルの
// 猶予にしかならない。30日ぶんを常時デプロイに載せていたためpublic/が449MBまで育ち、
// 本番デプロイが2026-09-01から失敗し続けた。バックフィルに要る余裕として1週間を残す。
const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || "7", 10);
const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "true";

// post-2026-07-23-14h-6-1.jpg / post-2026-03-04-1.png / post-2026-03-03.png
// いずれも先頭が post-YYYY-MM-DD で共通しているので、そこだけ見る
const DATED = /^post-(\d{4})-(\d{2})-(\d{2})[-.]/;

function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.log("⚠️ postsディレクトリが見つかりません、スキップ");
    return;
  }

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  console.log(`🧹 ${cutoffStr} より前の投稿ファイルを削除します（保持${RETENTION_DAYS}日）`);
  if (DRY_RUN) console.log("  🧪 DRY_RUN=true のため削除は行いません");

  let removed = 0;
  let bytes = 0;
  let kept = 0;

  let html = 0;

  for (const file of fs.readdirSync(POSTS_DIR)) {
    const m = file.match(DATED);
    if (!m) continue;

    // 中間HTMLは日付を問わず削除（撮影後は誰も読まない）
    if (file.endsWith(".html")) {
      const full = path.join(POSTS_DIR, file);
      bytes += fs.statSync(full).size;
      if (!DRY_RUN) fs.unlinkSync(full);
      removed++;
      html++;
      continue;
    }

    const fileDate = `${m[1]}-${m[2]}-${m[3]}`;
    if (fileDate >= cutoffStr) {
      kept++;
      continue;
    }

    const full = path.join(POSTS_DIR, file);
    bytes += fs.statSync(full).size;
    if (!DRY_RUN) fs.unlinkSync(full);
    removed++;
  }

  const mb = (bytes / 1048576).toFixed(1);
  console.log(`  ${DRY_RUN ? "削除対象" : "削除"}: ${removed}件 (${mb}MB) / 残存: ${kept}件`);
  console.log(`  うち中間HTML: ${html}件`);
}

main();
