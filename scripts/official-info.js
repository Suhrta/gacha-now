/**
 * official-info.js - 収集元の公式ページから一次情報を抜き出す
 *
 * 【なぜ必要か】
 * gacha-now の商品ページは長らく「画像＋商品名＋価格＋楽天ボタン」しか無かった。
 * 2026-08-06 にAIで説明文を生成して平均129文字まで厚くしたが、
 * products.json が持つ情報（名前/価格/種類数/発売時期/メーカー）だけが材料なので、
 * サイズ・ラインナップ内訳といった「読み手が本当に知りたい事実」は書けなかった
 * （書かせようとすると捏造になるため generate-descriptions.js で明示的に禁止している）。
 *
 * ところが 2026-08-07 に競合調査で収集元の公式ページを直接見たところ、
 * それらの情報はすべて公式ページに載っていた。取っていなかっただけだった。
 *
 * 例（タカラトミーアーツ / og:description）:
 *   「カニカンで上下に連結できる…本体サイズは約4.3〜4.9cm。
 *     ラインナップは「スティッチ」「エンジェル」「ルーベン」「スクランプ」の全4種。」
 *
 * 一次情報なのでAI生成より事実として強く、APIコストもかからない。
 * ラインナップ内訳にはキャラクター名が入るため、
 * 「ポケモン ニャース ガチャ」級のロングテールを取れる面が新しく手に入る。
 *
 * 【収集元ごとの取れ方（2026-08-07 実測）】
 *   バンダイ  572件(68%) og:description が公式キャッチコピー。サイズ・内訳は無し
 *   タカトミ  186件(22%) og:description に説明文＋サイズ＋内訳が全部入り
 *   キタン     47件( 6%) 本文 .c-productDetail__text、dt/dd にサイズ
 *   ブシロード  40件( 5%) .product__description、dt/dd にサイズと種類
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&middot;/g, "・")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function stripTags(s) {
  return decodeEntities(
    s
      // <br> は文の区切りなので消さずに空白へ倒す
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html, prop) {
  // property/name はどちらの順序でも書かれうるので両方試す
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeEntities(m[1]).trim();
  }
  return null;
}

// <dt>ラベル</dt><dd>値</dd> から値を取る（キタン・ブシロードの仕様表）
function definitionValue(html, label) {
  const re = new RegExp(`<dt[^>]*>\\s*${label}\\s*</dt>\\s*<dd[^>]*>([\\s\\S]{0,120}?)</dd>`, "i");
  const m = html.match(re);
  return m ? stripTags(m[1]) : null;
}

function firstMatch(html, re) {
  const m = html.match(re);
  return m ? stripTags(m[1]) : null;
}

// ── 抽出ヘルパー ──────────────────────────────────────────────

// 「本体サイズは約4.3〜4.9cm」「約35ｍｍ」などを正規化して返す
function extractSize(text) {
  if (!text) return null;
  const m = text.match(/(?:本体)?サイズ[はが：:\s]*([約およそ]*[\d.〜~\-－ー]+\s*(?:cm|mm|ｍｍ|センチ|ミリ))/);
  if (m) return m[1].replace(/\s+/g, "");
  // ラベル無しで単体の寸法だけが来る場合（dt/dd の dd 側）
  const bare = text.match(/^([約およそ]*[\d.〜~\-－ー]+\s*(?:cm|mm|ｍｍ))$/);
  return bare ? bare[1].replace(/\s+/g, "") : null;
}

function toHalfWidthNumber(s) {
  return parseInt(s.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)), 10);
}

// 収集元のCMS由来で名前に紛れ込む単独の「?」を落とす。
// 例: タカラトミーアーツの実データに「ベイマックス?-サウナ-」がある（当方の文字コード
// 処理ではなく、先方のページに UTF-8 でそのまま入っている）。記号の直前直後の
// 孤立した ? だけを対象にし、疑問符として意味を持つものは残す。
function cleanName(s) {
  return s.replace(/\?(?=[-–—―「」『』\s]|$)/g, "").replace(/\s+/g, " ").trim();
}

/**
 * 公式説明文からラインナップ（収録キャラ名）を取り出す。
 * これが今回いちばん価値のあるデータ。キャラクター名が入るため
 * 「ポケモン ニャース ガチャ」級のロングテールを取れる面が手に入る。
 *
 * 表記が収集元で2通りあるので両方に対応する:
 *   タカトミ「ラインナップは「A」「B」「C」の全4種。」  … 鉤括弧区切り
 *   バンダイ「A、B、C、D、Eの全5種類だよ。」            … 読点区切り
 *
 * 誤抽出を避けるため、**取れた件数が「全N種」のNと一致した場合のみ**採用する。
 * 一致検証を入れないと、説明文中の関係ない列挙を拾ってしまう。
 */
