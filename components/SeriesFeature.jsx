import Link from "next/link";

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

// シリーズ特設ページの読み物ブロック。series.feature（任意）がある時だけ表示。
export default function SeriesFeature({ sections }) {
  if (!sections || sections.length === 0) return null;

  return (
    <div className="relative z-[1] mb-6 space-y-4">
      {sections.map((s, i) => (
        <section
          key={i}
          className="bg-white rounded-xl border-2 border-cream-border p-4"
          style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
        >
          <h2 className="text-sm font-bold text-brand-text mb-2 border-l-4 border-brand-accent pl-3">
            {s.h}
          </h2>
          {s.body && (
            <p className="text-xs text-brand-text leading-relaxed">{parseInline(s.body, i)}</p>
          )}
          {s.list && (
            <ul className="mt-2 space-y-1.5">
              {s.list.map((li, j) => (
                <li key={j} className="text-xs text-brand-text leading-relaxed flex gap-2">
                  <span className="text-brand-accent shrink-0">▸</span>
                  <span>{parseInline(li, `${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
