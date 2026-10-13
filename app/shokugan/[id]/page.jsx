import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "../../../components/Footer";
import Breadcrumb from "../../../components/Breadcrumb";
import shokugan from "../../../data/shokugan.json";
import products from "../../../data/products.json";
import { rakutenSearchUrl } from "../../../lib/affiliate";
import {
  isPublishable,
  isReleased,
  releaseLabel,
  priceLabel,
  shortPriceLabel,
  relatedGacha,
  byReleaseAsc,
} from "../../../lib/shokugan";
import { DATA_UPDATED } from "../../../lib/site-meta";

const items = shokugan.filter(isPublishable);

export function generateStaticParams() {
  return items.map((i) => ({ id: i.id }));
}

// 掲載条件を満たさないIDは本物の404を返す（200の「みつかりません」はソフト404になる）。
export const dynamicParams = false;

function load(id) {
  return items.find((i) => i.id === id) || null;
}

export function generateMetadata({ params }) {
  const item = load(params.id);
  if (!item) return { title: "商品が見つかりません | ガチャなう" };

  const released = isReleased(item);
  const tag = released ? "発売中" : releaseLabel(item);
  const priceText = shortPriceLabel(item) || "";
  const lead = item.description ? item.description.slice(0, 80) : "";

  return {
    title: `${item.name}｜${priceText}【${tag}】食玩 | ガチャなう`,
    description: `${lead}${priceText ? `${priceText}／` : ""}${releaseLabel(item)}。通販の在庫・BOX（箱買い）もチェックできます。`,
    alternates: { canonical: `https://gacha-now.net/shokugan/${item.id}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${item.name}｜${priceText}【${tag}】`,
      description: `バンダイの食玩「${item.name}」${priceText}。${releaseLabel(item)}。`,
      images: item.rakutenImage ? [item.rakutenImage] : [],
    },
  };
}

