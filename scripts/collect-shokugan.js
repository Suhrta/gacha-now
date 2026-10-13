/**
 * collect-shokugan.js - バンダイ キャンディ（食玩）の新商品を収集する
 *
 * 【取得元と根拠】
 * https://www.bandai.co.jp/candy/calendar/YYYY/MM/index.html が月別の発売カレンダーで、
 * 商品名・画像・発売日・詳細URLが静的HTMLに入っている（JS描画ではない）。
 * robots.txt は /common/ と /feed/ のみ Disallow で、/candy/ は許可されている（2026-10-13確認）。
 *
 * 実測の件数: 2026-10が41件 / 2026-11が44件 / 2026-12が46件。
 *
 * 【画像を取得しない理由】
 * バンダイの「著作権・商標について」に
 *   「すべての画像、文章、情報…権利者の許可なく、複製、転載等の行為をお断りいたします」
 * とある。画像を自サーバーへコピーする設計は取らない。
 * 表示用の画像は scripts/enrich-shokugan.js が楽天APIから取得した商品画像を直リンクで使う
 * （アフィリエイトリンクと併せて表示するため、APIの利用目的と整合する）。
 * 公式の説明文も全文は載せない。情報源として使い、紹介文は別途生成する。
 *
 * 【負荷】
 * 当月＋翌月の2ページのみ＝1ランあたり2リクエスト。
 * バンダイ側は「毎月月初・中旬に更新」と明記しているので、日次で何度も叩く意味がない。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "shokugan.json");

const UA =
  "Mozilla/5.0 (compatible; gacha-now/1.0; +https://gacha-now.net)";
const TIMEOUT_MS = 20000;

// 取得する月数。当月を含めて何ヶ月先まで見るか。
// 2にすると当月＋翌月。先の月ほど発売日が未確定（11月は44件中6件しか日付が無い）なので、
// 増やしても情報の密度は上がらない。
const MONTHS = Number(process.env.SHOKUGAN_MONTHS || 2);

function calendarUrl(year, month) {
  return `https://www.bandai.co.jp/candy/calendar/${year}/${String(month).padStart(2, "0")}/index.html`;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * 詳細URLのファイル名から JAN コードを取り出す。
 *   .../candy/products/2026/4570117934759000.html → 4570117934759（先頭13桁）
 * 16桁のものは「JAN13桁＋枝番3桁」。10桁などの別体系（プレミアムバンダイ系）も混じるので、
 * 16桁のときだけJANとして扱う。JANが取れないものは楽天との突き合わせができない。
 */
function janFromUrl(url) {
  const m = String(url).match(/\/(\d{16})\.html$/);
  return m ? m[1].slice(0, 13) : null;
}

/**
 * 「2026.10.5発売」「2026.11発売」「2026.11発送」を分解する。
 *
 * 発送 はプレミアムバンダイ等の通販商品で、店頭では買えない。
 * 除外はせず kind で区別して、表示側で明示する。
 */
function parseSchedule(raw) {
  const text = String(raw || "").replace(/\s+/g, "");
  const kind = text.includes("発送") ? "ship" : "sale";
  const full = text.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (full) {
    return {
      kind,
      ym: `${full[1]}-${String(full[2]).padStart(2, "0")}`,
      day: Number(full[3]),
    };
  }
  const ym = text.match(/(\d{4})\.(\d{1,2})/);
  if (ym) {
    return { kind, ym: `${ym[1]}-${String(ym[2]).padStart(2, "0")}`, day: null };
  }
  return { kind, ym: null, day: null };
}

