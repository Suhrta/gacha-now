import { Fragment } from "react";

/**
 * 商品名をスペース（半角/全角）区切りのセグメント単位で折り返す。
 * 各セグメントを inline-block にすることで、幅が足りない時だけ
 * 「サンリオキャラクターズ ／ きらきらこんぺいとうチャーム」のように
 * 意味の切れ目で改行される（単語の途中でのブツ切りを防ぐ）。
 * 幅が十分ある場合は従来どおり1行で表示される。
 */
export default function ProductName({ name }) {
  const segments = (name || "").split(/[\s　]+/).filter(Boolean);
  if (segments.length <= 1) return name || null;
  return (
    <>
      {segments.map((seg, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className="inline-block max-w-full">{seg}</span>
        </Fragment>
      ))}
    </>
  );
}