// 商品名（キャラ名）として妥当か。説明文の地の文を拾ってしまうのを防ぐ。
// 例: キタンの「お手持ちのフィギュアと組み合わせて飾って」を弾く。
function isPlausibleName(s) {
  if (!s || s.length > 25) return false;
  if (/[。！!？?]/.test(s)) return false;
  // 動詞・助詞で終わるものは文の断片
  if (/(?:て|で|に|を|と|が|は|も|から|など|ます|です|ました)$/.test(s)) return false;
  return true;
}

// ラインナップを述べている区間だけを切り出す。
// 全文から鉤括弧を拾うと商品名やシリーズ名まで混ざるため、範囲を絞るのが要。
function pickLineupSegment(text) {
  const end = text.search(/の?全\s*[0-9０-９]+\s*種/);
  if (end < 0) return null;
  const before = text.slice(0, end);
  // 「ラインナップは」「ラインナップ:」があればそこから
  const label = before.search(/ラインナップ(?:は|：|:)/);
  if (label >= 0) return before.slice(label).replace(/^ラインナップ(?:は|：|:)\s*/, "");
  // 無ければ直前の文の区切りから
  const lastStop = Math.max(before.lastIndexOf("。"), before.lastIndexOf("！"), before.lastIndexOf("!"));
  return before.slice(lastStop + 1);
}

function extractLineup(text) {
  if (!text) return null;

  // 「全N種」が件数検証の基準。これが取れないものは扱わない
  const nMatch = text.match(/全\s*([0-9０-９]+)\s*種/);
  const expected = nMatch ? toHalfWidthNumber(nMatch[1]) : null;
  if (!expected || expected < 2 || expected > 40) return null;

  const seg = pickLineupSegment(text);
  if (!seg) return null;

  // ① 鉤括弧区切り（タカトミ「A」「B」「C」形式）
  const bracket = [...seg.matchAll(/[「『]([^」』]{1,40})[」』]/g)]
    .map((m) => cleanName(m[1]))
    .filter(Boolean);
  if (bracket.length === expected && bracket.every(isPlausibleName)) {
    return [...new Set(bracket)];
  }

  // ② 読点区切り（バンダイ「A、B、C の全N種類だよ」形式）
  //    鉤括弧が列挙全体を囲んでいる場合があるので先に外してから割る
  const parts = seg
    .replace(/[「」『』]/g, "")
    .split(/[、,]/)
    .map((s) => cleanName(s))
    .filter(Boolean);
  if (parts.length >= expected) {
    const tail = parts.slice(-expected);
    if (tail.every(isPlausibleName)) return [...new Set(tail)];
  }

  // 検証を通らないものは採用しない。誤った内訳を載せるより出さない方がよい。
  return null;
}

// ── 収集元ごとの抽出 ──────────────────────────────────────────

