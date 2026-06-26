"use client";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="sticky bottom-0 z-40 bg-gray-50 border-t border-cream-border mt-8 py-3">
      <div className="max-w-site mx-auto px-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <img src="/icons/logo-mark.png" alt="" className="w-5 h-5" />
          <span className="text-sm font-bold text-brand-text">ガチャなう</span>
          <span className="text-[10px] text-brand-sub">© 2026 Gacha Now · Amazonアソシエイト参加中</span>
        </div>
        <nav className="flex items-center gap-x-4 gap-y-1 flex-wrap shrink-0">
          {[
            { href: "/about", label: "このサイトについて" },
            { href: "/operator", label: "運営者情報" },
            { href: "/contact", label: "お問い合わせ" },
            { href: "/privacy", label: "プライバシーポリシー" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs text-brand-sub hover:text-brand-text transition-colors no-underline"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
