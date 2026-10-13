import Link from "next/link";
import { shortReleaseLabel, shortPriceLabel, isReleased } from "../lib/shokugan";

// 食玩の一覧カード。ガチャの ProductLinkCard と見た目を揃えてある。
//
// 画像は楽天の商品画像を直リンクで表示する。自前では持たない。
// バンダイの「著作権・商標について」が画像の複製・転載を断っているため、
// 公式画像をコピーして配信する選択肢は取っていない（scripts/collect-shokugan.js に経緯）。
// 楽天に無い商品（プレミアムバンダイ限定など）は画像なしで出す。
export default function ShokuganCard({ item }) {
  const released = isReleased(item);

  return (
    <Link
      href={`/shokugan/${item.id}`}
      className="block p-3 bg-white rounded-lg border border-cream-border no-underline hover:border-brand-accent transition-colors"
    >
      {item.rakutenImage ? (
        <img
          src={item.rakutenImage}
          alt={item.name}
          width={400}
          height={400}
          loading="lazy"
          decoding="async"
          className="w-full aspect-square object-contain rounded-md bg-cream-dark"
        />
      ) : (
        <div
          className="w-full aspect-square rounded-md bg-cream-dark flex items-center justify-center"
          aria-hidden="true"
        >
          <span style={{ fontSize: 24 }}>🍬</span>
        </div>
      )}

      <div className="text-xs font-bold text-brand-text leading-snug mt-2 line-clamp-2">
        {item.name}
      </div>

      <div className="text-[10px] text-brand-sub mt-1">
        {shortPriceLabel(item) ? `${shortPriceLabel(item)}・` : ""}
        {shortReleaseLabel(item)}
        {released ? "発売中" : item.releaseKind === "ship" ? "発送予定" : "発売予定"}
      </div>
    </Link>
  );
}
