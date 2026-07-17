import Link from "next/link";

export const metadata = {
  title: "運営者情報 | ガチャなう",
  description:
    "カプセルトイ新作情報サイト「ガチャなう」の運営者情報・運営方針・情報の出典についてご案内します。",
  alternates: { canonical: "https://gacha-now.net/operator" },
};

// ── E-E-A-T 強化メモ ───────────────────────────────────────────
// 信頼性をさらに高めるには、下記「運営者」欄に実際の運営者名（ハンドルネーム可）や
// SNSアカウント、運営開始時期を追記すると効果的です。
// ────────────────────────────────────────────────────────────

const rows = [
  { label: "サイト名", value: "ガチャなう（gacha-now）" },
  { label: "URL", value: "https://gacha-now.net" },
  { label: "運営者", value: "ガチャなう（個人運営）" },
  { label: "運営目的", value: "カプセルトイ（ガチャガチャ）の新作情報を、発売日・価格・ブランド別に探しやすくまとめて届けること" },
  { label: "お問い合わせ", value: "info@gacha-now.com（お問い合わせページからも受付）" },
];

const sections = [
  {
    title: "サイトについて",
    body: "「ガチャなう」は、サンリオ・ちいかわ・ポケモンをはじめとする人気キャラクターのカプセルトイ新作情報を、レトロかわいいピクセルアート風のUIでまとめて紹介する個人運営の情報サイトです。「どんな新作が、いつ、いくらで出るのか」を一目で把握できることを目指しています。",
  },
  {
    title: "情報の出典・更新方針",
    body: "掲載している商品情報は、バンダイ（ガシャポン）、タカラトミーアーツ、キタンクラブなど各メーカーの公式サイトで公開されている情報をもとに、ブランド・キャラクター・発売月ごとに整理して掲載しています。新作情報は定期的に更新していますが、価格・発売日・ラインナップ・在庫状況は変更される場合があります。最新かつ正確な情報は、必ず各メーカー・販売店の公式サイトをご確認ください。",
  },
  {
    title: "広告・アフィリエイトについて",
    body: "当サイトは、楽天アフィリエイト・Amazonアソシエイト等のアフィリエイトプログラム、および第三者配信の広告サービスを利用しています。商品リンクの一部には広告（アフィリエイトリンク）が含まれますが、商品の価格や評価には一切影響しません。Amazonのアソシエイトとして、ガチャなうは適格販売により収入を得ています。詳しくはプライバシーポリシーをご覧ください。",
  },
  {
    title: "免責事項",
    body: "当サイトの情報の正確性には万全を期していますが、内容を保証するものではありません。当サイトの情報を利用して生じたいかなる損害についても、一切の責任を負いかねます。商品の購入・取引は、必ず各メーカー・販売店の公式情報をご確認のうえ、ご自身の判断で行ってください。",
  },
];

export default function OperatorPage() {
  return (
    <div className="px-4 py-6 max-w-[380px] mx-auto">
      <Link
        href="/"
        className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors"
      >
        ← トップにもどる
      </Link>

      <div className="mt-6 text-center">
        <div className="font-pixel text-[14px] text-brand-accent">🏪 運営者情報</div>
        <div className="font-pixel text-[10px] text-brand-sub mt-2 tracking-[1px]">
          うんえいしゃ じょうほう
        </div>
      </div>

      <section
        className="mt-8 bg-white rounded-xl border-2 border-cream-border p-4"
        style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
      >
        <h2 className="font-pixel text-[12px] text-brand-accent mb-3 pb-2 border-b-2 border-dashed border-cream-border">
          ▶ 基本情報
        </h2>
        <dl className="space-y-0">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex flex-col py-2 border-b border-dotted border-cream-border last:border-0"
            >
              <dt className="font-pixel text-[9px] text-brand-sub">{r.label}</dt>
              <dd className="font-pixel text-[10px] text-brand-text leading-[2.2] mt-0.5">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-6 space-y-4">
        {sections.map((s) => (
          <section
            key={s.title}
            className="bg-white rounded-xl border-2 border-cream-border p-4"
            style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
          >
            <h2 className="font-pixel text-[11px] text-brand-accent mb-2 pb-1.5 border-b-2 border-dashed border-cream-border">
              ▶ {s.title}
            </h2>
            <p className="font-pixel text-[10px] text-brand-text leading-[2.4]">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2 items-center">
        <Link href="/contact" className="font-pixel text-[10px] text-brand-accent no-underline">
          → お問い合わせはこちら
        </Link>
        <Link href="/privacy" className="font-pixel text-[10px] text-brand-accent no-underline">
          → プライバシーポリシー
        </Link>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-brand-accent text-white font-pixel text-[11px] rounded-lg no-underline"
          style={{ boxShadow: "0 3px 0 #C5534D, 0 4px 12px #E8756D33" }}
        >
          ← トップにもどる
        </Link>
      </div>
    </div>
  );
}
