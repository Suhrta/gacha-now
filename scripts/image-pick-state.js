/**
 * image-pick-state.js - 楽天画像のAI判定を「必要な時だけ」走らせるための共通ルール
 *
 * 【なぜ必要になったか】
 * pick-shokugan-images.js は「cleanImage が無い商品」を毎日判定し直していた。
 * ところが判定して見送った結果を記録していないため、
 *   - 候補が全部バナー入りだった商品（実測22件）→ 毎日AIを呼び直す
 *   - 楽天に候補がゼロの商品（実測25件）→ 毎日楽天APIを叩く
 * の計47件が永久に消えず、LIMIT=20 の枠を毎日占め続けていた。
 * コストが月$2を超えて14日目に上限で止まるうえ、
 * **その後に入る新商品は順番が回ってこない**という壊れ方をしていた。
 *
 * 【ここで決めること】
 * 1) 候補セットを記録し、**新しい候補が1つも増えていなければAIを呼ばない**。
 *    楽天の出品は増減するので、増えた時だけ見れば良い。
 * 2) 見送りが続いた商品は打ち切る（MAX_MISSES）。
 *    候補が1件増えるたびに判定してまた見送る、という往復を止める保険。
 * 3) 楽天への問い合わせ自体も RECHECK_DAYS 間隔に落とす。
 *    無料だが1件1.1秒かかるので、毎日全件叩くと実行時間だけが伸びる。
 * 4) 古いものから順に処理する（sortByStaleness）。
 *    配列順のままだと、永久に採用できない商品が先頭に居座って
 *    新商品にいつまでも画像が付かない。上の壊れ方の直接の原因。
 *
 * 【候補セットの持ち方】
 * 画像URLは1本100文字前後あり、6枚×245商品を生で持つとJSONが太る。
 * URLの短いハッシュ（8桁）の配列にして1商品70バイト程度に収める。
 * 集合として持つのが重要で、ハッシュ1個にまとめると「減った」も変化として拾い、
 * 増えていないのに再判定してしまう。
 */
import crypto from "node:crypto";
import fs from "node:fs";

/**
 * 判定コストの記録を「CI枠」と「手動枠」に分ける。
 *
 * 【なぜ分けるか】
 * 2026-10-14、移行作業と再判定を手でまとめて回して月$0.83を使った。
 * 記録が1本だったため、日次CIの月上限$0.30の判定にその$0.83が含まれ、
 * 翌日から月末までCI側が起動直後に exit 78 で止まる状態になった。
 * 手動実行は人が都度上限を決めて回すもので、無人の日次ランを守るための
 * 枠とは別に数えないと、片方の都合でもう片方が止まる。
 *
 * ファイルは1本のまま（その月に実際いくら使ったかを1か所で見たいので）。
 *   { month, ci: {usd, judged}, manual: {usd, judged} }
 *
 * 既定は "ci"。手動実行のときだけ LEDGER=manual を付ける。
 * 既定を手動側にすると、付け忘れた手動実行がCI枠を削るので逆にする。
 */
export const LEDGER = process.env.LEDGER === "manual" ? "manual" : "ci";

const emptyBucket = () => ({ usd: 0, judged: 0 });

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function loadLedger(filePath) {
  const month = currentMonth();
  const empty = { month, ci: emptyBucket(), manual: emptyBucket() };
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return empty;
  }
  // 月が変わったら両方ゼロから数え直す。
  if (raw.month !== month) return empty;
  // 旧フォーマット { month, usd, judged } は手動枠に寄せる。
  // ガチャ側は今日までCI未投入で、食玩側の記録もローカル実行で作ったものなので、
  // 現時点の記録は全額が手動実行ぶん。
  if (raw.usd !== undefined && !raw.ci && !raw.manual) {
    return {
      month,
      ci: emptyBucket(),
      manual: { usd: Number(raw.usd) || 0, judged: Number(raw.judged) || 0 },
    };
  }
  return {
    month,
    ci: { usd: Number(raw.ci?.usd) || 0, judged: Number(raw.ci?.judged) || 0 },
    manual: { usd: Number(raw.manual?.usd) || 0, judged: Number(raw.manual?.judged) || 0 },
  };
}

export function saveLedger(filePath, ledger) {
  fs.writeFileSync(filePath, JSON.stringify(ledger, null, 2) + "\n", "utf-8");
}

/** その月の実支出（両枠の合計）。ログに出して実額が見えなくなるのを防ぐ。 */
export function ledgerTotal(ledger) {
  return ledger.ci.usd + ledger.manual.usd;
}

