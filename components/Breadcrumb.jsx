import Link from "next/link";

// items: [{ name, href? }] ── 最後の要素（現在地）は href なし
export default function Breadcrumb({ items }) {
  return (
    <nav
      aria-label="パンくずリスト"
      className="text-[11px] text-brand-sub mb-3 px-1 relative z-[1] flex flex-wrap items-center gap-1"
    >
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-cream-border">›</span>}
          {it.href ? (
            <Link
              href={it.href}
              className="no-underline hover:text-brand-accent transition-colors"
            >
              {it.name}
            </Link>
          ) : (
            <span className="text-brand-text font-medium" aria-current="page">
              {it.name}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
