import Link from "next/link";
import { notFound } from "next/navigation";
import posts from "../../../data/blog-posts.json";
import products from "../../../data/products.json";
import Footer from "../../../components/Footer";
import ProductThumb from "../../../components/ProductThumb";
import { isStaleBlogPost } from "../../../lib/quality";
import { rakutenSearchUrl } from "../../../lib/affiliate";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return { title: "記事が見つかりません | ガチャなう" };
  return {
    title: `${post.title}【2026年最新】| ガチャなう`,
    description: post.description,
    robots: isStaleBlogPost(post) ? { index: false, follow: true } : { index: true, follow: true },
    alternates: { canonical: `https://gacha-now.net/blog/${post.slug}` },
    openGraph: {
      type: "article",
      url: `https://gacha-now.net/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      title: `${post.title}【2026年最新】`,
      description: post.description,
    },
  };
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

function ProductCard({ id }) {
  const p = products.find((x) => x.id === id);
  if (!p) return null;
  return (
    <Link
      href={`/item/${p.id}`}
      className="flex gap-3 items-center my-4 p-3 bg-cream-dark rounded-lg border border-cream-border no-underline hover:border-brand-accent transition-colors"
    >
      {p.img && (
        <ProductThumb
          product={p}
          className="w-20 h-20 object-cover rounded-md shrink-0 bg-white"
        />
      )}
      <div className="min-w-0">
        <div className="text-sm font-bold text-brand-text leading-snug">
          {p.name}
        </div>
        <div className="text-xs text-brand-sub mt-1">
          {p.brand}・¥{p.price}{p.types ? `・全${p.types}種` : ""}
        </div>
        <div className="text-xs text-brand-accent mt-1 font-bold">
          くわしく見る →
        </div>
      </div>
    </Link>
  );
}

// 行内の **太字** と [テキスト](url) リンクをパースする
function parseInline(text, keyPrefix) {
  const nodes = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let m;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index));
    if (m[1] !== undefined) {
      const href = m[2];
      nodes.push(
        href.startsWith("/") ? (
          <Link key={`${keyPrefix}-${k}`} href={href} className="text-brand-accent font-bold no-underline hover:underline">
            {m[1]}
          </Link>
        ) : (
          <a key={`${keyPrefix}-${k}`} href={href} target="_blank" rel="noopener noreferrer" className="text-brand-accent font-bold no-underline hover:underline">
            {m[1]}
          </a>
        )
      );
    } else if (m[3] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-${k}`} className="font-bold text-brand-text">
          {m[3]}
        </strong>
      );
    }
    lastIndex = regex.lastIndex;
    k++;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length ? nodes : text;
}

// 楽天アフィリエイトの検索ボタン（広告・rel sponsored）
function RakutenButton({ keyword, label }) {
  return (
    <a
      href={rakutenSearchUrl(keyword, "blog")}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      className="flex items-center gap-2 my-3 px-4 py-3 rounded-lg border-2 no-underline"
      style={{ background: "#FFFFFF", borderColor: "#BF0000", boxShadow: "0 2px 8px rgba(191,0,0,0.1)" }}
    >
      <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded shrink-0" style={{ background: "#BF0000" }}>
        PR
      </span>
      <span className="text-sm font-bold shrink-0" style={{ color: "#BF0000" }}>🛒 {label}</span>
      <span className="text-sm shrink-0 ml-auto" style={{ color: "#BF0000" }}>→</span>
    </a>
  );
}

// 記事内画像。記法: [img:/blog/foo.png|代替テキスト] または [img:/blog/foo.png|代替テキスト|キャプション]
function ContentImage({ src, alt, caption }) {
  return (
    <figure className="my-4">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-auto rounded-xl border-2 border-cream-border bg-cream-dark"
      />
      {caption && (
        <figcaption className="mt-1.5 text-xs text-brand-sub text-center leading-relaxed">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function renderContent(content) {
  return content.split("\n").map((line, i) => {
    const productMatch = line.trim().match(/^\[product:([^\]]+)\]$/);
    if (productMatch) return <ProductCard key={i} id={productMatch[1]} />;
    const rakutenMatch = line.trim().match(/^\[rakuten:([^|\]]+)\|([^\]]+)\]$/);
    if (rakutenMatch) return <RakutenButton key={i} keyword={rakutenMatch[1].trim()} label={rakutenMatch[2].trim()} />;
    const imgMatch = line.trim().match(/^\[img:([^|\]]+)(?:\|([^|\]]*))?(?:\|([^\]]*))?\]$/);
    if (imgMatch)
      return (
        <ContentImage
          key={i}
          src={imgMatch[1].trim()}
          alt={(imgMatch[2] || "").trim()}
          caption={(imgMatch[3] || "").trim()}
        />
      );
    if (line.startsWith("### "))
      return (
        <h3
          key={i}
          className="text-lg font-bold text-brand-text mt-6 mb-2 border-b border-cream-border pb-1"
        >
          {parseInline(line.slice(4), i)}
        </h3>
      );
    if (line.startsWith("## "))
      return (
        <h2
          key={i}
          className="text-xl font-bold text-brand-text mt-8 mb-3 border-l-4 border-brand-accent pl-3"
        >
          {parseInline(line.slice(3), i)}
        </h2>
      );
    if (line.startsWith("- "))
      return (
        <li key={i} className="text-sm text-brand-text ml-4 mb-1 list-disc">
          {parseInline(line.slice(2), i)}
        </li>
      );
    if (line.trim() === "") return <br key={i} />;
    return (
      <p key={i} className="text-sm text-brand-text leading-relaxed mb-3">
        {parseInline(line, i)}
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

  const blogPostingLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    inLanguage: "ja",
    mainEntityOfPage: `https://gacha-now.net/blog/${post.slug}`,
    author: { "@type": "Organization", name: "ガチャなう", url: "https://gacha-now.net" },
    publisher: {
      "@type": "Organization",
      name: "ガチャなう",
      logo: { "@type": "ImageObject", url: "https://gacha-now.net/icons/logo-mark.png" },
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: "https://gacha-now.net" },
      { "@type": "ListItem", position: 2, name: "コラム", item: "https://gacha-now.net/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: `https://gacha-now.net/blog/${post.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
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
