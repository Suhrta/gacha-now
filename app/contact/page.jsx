import Link from "next/link";
import ContactForm from "../../components/ContactForm";

export const metadata = {
  title: "お問い合わせ | ガチャなう",
  description:
    "カプセルトイ新作情報サイト「ガチャなう」へのお問い合わせページです。掲載内容の修正・削除、情報提供、不具合のご報告などはこちらからご連絡ください。",
  alternates: { canonical: "https://gacha-now.net/contact" },
};

export default function ContactPage() {
  return (
    <div className="px-4 py-6 max-w-[380px] mx-auto">
      <Link
        href="/"
        className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors"
      >
        ← トップにもどる
      </Link>

      <div className="mt-6 text-center">
        <div className="font-pixel text-[14px] text-brand-accent">✉ お問い合わせ</div>
        <div className="font-pixel text-[10px] text-brand-sub mt-2 tracking-[1px]">
          ごいけん・ごようぼう おまちしています
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <section
          className="bg-white rounded-xl border-2 border-cream-border p-4"
          style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
        >
          <p className="font-pixel text-[10px] text-brand-text leading-[2.4]">
            「ガチャなう」をご覧いただきありがとうございます。掲載内容の修正・削除のお願い、新作情報のご提供、
            サイトの不具合のご報告など、お気軽に下記フォームよりご連絡ください。
            いただいたお問い合わせには、内容を確認のうえ順次対応いたします。
          </p>
        </section>

        <section
          className="bg-white rounded-xl border-2 border-cream-border p-4"
          style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
        >
          <h2 className="font-pixel text-[12px] text-brand-accent mb-4 pb-2 border-b-2 border-dashed border-cream-border">
            ▶ おといあわせフォーム
          </h2>
          <ContactForm />
        </section>

        <section
          className="bg-white rounded-xl border-2 border-cream-border p-4"
          style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
        >
          <h2 className="font-pixel text-[12px] text-brand-accent mb-3 pb-2 border-b-2 border-dashed border-cream-border">
            ▶ 画像・著作権について
          </h2>
          <p className="font-pixel text-[10px] text-brand-text leading-[2.4]">
            当サイトに掲載している商品画像・名称等の著作権は各権利者に帰属します。掲載に問題がある場合は、
            お問い合わせフォームよりご連絡いただければ、確認のうえ迅速に対応いたします。詳しくは
            <Link href="/privacy" className="text-brand-accent no-underline">
              プライバシーポリシー
            </Link>
            をご覧ください。
          </p>
        </section>
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
