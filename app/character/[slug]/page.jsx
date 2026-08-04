"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import GachaMachine from "../../../components/GachaMachine";
import ReceiptPaper from "../../../components/ReceiptPaper";
import Footer from "../../../components/Footer";
import Breadcrumb from "../../../components/Breadcrumb";
import products from "../../../data/products.json";
import { CHARACTERS, getCharacterBySlug, filterProductsByCharacter } from "../../../data/characters";
import { getCharacterIntro } from "../../../data/character-intros";
import CharacterInfo from "../../../components/CharacterInfo";
import CharacterAffiliateCTA from "../../../components/CharacterAffiliateCTA";
import NewArrivalsSection from "../../../components/NewArrivalsSection";
import PopularNowSection from "../../../components/PopularNowSection";
import { getAllReleaseMonths, formatYearMonth } from "../../../lib/release";
import { SERIES, filterProductsBySeries } from "../../../data/series";

export default function CharacterPage() {
  const { slug } = useParams();
  const [selected, setSelected] = useState(null);

  const character = getCharacterBySlug(slug);
  const items = character ? filterProductsByCharacter(products, character) : [];
  const name = character ? character.name : decodeURIComponent(slug);
  const intro = character ? getCharacterIntro(character.slug) : null;
  const others = CHARACTERS.filter((c) => c.slug !== slug);
  const ownIds = items.map((p) => p.id);
  const releaseMonths = getAllReleaseMonths(products);

  // このキャラの掲載商品が実際に属している横断シリーズだけを出す。
  // 例: たまごっちは「めじるしアクセサリー」「ライトマスコット」に該当する。
  // シリーズ特集は単体で流入が取れており（/series/mejirushi は週46クリック）、
  // キャラ→シリーズの相互リンクを張ることで両方の内部リンクを増やす。
  const relatedSeries = SERIES.map((s) => ({
    ...s,
    hits: filterProductsBySeries(items, s).length,
    total: filterProductsBySeries(products, s).length,
  })).filter((s) => s.hits > 0);

  return (
    <>
      <header className="bg-cream border-b-2 border-cream-border px-4 pt-4 pb-3">
        <Link href="/" className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors">
          ← トップにもどる
        </Link>
        <div className="text-center mt-2">
          <h1 className="animate-float">
            <span className="block font-pixel text-[12px] text-brand-accent">{name}</span>
            <span className="block font-pixel text-[10px] text-brand-sub mt-1">
              のガチャガチャ 新作・最新情報
            </span>
          </h1>
        </div>
      </header>

      <main className="px-2.5 pt-3 pb-20 relative" style={{ minHeight: "calc(100vh - 120px)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-50"
          style={{ backgroundImage: "radial-gradient(circle, #F0E6D6 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <Breadcrumb items={[{ name: "ホーム", href: "/" }, { name: `${name}のガチャ` }]} />

        <CharacterInfo name={name} items={items} intro={intro} />

        {character && items.length > 0 && <CharacterAffiliateCTA name={name} />}

        <div className="font-pixel text-[10px] text-brand-sub mb-2.5 px-1 relative">
          {items.length}けん
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 relative z-[1]">
          {items.map((p, i) => (
            <GachaMachine key={p.id} product={p} index={i} onClick={setSelected} />
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-10 text-brand-sub font-pixel text-[11px] leading-[2.2]">
            😢<br />このキャラクターの<br />しんさくは まだ ないよ
          </div>
        )}

        {relatedSeries.length > 0 && (
          <section className="mt-10 px-1 relative z-[1]">
            <h2 className="text-sm font-bold text-brand-text mb-3 border-l-4 border-brand-accent pl-3">
              {name}が登場するシリーズ
            </h2>
            <div className="space-y-2">
              {relatedSeries.map((s) => (
                <Link
                  key={s.slug}
                  href={`/series/${s.slug}`}
                  className="block bg-white border border-cream-border rounded-lg p-3 no-underline hover:border-brand-accent transition-colors"
                >
                  <span className="block text-xs font-bold text-brand-text">
                    {s.name}（{name} {s.hits}件 / 全{s.total}件）
                  </span>
                  <span className="block text-[11px] text-brand-sub leading-relaxed mt-1">
                    {s.intro}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* brand ページは 7/28 にこの2セクションを入れて順位・CTRが伸びた（pokemon 3.4%→5.7%）が、
            character ページは同じ構成のまま置き去りになっていた。
            GSC実測（7/26〜8/1）では /brand/pokemon が掲載順位7.8なのに対し、
            同じ内容の /character/tamagotchi は1,624表示・CTR1.0%・掲載順位10.6で2ページ目に留まる。
            たまごっちは brand ではなく character 側が検索結果に採用されているため、
            ここを brand と同じ厚みに揃えないと伸びない */}
        <PopularNowSection excludeIds={ownIds} limit={6} gridClass="grid-cols-2 md:grid-cols-3 lg:grid-cols-6" />

        <NewArrivalsSection excludeIds={ownIds} />

        <section className="mt-10 px-1 relative z-[1]">
          <h2 className="text-sm font-bold text-brand-text mb-3">ほかのキャラから探す</h2>
          <div className="flex flex-wrap gap-2">
            {others.map((c) => (
              <Link
                key={c.slug}
                href={`/character/${c.slug}`}
                className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
              >
                #{c.name}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 px-1 relative z-[1]">
          <h2 className="text-sm font-bold text-brand-text mb-3">発売月から探す</h2>
          <div className="flex flex-wrap gap-2">
            {releaseMonths.map((m) => (
              <Link
                key={m}
                href={`/release/${m}`}
                className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
              >
                📅 {formatYearMonth(m)}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      {selected && <ReceiptPaper product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
