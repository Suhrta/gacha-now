import Link from "next/link";
import { notFound } from "next/navigation";
import posts from "../../../data/blog-posts.json";
import Footer from "../../../components/Footer";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return { title: "記事が見つかりません | ガチャなう" };
  return {
    title: `${post.title}【2026年最新】| ガチャなう`,
    description: post.description,
    openGraph: {
      title: `${post.title}【2026年最新】`,
      description: post.description,
    },
  };
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

function renderContent(content) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("### "))
      return (
        <h3
          key={i}
          className="text-lg font-bold text-brand-text mt-6 mb-2 border-b border-cream-border pb-1"
        >
          {line.slice(4)}
        </h3>
      );
    if (line.startsWith("## "))
      return (
        <h2
          key={i}
          className="text-xl font-bold text-brand-text mt-8 mb-3 border-l-4 border-brand-accent pl-3"
        >
          {line.slice(3)}
        </h2>
      );
    if (line.startsWith("- "))
      return (
        <li key={i} className="text-sm text-brand-text ml-4 mb-1">
          {line.slice(2)}
        </li>
      );
    if (line.trim() === "") return <br key={i} />;
    return (
      <p key={i} className="text-sm text-brand-text leading-relaxed mb-3">
        {line}
      </p>
    );
  });
}

export default function BlogDetailPage({ params }) {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  const related = posts
    .filter((p) => p.slug !== post.slug)
    .slice(0, 3);

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
          <Link href="/blog" className="text-brand-sub no-underline">
            コラム
          </Link>
          <span className="mx-1">/</span>
          <span>{post.title}</span>
        </nav>

        <article>
          <h1 className="text-2xl font-bold text-brand-text mb-2">
            {post.title}
          </h1>
          <div className="text-xs text-brand-sub mb-6">
            {formatDate(post.publishedAt)}
          </div>

          <div className="bg-white rounded-xl border border-cream-border p-5">
            {renderContent(post.content)}
          </div>
        </article>

        {related.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-bold text-brand-text mb-3 border-l-4 border-brand-accent pl-3">
              関連記事
            </h2>
            <div className="flex flex-col gap-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="block p-3 bg-white rounded-lg border border-cream-border no-underline"
                >
                  <div className="text-xs text-brand-sub mb-1">
                    {formatDate(r.publishedAt)}
                  </div>
                  <div className="text-sm font-bold text-brand-text">
                    {r.title}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="text-center mt-8 flex flex-col gap-3 items-center">
          <Link
            href="/blog"
            className="text-sm text-brand-sub no-underline"
          >
            ← コラム一覧
          </Link>
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
