import type { LandingResult } from "@/lib/ai-tools";

/** Dựng file HTML landing page độc lập (không cần thư viện ngoài) từ nội dung AI. Mọi chữ đều được escape. */
const THEMES: Record<string, { main: string; dark: string; soft: string; text: string }> = {
  "Xanh dương": { main: "#2563eb", dark: "#1e3a8a", soft: "#eff6ff", text: "#ffffff" },
  "Đỏ cam": { main: "#ea580c", dark: "#9a3412", soft: "#fff7ed", text: "#ffffff" },
  "Xanh lá": { main: "#16a34a", dark: "#14532d", soft: "#f0fdf4", text: "#ffffff" },
  "Tím": { main: "#7c3aed", dark: "#4c1d95", soft: "#f5f3ff", text: "#ffffff" },
  "Đen vàng sang trọng": { main: "#ca8a04", dark: "#111827", soft: "#fefce8", text: "#111827" },
  "Hồng pastel": { main: "#db2777", dark: "#831843", soft: "#fdf2f8", text: "#ffffff" },
};

const e = (s: string | undefined | null) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function buildLandingHtml(d: LandingResult, opts: { color?: string; contact?: string }) {
  const t = THEMES[opts.color ?? ""] ?? THEMES["Xanh dương"];
  const contact = (opts.contact ?? "").trim();
  const href = /^https?:\/\//.test(contact) ? contact : /^[\d\s+.]+$/.test(contact) ? `tel:${contact.replace(/[^\d+]/g, "")}` : "#dat-hang";
  const btn = (label: string) =>
    `<a href="${e(href)}" style="display:inline-block;background:${t.main};color:${t.text};padding:16px 32px;border-radius:999px;font-weight:700;text-decoration:none;font-size:18px;box-shadow:0 8px 20px rgba(0,0,0,.15)">${e(label)}</a>`;
  const section = (inner: string, bg = "#fff") => `<section style="background:${bg};padding:56px 20px"><div style="max-width:960px;margin:0 auto">${inner}</div></section>`;
  const h2 = (s: string) => `<h2 style="font-size:28px;text-align:center;margin:0 0 28px;color:${t.dark}">${e(s)}</h2>`;
  const grid = (items: string[]) => `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">${items.join("")}</div>`;
  const card = (title: string, desc: string) =>
    `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:20px"><h3 style="margin:0 0 8px;font-size:18px;color:${t.dark}">${e(title)}</h3><p style="margin:0;color:#4b5563;line-height:1.6">${e(desc)}</p></div>`;

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(d.seo_title)}</title><meta name="description" content="${e(d.seo_description)}">
<meta property="og:title" content="${e(d.seo_title)}"><meta property="og:description" content="${e(d.seo_description)}">
<style>body{margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827}*{box-sizing:border-box}</style></head>
<body>
<header style="background:linear-gradient(135deg,${t.dark},${t.main});color:#fff;padding:72px 20px;text-align:center">
<div style="max-width:820px;margin:0 auto"><h1 style="font-size:40px;line-height:1.2;margin:0 0 16px">${e(d.headline)}</h1>
<p style="font-size:19px;opacity:.92;line-height:1.6;margin:0 0 28px">${e(d.subheadline)}</p>${btn(d.cta)}</div></header>
${section(`${h2("Bạn có đang gặp những vấn đề này?")}<ul style="max-width:640px;margin:0 auto;padding:0;list-style:none">${d.pain_points.map((p) => `<li style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-size:17px">❌ ${e(p)}</li>`).join("")}</ul>`, t.soft)}
${section(`${h2("Lợi ích bạn nhận được")}${grid(d.benefits.map((b) => card(`✅ ${b.title}`, b.desc)))}`)}
${section(`${h2("Cách hoạt động")}${grid(d.how_it_works.map((s, i) => card(`${i + 1}. ${s.title}`, s.desc)))}`, t.soft)}
${section(`${h2("Khách hàng nói gì")}${grid(d.testimonials.map((x) => `<div style="background:#fff;border-radius:16px;padding:20px;border:1px solid #e5e7eb"><p style="margin:0 0 12px;line-height:1.6;font-style:italic">“${e(x.text)}”</p><b>${e(x.name)}</b></div>`))}`)}
${section(`<div id="dat-hang" style="max-width:560px;margin:0 auto;background:#fff;border:2px solid ${t.main};border-radius:20px;padding:32px;text-align:center">
<h2 style="margin:0 0 8px;color:${t.dark}">${e(d.offer.title)}</h2>
${d.offer.old_price ? `<p style="margin:0;color:#6b7280;text-decoration:line-through;font-size:18px">${e(d.offer.old_price)}</p>` : ""}
<p style="margin:4px 0 16px;font-size:36px;font-weight:800;color:${t.main}">${e(d.offer.price)}</p>
<ul style="text-align:left;padding:0;list-style:none;margin:0 0 16px">${d.offer.bonuses.map((b) => `<li style="padding:6px 0">🎁 ${e(b)}</li>`).join("")}</ul>
<p style="color:#b91c1c;font-weight:600">${e(d.offer.urgency)}</p>${btn(d.final_cta)}
${contact ? `<p style="margin:16px 0 0;color:#4b5563">Liên hệ: ${e(contact)}</p>` : ""}
<p style="margin:12px 0 0;color:#4b5563;font-size:14px">🛡️ ${e(d.guarantee)}</p></div>`, t.soft)}
${section(`${h2("Câu hỏi thường gặp")}<div style="max-width:720px;margin:0 auto">${d.faq.map((f) => `<details style="border-bottom:1px solid #e5e7eb;padding:14px 0"><summary style="font-weight:600;cursor:pointer">${e(f.q)}</summary><p style="color:#4b5563;line-height:1.6">${e(f.a)}</p></details>`).join("")}</div>`)}
<footer style="background:${t.dark};color:#fff;text-align:center;padding:32px 20px">${btn(d.final_cta)}</footer>
</body></html>`;
}
