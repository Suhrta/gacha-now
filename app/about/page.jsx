import Link from "next/link";

export const metadata = {
  title: "ガチャなうについて | ガチャなう",
  description: "カプセルトイ新作情報サイト「ガチャなう」の紹介ページです。",
};

export default function AboutPage() {
  return (
    <div className="px-4 py-6 max-w-[380px] mx-auto">
      <Link href="/" className="font-pixel text-[7px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
        ← トップにもどる
      </Link>

      <div className="mt-6 text-center">
        <div className="font-pixel text-[14px] text-brand-accent animate-float">🏪 ガチャなう</div>
        <div className="font-pixel text-[6px] text-brand-sub mt-2 tracking-[1px]">
          しんさく カプセルトイ じょうほう サイト
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <section className="bg-white rounded-xl border-2 border-cream-border p-4" style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}>
          <h2 className="font-pixel text-[9px] text-brand-accent mb-3 pb-2 border-b-2 border-dashed border-cream-border">
            ▶ ガチャなう って？
          </h2>
          <p className="font-pixel text-[7px] text-brand-text leading-[2.4]">
            「ガチャなう」は、カプセルトイ（ガチャガチャ）の新作情報をまとめたサイトです。
            サンリオ、ちいかわ、ポケモンなど人気ブランドの最新ガチャ情報をレトロかわいいピクセルアート風のUIでお届けします。
          </p>
        </section>

        <section className="bg-white rounded-xl border-2 border-cream-border p-4" style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}>
          <h2 className="font-pixel text-[9px] text-brand-accent mb-3 pb-2 border-b-2 border-dashed border-cream-border">
            ▶ つかいかた
          </h2>
          <div className="space-y-3">
            {[
              { icon: "🏪", text: "トップページでガチャマシンをタップすると、商品の詳細が見られます" },
              { icon: "🔍", text: "フィルタータブでブランド別に絞り込みができます" },
              { icon: "🔥", text: "HOTマークは今注目の商品です" },
              { icon: "🔗", text: "「くわしく みる」ボタンから関連グッズをチェックできます" },
            ].map((item, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-base shrink-0">{item.icon}</span>
                <p className="font-pixel text-[6px] text-brand-text leading-[2.2]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border-2 border-cream-border p-4" style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}>
          <h2 className="font-pixel text-[9px] text-brand-accent mb-3 pb-2 border-b-2 border-dashed border-cream-border">
            ▶ おといあわせ
          </h2>
          <p className="font-pixel text-[7px] text-brand-text leading-[2.4]">
            ご意見・ご要望・掲載に関するお問い合わせは、Instagram DM または以下のメールアドレスまでお願いします。
          </p>
          <div className="mt-2 font-pixel text-[7px] text-brand-accent">
            📧 info@gacha-now.com
          </div>
        </section>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="inline-block px-6 py-3 bg-brand-accent text-white font-pixel text-[8px] rounded-lg no-underline"
          style={{ boxShadow: "0 3px 0 #C5534D, 0 4px 12px #E8756D33" }}>
          ← トップにもどる
        </Link>
      </div>
    </div>
  );
}
