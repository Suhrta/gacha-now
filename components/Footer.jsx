"use client";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 text-center"
      style={{ background: "linear-gradient(0deg, #FFF8F0 60%, transparent)", padding: "20px 12px 10px" }}>
      <div className="flex justify-center gap-4 mb-1.5">
        <Link href="/about" className="font-pixel text-[5px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
          About
        </Link>
        <Link href="/privacy" className="font-pixel text-[5px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
          プライバシーポリシー
        </Link>
      </div>
      <div className="font-pixel text-[5px] text-brand-sub tracking-[0.5px]">
        © 2026 ガチャなう ── Amazonアソシエイト参加中
      </div>
    </footer>
  );
}
