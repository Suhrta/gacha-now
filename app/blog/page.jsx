import Link from "next/link";
import posts from "../../data/blog-posts.json";
import Footer from "../../components/Footer";

export const metadata = {
  title: "ガチャコラム｜カプセルトイの最新情報・おすすめまとめ【2026年】| ガチャなう",
  description:
    "ガチャガチャ・カプセルトイの最新情報、おすすめまとめ、ブランド特集など。毎日更新のガチャ情報コラム。",
};

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${y}.${m}.${d}`;
}

export default function BlogIndexPage() {
  const sorted = [...posts].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt)
  );

  return (
    <>
      <header className="bg-white border-b border-cream-border px-4 py-3">
        <div className="max-w-site mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 no-underline shrink-0"
          >
            <img
              src="/icons/logo-mark.png"
              alt="ガチャなう"
              className="w-8 h-8"
            />
            <span className="font-bold text-xl text-brand-text">ガチャなう</span>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <nav className="text-xs text-brand-sub mb-3">
          <Link href="/" className="text-brand-sub no-underline">
            トップ
          </Link>
          <span className="mx-1">/</span>
          <span>コラム</span>
        </nav>

        <h1 className="text-2xl font-bold text-brand-text mb-2">ガチャコラム</h1>
        <p className="text-sm text-brand-sub mb-6">
          カプセルトイの最新情報やおすすめまとめをお届けします。
        </p>

        {sorted.length === 0 ? (
          <p className="text-center text-brand-sub py-10">
            まだ記事がありません。
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="block p-4 bg-white rounded-xl border border-cream-border no-underline hover:shadow-md transition-shadow"
              >
                <div className="text-xs text-brand-sub mb-1">
                  {formatDate(post.publishedAt)}
                </div>
                <div className="text-base font-bold text-brand-text mb-1">
                  {post.title}
                </div>
                <div className="text-sm text-brand-sub line-clamp-2">
                  {post.description}
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-brand-accent text-white rounded-xl no-underline font-bold text-sm"
          >
            ガチャ一覧に戻る
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