function parseBandai(html) {
  // og:description がそのまま公式キャッチコピー
  const desc = metaContent(html, "og:description") || metaContent(html, "description");
  return {
    officialDescription: desc && desc.length >= 10 ? desc : null,
    size: null, // 仕様表にサイズの掲載が無い
    // バンダイは仕様表に内訳欄が無いが、キャッチコピー本文が読点区切りで
    // 列挙していることがある（例:「リーフィア、ドレディア、…セレビィの全5種類だよ。」）。
    // extractLineup が「全N種」との件数一致を確認するので誤抽出はしない。
    lineup: extractLineup(desc),
    ageRating: definitionValue(html, "対象年齢"),
  };
}

function parseTakaraTomy(html) {
  // 説明文・サイズ・ラインナップがすべて og:description に入っている
  const desc = metaContent(html, "og:description") || metaContent(html, "description");
  return {
    officialDescription: desc && desc.length >= 10 ? desc : null,
    size: extractSize(desc),
    lineup: extractLineup(desc),
    ageRating: null,
  };
}

function parseKitan(html) {
  // og:description は「〜の商品詳細ページです。」という定型なので使わない
  const body = firstMatch(html, /<div class="c-productDetail__text"[^>]*>([\s\S]*?)<\/div>/i);
  return {
    officialDescription: body && body.length >= 10 ? body : null,
    size: extractSize(definitionValue(html, "サイズ")),
    lineup: extractLineup(body),
    ageRating: null,
  };
}

function parseBushiroad(html) {
  // og:description は「ブシカプ！の商品情報をお届けします。」の定型なので使わない
  const body = firstMatch(html, /<div class="product__description"[^>]*>([\s\S]*?)<\/div>/i);
  return {
    officialDescription: body && body.length >= 10 ? body : null,
    size: extractSize(definitionValue(html, "サイズ")),
    lineup: extractLineup(body),
    ageRating: null,
  };
}

const PARSERS = [
  { test: (u) => /gashapon\.jp/.test(u), parse: parseBandai, name: "バンダイ" },
  { test: (u) => /takaratomy-arts\.co\.jp/.test(u), parse: parseTakaraTomy, name: "タカラトミーアーツ" },
  { test: (u) => /kitan\.jp/.test(u), parse: parseKitan, name: "キタンクラブ" },
  { test: (u) => /bushiroad-creative\.com/.test(u), parse: parseBushiroad, name: "ブシロード" },
];

export function parserFor(sourceUrl) {
  return PARSERS.find((p) => p.test(sourceUrl || "")) || null;
}

/**
 * sourceUrl の公式ページを取得して一次情報を返す。
 * 取れなかった項目は null。ネットワークエラーや未対応ドメインは null を返す
 * （収集パイプラインを止めないため、ここで例外は投げない）。
 */
export async function fetchOfficialInfo(sourceUrl) {
  const parser = parserFor(sourceUrl);
  if (!parser) return { info: null, rateLimited: false };
  try {
    const res = await fetch(sourceUrl, { headers: { "User-Agent": UA } });
    // 403/429 はレート制限・アクセス拒否。呼び出し側が即座に打ち切れるよう区別して返す。
    // これを「ただの失敗」として握り潰して叩き続けた結果、2026-08-07 に
    // gashapon.jp から恒久的にブロックされた（/schedule/ まで403になった）。
    if (res.status === 403 || res.status === 429) {
      return { info: null, rateLimited: true, status: res.status };
    }
    if (!res.ok) return { info: null, rateLimited: false, status: res.status };
    // タカラトミーアーツはメンテ中に 200 で HTML を返すことがあるため
    // content-type だけでなく中身の妥当性も後段で見る（[[upstream-image-sources]] と同じ罠）
    const ct = res.headers.get("content-type") || "";
    if (!/text\/html/i.test(ct)) return { info: null, rateLimited: false };
    return { info: parser.parse(await res.text()), rateLimited: false };
  } catch {
    return { info: null, rateLimited: false };
  }
}

// 取得元のホスト名（打ち切り判定をホスト単位で行うため）
export function hostOf(sourceUrl) {
  try {
    return new URL(sourceUrl).hostname;
  } catch {
    return "";
  }
}
