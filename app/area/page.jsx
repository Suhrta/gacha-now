import Link from "next/link";
import Footer from "../../components/Footer";
import Breadcrumb from "../../components/Breadcrumb";
import { AREAS, VERIFIED_AT, storeCount } from "../../data/areas";

export const metadata = {
  title: "エリア別ガチャガチャ専門店まとめ｜池袋・横浜・梅田 | ガチャなう",
  description: `池袋・横浜・梅田のガチャガチャ専門店を、台数・営業時間・アクセスつきでまとめています（${VERIFIED_AT.label}確認）。`,
  alternates: { canonical: "https://gacha-now.net/area" },
};

export default function AreaIndexPage() {
  return (
    <>
      <header className="bg-cream border-b-2 border-cream-border px-4 pt-4 pb-3">
        <div className="text-center mt-2">
          <h1 className="font-pixel text-[12px] text-brand-accent">エリア別ガチャガチャ専門店まとめ</h1>
        </div>
      </header>
      <main className="px-2.5 pt-3 pb-20" style={{ minHeight: "calc(100vh - 120px)" }}>
        <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: "エリア別の専門店" }]} />
        <ul className="space-y-2">
          {AREAS.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/area/${a.slug}`}
                className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-cream-border rounded-xl no-underline hover:border-brand-accent transition-colors"
              >
                <span className="text-xs font-bold text-brand-text">{a.name}のガチャガチャ専門店</span>
                <span className="text-[11px] text-brand-sub">{storeCount(a)}店</span>
                <span className="text-brand-accent text-sm ml-auto">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}
