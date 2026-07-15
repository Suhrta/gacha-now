/**
 * 画像がない / 読み込めなかった場合の共通プレースホルダ。
 *
 * 仕入れ元CDNの障害時（例: タカラトミーアーツはメンテ中、画像URLに対して
 * HTTP 200 + HTMLのメンテ案内を返すため、ブラウザ側は「壊れた画像」になる）でも
 * 壊れアイコンを見せないための受け皿。表示側で onError からこれに切り替える。
 */
export default function NoImage({ emojiSize = 36, background = "#FFF8F0" }) {
  return (
    <div
      className="w-full flex items-center justify-center"
      style={{ aspectRatio: "1/1", background }}
    >
      <div className="text-center px-2">
        <span style={{ fontSize: emojiSize }}>🔒</span>
        <div className="font-sans text-[10px] md:text-xs text-brand-sub mt-1.5 leading-[1.7]">
          画像は公式サイトで
          <br />
          ご確認ください
        </div>
      </div>
    </div>
  );
}
