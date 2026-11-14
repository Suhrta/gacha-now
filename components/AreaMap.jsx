"use client";
import { useEffect, useRef } from "react";

// エリアページの店舗マップ。
//
// - 地図ライブラリは Leaflet を CDN（cdnjs）から読む。npm に入れないのは、
//   このページ以外のバンドルを重くしないため。
// - 地図画像は国土地理院の「淡色地図」タイル（無料・APIキー不要、出典表示が条件）。
//   Google マップの埋め込みは複数ピンを立てるのにAPIキーと課金設定が要るので使わない。
// - ピンの番号は下の店舗カードの番号と同じ。ピンを押すと店名と、カードへのリンクが出る。
const LEAFLET_VER = "1.9.4";
const CSS = `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VER}/leaflet.min.css`;
const JS = `https://cdnjs.cloudflare.com/ajax/libs/leaflet/${LEAFLET_VER}/leaflet.min.js`;

function loadLeaflet() {
  if (typeof window === "undefined") return Promise.reject();
  if (window.L) return Promise.resolve(window.L);
  if (window.__leafletLoading) return window.__leafletLoading;
  if (!document.querySelector(`link[href="${CSS}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS;
    document.head.appendChild(link);
  }
  window.__leafletLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = JS;
    s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.__leafletLoading;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export default function AreaMap({ stores }) {
  const ref = useRef(null);

  useEffect(() => {
    let map;
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !ref.current) return;
        map = L.map(ref.current, { scrollWheelZoom: false });
        L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>',
        }).addTo(map);

        const points = [];
        stores.forEach((s) => {
          const icon = L.divIcon({
            className: "",
            html:
              // サイトの緑（#10B981）は地図上の線路・公園と同系色で埋もれたので、ピンだけ赤にする
              `<div style="width:30px;height:30px;border-radius:50%;background:#E11D48;color:#fff;` +
              `font:bold 14px/26px sans-serif;text-align:center;border:2px solid #fff;` +
              `box-shadow:0 2px 6px rgba(0,0,0,.45)">${s.no}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });
          L.marker(s.geo, { icon, title: s.name })
            .addTo(map)
            .bindPopup(
              `<b>${s.no}. ${escapeHtml(s.name)}</b><br>` +
                (s.hours ? `${escapeHtml(s.hours)}<br>` : "") +
                `<a href="#store-${s.no}">店舗情報へ</a>`
            );
          points.push(s.geo);
        });
        // 17まで寄ると地図の文字が大きくなりすぎて、ピンが埋もれる
        map.fitBounds(points, { padding: [30, 30], maxZoom: 16 });
      })
      .catch(() => {
        // 地図が読めなくても下の店舗一覧と Google マップのリンクで用は足りるので、何も出さない
        if (ref.current) ref.current.style.display = "none";
      });
    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [stores]);

  return (
    <div
      ref={ref}
      className="relative z-[1] w-full rounded-xl border-2 border-cream-border overflow-hidden bg-cream-dark"
      style={{ height: 340 }}
      role="region"
      aria-label="店舗の地図"
    />
  );
}
