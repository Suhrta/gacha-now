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

export default function CharacterPage() {
  const { slug } = useParams();
  const [selected, setSelected] = useState(null);

  const character = getCharacterBySlug(slug);
  const items = character ? filterProductsByCharacter(products, character) : [];
  const name = character ? character.name : decodeURIComponent(slug);
  const intro = character ? getCharacterIntro(character.slug) : null;
  const others = CHARACTERS.filter((c) => c.slug !== slug);

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
      </main>

      <Footer />

      {selected && <ReceiptPaper product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