export default function ShokuganItemPage({ params }) {
  const item = load(params.id);
  if (!item) notFound();

  const released = isReleased(item);
  const related = relatedGacha(item, products);
  const alsoShokugan = items
    .filter((i) => i.id !== item.id && i.releaseYm === item.releaseYm)
    .sort(byReleaseAsc)
    .slice(0, 6);

  // 構造化データ。価格は公式の表示価格（事実）をそのまま使う。
  // availability は発売日で出し分ける（ガチャ側で発売前を InStock と申告していた
  // 不具合があったため、ここは最初から正しく出す）。
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    ...(item.rakutenImage ? { image: [item.rakutenImage] } : {}),
    ...(item.description ? { description: item.description } : {}),
    brand: { "@type": "Brand", name: "バンダイ" },
    // 構造化データの price は総額（税込）を申告する。税抜を出すと
    // 検索結果に表示される金額が実際の支払額と食い違う。
    ...(typeof (item.priceTaxIn ?? item.price) === "number"
      ? {
          offers: {
            "@type": "Offer",
            price: item.priceTaxIn ?? item.price,
            priceCurrency: "JPY",
            availability: released
              ? "https://schema.org/InStock"
              : "https://schema.org/PreOrder",
            url: `https://gacha-now.net/shokugan/${item.id}`,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />

      <header className="bg-cream border-b-2 border-cream-border px-4 pt-4 pb-3">
        <Link
          href="/shokugan"
          className="font-pixel text-[10px] text-brand-sub no-underline hover:text-brand-accent transition-colors"
        >
          ← 食玩の一覧にもどる
        </Link>
      </header>

      <main className="px-2.5 pt-3 pb-20 relative" style={{ minHeight: "calc(100vh - 120px)" }}>
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: "radial-gradient(circle, #F0E6D6 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <Breadcrumb
          items={[
            { name: "ホーム", href: "/" },
            { name: "食玩", href: "/shokugan" },
            ...(item.releaseYm
              ? [{ name: `${item.releaseYm.replace("-", "年")}月`, href: `/shokugan/release/${item.releaseYm}` }]
              : []),
            { name: item.name },
          ]}
        />

        <article
          className="relative z-[1] mb-5 bg-white rounded-xl border-2 border-cream-border p-4"
          style={{ boxShadow: "0 4px 16px rgba(74,55,40,0.06)" }}
        >
          <h1 className="text-base font-bold text-brand-text leading-snug mb-3">{item.name}</h1>

          {item.rakutenImage && (
            <img
              src={item.rakutenImage}
              alt={item.name}
              width={400}
              height={400}
              decoding="async"
              className="w-full max-w-xs mx-auto aspect-square object-contain rounded-md bg-cream-dark mb-3"
            />
          )}

          <dl className="grid grid-cols-2 gap-x-3 gap-y-0 mb-3">
            {priceLabel(item) && (
              <div className="flex flex-col py-1.5 border-b border-dotted border-cream-border">
                <dt className="text-[10px] text-brand-sub">価格</dt>
                <dd className="text-xs font-bold text-brand-text mt-0.5">{priceLabel(item)}</dd>
              </div>
            )}
            <div className="flex flex-col py-1.5 border-b border-dotted border-cream-border">
              <dt className="text-[10px] text-brand-sub">
                {item.releaseKind === "ship" ? "発送時期" : "発売日"}
              </dt>
              <dd className="text-xs font-bold text-brand-text mt-0.5">{releaseLabel(item)}</dd>
            </div>
            <div className="flex flex-col py-1.5 border-b border-dotted border-cream-border">
              <dt className="text-[10px] text-brand-sub">メーカー</dt>
              <dd className="text-xs font-bold text-brand-text mt-0.5">バンダイ</dd>
            </div>
            <div className="flex flex-col py-1.5 border-b border-dotted border-cream-border">
              <dt className="text-[10px] text-brand-sub">販売形態</dt>
              <dd className="text-xs font-bold text-brand-text mt-0.5">
                {item.releaseKind === "ship" ? "通販限定" : "店頭販売"}
              </dd>
            </div>
          </dl>

          {item.description && (
            <p className="text-xs text-brand-text leading-relaxed">{item.description}</p>
          )}

          {/* 公式ページへの導線。説明文は当サイトで書き起こしているので、
              一次情報を確認したい人が辿れるようにしておく。 */}
          {item.officialUrl && (
            <p className="text-[10px] text-brand-sub mt-3">
              メーカー公式の商品情報:{" "}
              <a
                href={item.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-accent no-underline"
              >
                バンダイ キャンディ公式サイト
              </a>
            </p>
          )}
        </article>

        {/* 購入導線。BOX（箱買い）を先に出す。食玩はまとめ買いの需要が大きく、
            楽天側の実在件数が MIN_HITS を超えたものだけ出している。 */}
        {item.jan && (
          <section className="relative z-[1] mb-5">
            <h2 className="text-sm font-bold text-brand-text mb-2 px-1">通販で探す</h2>
            <div className="flex flex-col gap-2">
              {item.rakutenBoxCount && (
                <a
                  href={rakutenSearchUrl(`${item.jan} BOX`, "item_compset")}
                  target="_blank"
                  rel="nofollow sponsored noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-brand-accent rounded-xl no-underline hover:bg-cream-dark transition-colors"
                >
                  <span className="text-lg shrink-0">📦</span>
                  <span className="text-xs font-bold text-brand-text leading-snug">
                    BOX（箱買い）を楽天で探す
                    <span className="text-brand-sub font-normal ml-1">{item.rakutenBoxCount}件</span>
                  </span>
                  <span className="text-brand-accent text-sm shrink-0 ml-auto">→</span>
                </a>
              )}
              <a
                href={rakutenSearchUrl(item.jan, "item_preorder")}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-cream-border rounded-xl no-underline hover:border-brand-accent transition-colors"
              >
                <span className="text-lg shrink-0">🔍</span>
                <span className="text-xs font-bold text-brand-text leading-snug">
                  単品を楽天で探す
                  {item.rakutenCount ? (
                    <span className="text-brand-sub font-normal ml-1">{item.rakutenCount}件</span>
                  ) : null}
                </span>
                <span className="text-brand-accent text-sm shrink-0 ml-auto">→</span>
              </a>
            </div>
            <p className="text-[10px] text-brand-sub mt-2 px-1">
              ※ 当サイトはアフィリエイトプログラムに参加しています。価格・在庫は楽天市場でご確認ください。
            </p>
          </section>
        )}

        {related.length > 0 && (
          <section className="relative z-[1] mb-5">
            <h2 className="text-sm font-bold text-brand-text mb-1 px-1">同じ作品のガチャガチャ</h2>
            <p className="text-[10px] text-brand-sub mb-2 px-1">
              カプセルトイでも展開されています
            </p>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <Link
                  key={r.brandSlug}
                  href={`/brand/${r.brandSlug}`}
                  className="px-3 py-1.5 bg-white border border-cream-border rounded-full text-xs text-brand-text no-underline hover:border-brand-accent transition-colors"
                >
                  {r.brand}のガチャ
                </Link>
              ))}
            </div>
          </section>
        )}

        {alsoShokugan.length > 0 && (
          <section className="relative z-[1]">
            <h2 className="text-sm font-bold text-brand-text mb-2 px-1">
              同じ時期に出る食玩
            </h2>
            <ul className="bg-white border-2 border-cream-border rounded-xl overflow-hidden">
              {alsoShokugan.map((i) => (
                <li
                  key={i.id}
                  className="border-b border-dotted border-cream-border last:border-b-0"
                >
                  <Link
                    href={`/shokugan/${i.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-[11px] text-brand-text no-underline hover:text-brand-accent transition-colors"
                  >
                    <span className="flex-1 leading-relaxed">{i.name}</span>
                    {shortPriceLabel(i) && (
                      <span className="shrink-0 text-[9px] text-brand-sub">
                        {shortPriceLabel(i)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
