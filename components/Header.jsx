"use client";
import { useState } from "react";
import Link from "next/link";

export default function Header({ onSearchClick, onFavoritesClick, onNewClick }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSearch = () => {
    setDrawerOpen(false);
    onSearchClick?.();
  };
  const handleFavorites = () => {
    setDrawerOpen(false);
    onFavoritesClick?.();
  };
  const handleNew = () => {
    setDrawerOpen(false);
    onNewClick?.();
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-cream-border">
      <div className="max-w-site mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* 左: ロゴ */}
        <Link href="/" className="flex items-center no-underline shrink-0" aria-label="ガチャなう">
          <img src="/icons/logo-full.png" alt="ガチャなう" className="h-11 md:h-12 w-auto" />
        </Link>

        {/* 中央: PCナビ */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={handleNew}
            className="text-sm text-brand-sub hover:text-brand-text transition-colors bg-transparent border-none cursor-pointer p-0"
          >
            新作
          </button>
          <Link
            href="/blog"
            className="text-sm text-brand-sub hover:text-brand-text transition-colors no-underline"
          >
            ブログ
          </Link>
          <Link
            href="/about"
            className="text-sm text-brand-sub hover:text-brand-text transition-colors no-underline"
          >
            About
          </Link>
        </nav>

        {/* 右: アクション */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSearch}
            aria-label="検索"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-cream-dark transition-colors cursor-pointer bg-transparent border-none"
          >
            <span className="text-base">🔍</span>
          </button>
          <button
            onClick={handleFavorites}
            className="hidden md:inline-flex items-center gap-1 text-sm text-brand-sub hover:text-brand-text transition-colors cursor-pointer bg-transparent border-none px-1"
          >
            <span>♡</span>
            <span>お気に入り</span>
          </button>
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label="メニュー"
            className="md:hidden w-9 h-9 rounded-full flex items-center justify-center hover:bg-cream-dark transition-colors cursor-pointer bg-transparent border-none"
          >
            <span className="text-lg">{drawerOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {/* モバイルドロワー */}
      {drawerOpen && (
        <div className="md:hidden border-t border-cream-border bg-white">
          <div className="px-4 py-3 flex flex-col gap-3">
            <button
              onClick={handleNew}
              className="text-left text-sm text-brand-text bg-transparent border-none p-0 py-1 cursor-pointer"
            >
              新作
            </button>
            <Link
              href="/blog"
              className="text-sm text-brand-text no-underline py-1"
              onClick={() => setDrawerOpen(false)}
            >
              ブログ
            </Link>
            <Link
              href="/about"
              className="text-sm text-brand-text no-underline py-1"
              onClick={() => setDrawerOpen(false)}
            >
              About
            </Link>
            <button
              onClick={handleFavorites}
              className="text-left text-sm text-brand-text bg-transparent border-none p-0 py-1 cursor-pointer"
            >
              ♡ お気に入り
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