// カレンダー1ページから商品を取り出す。
// 構造（2026-10-13時点）:
//   <a href="...(詳細URL)" class="hoverAction">
//     <span class="thumbImage..."><img src="..." alt="商品名" /></span>
//     <span class="thumbTitle itemName ...">商品名</span>
//     <span class="thumbSchedule ..."><span class="fontEn...">2026.10.5</span>発売</span>
//   </a>
function parseCalendar(html) {
  const items = [];
  const blocks = html.matchAll(
    /<a\s+href="([^"]*\/candy\/products\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  );
  for (const [, href, inner] of blocks) {
    const title = inner.match(
      /<span class="thumbTitle[^"]*">([\s\S]*?)<\/span>/
    );
    if (!title) continue;
    const name = title[1].replace(/<[^>]+>/g, "").trim();
    if (!name) continue;

    const sched = inner.match(/<span class="thumbSchedule[^"]*">([\s\S]*?)<\/span>\s*$/);
    const schedule = parseSchedule(
      sched ? sched[1].replace(/<[^>]+>/g, "") : ""
    );

    items.push({
      name,
      officialUrl: href,
      jan: janFromUrl(href),
      releaseYm: schedule.ym,
      releaseDay: schedule.day,
      releaseKind: schedule.kind,
    });
  }
  return items;
}

// 商品IDは詳細URLのファイル名から作る。JANが入っているものはそれ自体が安定キーで、
// 入っていないものもバンダイ側のURLが変わらない限り安定する。
function idFor(item) {
  const base = String(item.officialUrl).split("/").pop().replace(/\.html$/, "");
  return `shokugan-${base}`;
}

async function main() {
  const now = new Date();
  const targets = [];
  for (let i = 0; i < MONTHS; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    targets.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  console.log(`🍬 食玩データ収集（${targets.length}ヶ月分）`);

  const collected = [];
  for (const t of targets) {
    const url = calendarUrl(t.year, t.month);
    try {
      const html = await fetchHtml(url);
      const items = parseCalendar(html);
      console.log(`  ${t.year}/${String(t.month).padStart(2, "0")} … ${items.length}件`);
      collected.push(...items);
    } catch (e) {
      // 1ヶ月分が取れなくても残りは処理する。翌日の実行で取り直せる。
      console.error(`  ⚠️ ${url}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  // 同じ商品が複数の月に出ることがある（発売延期など）。詳細URLで一意にする。
  const byId = new Map();
  for (const item of collected) byId.set(idFor(item), { id: idFor(item), ...item });

  // 既存データとマージする。楽天由来の情報（画像・価格・リンク）と生成した紹介文は
  // ここでは触らず、enrich-shokugan.js / generate-descriptions.js が入れる。
  const existing = fs.existsSync(OUT_PATH)
    ? JSON.parse(fs.readFileSync(OUT_PATH, "utf8"))
    : [];
  const existingById = new Map(existing.map((p) => [p.id, p]));

  let added = 0;
  let updated = 0;
  const merged = [];
  for (const [id, fresh] of byId) {
    const prev = existingById.get(id);
    if (!prev) {
      merged.push({ ...fresh, collectedAt: new Date().toISOString() });
      added++;
    } else {
      // 発売日が確定に変わることがある（2026.11発売 → 2026.11.2発売）ので上書きする。
      const next = { ...prev, ...fresh };
      if (JSON.stringify(next) !== JSON.stringify(prev)) updated++;
      merged.push(next);
    }
    existingById.delete(id);
  }
  // カレンダーから消えた商品（＝過去月に流れた）は残す。発売済みの記録として価値がある。
  for (const leftover of existingById.values()) merged.push(leftover);

  merged.sort((a, b) => {
    const ak = `${a.releaseYm || "9999-99"}-${String(a.releaseDay || 99).padStart(2, "0")}`;
    const bk = `${b.releaseYm || "9999-99"}-${String(b.releaseDay || 99).padStart(2, "0")}`;
    return ak < bk ? -1 : ak > bk ? 1 : 0;
  });

  fs.writeFileSync(OUT_PATH, JSON.stringify(merged, null, 2), "utf-8");

  const withJan = merged.filter((p) => p.jan).length;
  console.log(`\n✅ 新規 ${added}件 / 更新 ${updated}件 / 合計 ${merged.length}件`);
  console.log(`   JANあり: ${withJan}件（楽天と突き合わせ可能）`);
  console.log(`💾 ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
