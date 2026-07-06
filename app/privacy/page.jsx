import Link from "next/link";

export const metadata = {
  title: "プライバシーポリシー | ガチャなう",
  description: "ガチャなうのプライバシーポリシーです。",
};

const sections = [
  {
    title: "運営者情報",
    body: "本サイト「ガチャなう」（以下「当サイト」）は個人が運営するカプセルトイ情報サイトです。",
  },
  {
    title: "広告について",
    body: "当サイトは、楽天アフィリエイトをはじめとするアフィリエイトプログラムに参加しています。当サイトの商品リンクにはアフィリエイトリンク（広告）が含まれます。「PR」「広告」と表記されたリンクを経由して商品を購入された場合、当サイトに紹介料が支払われることがあります。商品の価格や評価には一切影響しません。",
  },
  {
    title: "アクセス解析ツールについて",
    body: "当サイトでは、Googleによるアクセス解析ツール「Googleアナリティクス」を利用しています。このGoogleアナリティクスはトラフィックデータの収集のためにCookieを使用しています。このトラフィックデータは匿名で収集されており、個人を特定するものではありません。この機能はCookieを無効にすることで収集を拒否することができますので、お使いのブラウザの設定をご確認ください。この規約に関しての詳細はGoogle アナリティクス利用規約をご確認ください。",
  },
  {
    title: "Cookieについて",
    body: "当サイトでは、一部のコンテンツについてCookieを利用しています。Cookieとは、サイトにアクセスした際にブラウザに保存される情報ですが、お名前やメールアドレス等の個人情報は含まれません。ブラウザの設定により、Cookieを無効にすることも可能です。",
  },
  {
    title: "個人情報の取り扱いについて",
    body: "当サイトでは、お問い合わせの際に、お名前・メールアドレス等の個人情報をご登録いただく場合があります。これらの個人情報は、質問に対する回答や必要な情報をご連絡するために利用し、それ以外の目的では利用いたしません。",
  },
  {
    title: "免責事項",
    body: "当サイトに掲載されている情報の正確性には万全を期していますが、その内容について保証するものではありません。当サイトの情報を利用することで生じた損害等について、一切の責任を負いかねますのでご了承ください。商品の最新情報、価格、在庫状況は各メーカー・販売元の公式サイトをご確認ください。",
  },
  {
    title: "著作権について",
    body: "当サイトで掲載している画像や文章等の著作権は、各権利所有者に帰属します。万が一、問題がある場合はお問い合わせよりご連絡ください。迅速に対応いたします。",
  },
  {
    title: "プライバシーポリシーの変更について",
    body: "当サイトは、個人情報に関して適用される日本の法令を遵守するとともに、本ポリシーの内容を適宜見直し、改善に努めます。修正された最新のプライバシーポリシーは常に本ページにて開示されます。",
  },
];

export default function PrivacyPage() {
  return (
    <div className="px-4 py-6 max-w-[380px] mx-auto">
      <Link href="/" className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
        ← トップにもどる
      </Link>

      <div className="mt-6 text-center">
        <div className="font-pixel text-[10px] text-brand-accent">📋 プライバシーポリシー</div>
        <div className="font-pixel text-[10px] text-brand-sub mt-2">
          最終更新日: 2026年3月1日
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {sections.map((s, i) => (
          <section key={i} className="bg-white rounded-xl border-2 border-cream-border p-4"
            style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}>
            <h2 className="font-pixel text-[11px] text-brand-accent mb-2 pb-1.5 border-b-2 border-dashed border-cream-border">
              {i + 1}. {s.title}
            </h2>
            <p className="font-pixel text-[10px] text-brand-text leading-[2.4]">
              {s.body}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="inline-block px-6 py-3 bg-brand-accent text-white font-pixel text-[11px] rounded-lg no-underline"
          style={{ boxShadow: "0 3px 0 #C5534D, 0 4px 12px #E8756D33" }}>
          ← トップにもどる
        </Link>
      </div>
    </div>
  );
}
