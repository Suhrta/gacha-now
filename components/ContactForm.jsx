"use client";
import { useState } from "react";

const CONTACT_EMAIL = "info@gacha-now.com";

const TOPICS = [
  "掲載内容の修正・削除のお願い",
  "掲載のご依頼・情報提供",
  "不具合のご報告",
  "その他のお問い合わせ",
];

export default function ContactForm() {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = `【ガチャなう】${topic}`;
    const lines = [
      `お名前: ${name || "（未記入）"}`,
      `返信先: ${email || "（未記入）"}`,
      "",
      "お問い合わせ内容:",
      body,
    ];
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(lines.join("\n"))}`;
    window.location.href = mailto;
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* クリップボード非対応環境では何もしない */
    }
  };

  const inputClass =
    "w-full mt-1 px-3 py-2 rounded-lg border-2 border-cream-border bg-white font-sans text-[12px] text-brand-text focus:border-brand-accent focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="font-pixel text-[10px] text-brand-sub">お問い合わせの種類</span>
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className={inputClass}>
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="font-pixel text-[10px] text-brand-sub">お名前・ニックネーム</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ガチャ太郎"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="font-pixel text-[10px] text-brand-sub">返信先メールアドレス</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="font-pixel text-[10px] text-brand-sub">お問い合わせ内容</span>
        <textarea
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="ご意見・ご要望・修正のお願いなどをご記入ください。"
          className={inputClass}
        />
      </label>

      <button
        type="submit"
        className="block w-full py-3 bg-brand-accent text-white font-pixel text-[11px] rounded-lg no-underline cursor-pointer"
        style={{ boxShadow: "0 3px 0 #C5534D, 0 4px 12px #E8756D33" }}
      >
        ✉ メールアプリで送信する
      </button>

      <p className="font-pixel text-[9px] text-brand-sub leading-[2] text-center">
        ボタンを押すとお使いのメールアプリが立ち上がります。<br />
        うまく開かない場合は、下記アドレス宛に直接お送りください。
      </p>

      <button
        type="button"
        onClick={copyEmail}
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border-2 border-cream-border rounded-lg font-pixel text-[10px] text-brand-accent cursor-pointer"
      >
        📧 {CONTACT_EMAIL}
        <span className="text-brand-sub">{copied ? "（コピーしました）" : "（タップでコピー）"}</span>
      </button>
    </form>
  );
}