/**
 * 店舗の「画像なし」プレースホルダを弾く。
 *
 * 楽天の出品画像には、店舗が画像を用意していないときの代替画像が混じる
 * （実測: gacha-samurai/cabinet/noimage.jpg）。
 * これは無地に近いので「販促バナーが無く商品名と矛盾しない画像」として
 * AI判定を通ってしまい、実際に1件採用されてしまった。
 * 中身を見て判断する話ではなくURLで確定的に分かるので、候補に入れる前に落とす。
 */
const PLACEHOLDER_RE =
  /\b(no[-_]?image|no[-_]?photo|noimg|dummy|coming[-_]?soon|now[-_]?printing|preparing)\b|noimage|nowprinting/i;

export function isPlaceholderImage(url) {
  return PLACEHOLDER_RE.test(String(url || ""));
}

/** 候補が増えていないか見るだけなので、衝突確率より短さを優先して8桁に切る。 */
export function candKey(url) {
  return crypto.createHash("sha1").update(String(url)).digest("hex").slice(0, 8);
}

/** 候補URL群 → 重複を除いてソートしたキー配列。保存と比較の両方でこれを使う。 */
export function candKeys(urls) {
  return [...new Set(urls.map(candKey))].sort();
}

/**
 * 前回の候補セットに無いキーが1つでもあるか。
 * 記録が無い商品（初回・バックフィル前）は true を返して判定に回す。
 */
export function hasNewCandidate(freshKeys, prevKeys) {
  if (!Array.isArray(prevKeys)) return true;
  const prev = new Set(prevKeys);
  return freshKeys.some((k) => !prev.has(k));
}

/** 見送りをこの回数続けた商品は、以降の再判定対象から外す。 */
export const MAX_MISSES = 3;

/** 楽天への問い合わせ間隔（日）。これより新しい確認済みは今回触らない。 */
export const RECHECK_DAYS = 7;

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

/** checkedAt（YYYY-MM-DD）から RECHECK_DAYS 経ったか。未設定なら true。 */
export function needsRecheck(checkedAt, days = RECHECK_DAYS) {
  if (!checkedAt) return true;
  const t = Date.parse(checkedAt);
  if (Number.isNaN(t)) return true;
  return Date.now() - t >= days * 86400000;
}

/**
 * 確認が古いものから順に並べる。未確認を最優先。
 * これをしないと、採用できない商品が先頭に固定されて新商品が処理されない。
 */
export function sortByStaleness(items, checkedAtField) {
  return [...items].sort((a, b) => {
    const x = a[checkedAtField] || "";
    const y = b[checkedAtField] || "";
    return x < y ? -1 : x > y ? 1 : 0;
  });
}

/**
 * 判定に使うモデルと単価。**単価はモデルと必ずセットで変える。**
 * 以前ここが $3/$15（claude-sonnet-4-6 の単価）のままで claude-sonnet-5 を
 * 呼んでいたため、記録していた累計コストが実費の1.5倍になっていた。
 * https://platform.claude.com/docs/en/about-claude/pricing
 */
export const MODEL = "claude-sonnet-5";
export const PRICE_IN = 2; // USD / 1M input tokens
export const PRICE_OUT = 10; // USD / 1M output tokens

export function costOf(inTok, outTok) {
  return (inTok / 1e6) * PRICE_IN + (outTok / 1e6) * PRICE_OUT;
}

/**
 * 判定1回ぶんのリクエスト設定。両スクリプトで同じ形にする。
 *
 * thinking を明示的に切る理由:
 *   claude-sonnet-5 は thinking を省略すると adaptive thinking が走る。
 *   出力枠を思考トークンが食うと本文が空になり、パーサ側は
 *   「判定できなかった」と「見送り」を区別できないまま見送り扱いにする。
 *
 * 出力を構造化出力で縛る理由:
 *   「番号だけを出力」という指示をテキストで守らせる作りは、
 *   モデルを替えたときに壊れる。実測で claude-haiku-5-5 は英語の散文を
 *   書き始めて max_tokens で切れ、判定とは無関係に全件「見送り」になった。
 */
export function requestOptions(candidateCount) {
  return {
    model: MODEL,
    max_tokens: 64,
    thinking: { type: "disabled" },
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            choice: {
              type: "string",
              enum: [...Array.from({ length: candidateCount }, (_, i) => String(i)), "none"],
            },
          },
          required: ["choice"],
          additionalProperties: false,
        },
      },
    },
  };
}

/** 構造化出力の応答から候補番号を取り出す。選ばなかった／壊れていたら -1。 */
export function parseChoice(res, candidateCount) {
  const text = res.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("")
    .trim();
  let choice = null;
  try {
    choice = JSON.parse(text).choice;
  } catch {
    return { idx: -1, raw: text };
  }
  const idx = /^\d+$/.test(String(choice)) ? Number(choice) : -1;
  return { idx: idx >= 0 && idx < candidateCount ? idx : -1, raw: text };
}
