import Link from "next/link";

export const metadata = {
  title: "ページが見つかりません | ガチャなう",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="text-center py-24 px-4">
      <div className="text-5xl mb-4">🎪</div>
      <div className="font-pixel text-[12px] text-brand-text mb-2">404</div>
      <p className="text-sm text-brand-sub leading-relaxed mb-6">
        お探しのページは見つかりませんでした。
        <br />
        販売が終了した商品かもしれません。
      </p>
      <Link
        href="/"
        className="inline-block px-5 py-2.5 bg-brand-accent text-white rounded-full text-sm font-bold no-underline hover:opacity-90 transition-opacity"
      >
        トップへもどる
      </Link>
    </div>
  );
}
