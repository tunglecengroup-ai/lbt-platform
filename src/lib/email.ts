import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { learnUrl, marketingUrl, siteUrl } from "@/lib/site";

/**
 * Gửi email qua Resend (REST API). Cần RESEND_API_KEY trên Netlify.
 * Người gửi: EMAIL_FROM (mặc định "Học viện Lê Bá Tùng <hoc@lebatung.com>") — tên miền đã xác minh trên Resend.
 */
export const isEmailConfigured = () => !!process.env.RESEND_API_KEY;

const FROM = () => process.env.EMAIL_FROM || "Học viện Lê Bá Tùng <hoc@lebatung.com>";
const REPLY_TO = () => process.env.EMAIL_REPLY_TO || undefined;

/** Gốc URL cho link trong email (link theo dõi, hủy nhận) — dùng tên miền học để không bị chuyển hướng */
export const appBase = () => learnUrl || siteUrl;
export const publicBase = () => marketingUrl || siteUrl;

function secret() {
  const s = process.env.AUTOMATION_SECRET || process.env.APP_SESSION_SECRET;
  if (!s) throw new Error("Thiếu AUTOMATION_SECRET");
  return s;
}

/** Chữ ký cho link hủy nhận email (không cần đăng nhập, không đoán được) */
export function unsubscribeToken(email: string) {
  return createHmac("sha256", secret()).update(`unsub:${email.toLowerCase()}`).digest("base64url").slice(0, 32);
}
export function verifyUnsubscribe(email: string, token: string) {
  const a = Buffer.from(unsubscribeToken(email));
  const b = Buffer.from(token || "");
  return a.length === b.length && timingSafeEqual(a, b);
}
export const unsubscribeUrl = (email: string) =>
  `${appBase()}/api/email/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubscribeToken(email)}`;

/** Khung email thống nhất thương hiệu + chân trang bắt buộc (địa chỉ gửi, lý do nhận, hủy nhận) */
export function emailLayout(bodyHtml: string, opts: { unsubscribe?: string; preheader?: string } = {}) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f4f6fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden">${opts.preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#2563eb;padding:16px 24px;color:#fff;font-weight:700;font-size:16px">Học viện Lê Bá Tùng</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.6">${bodyHtml}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;line-height:1.5">
Bạn nhận email này vì đã đăng ký tài khoản hoặc khóa học tại <a href="${publicBase()}" style="color:#6b7280">${publicBase().replace(/^https?:\/\//, "")}</a>.
${opts.unsubscribe ? `<br><a href="${opts.unsubscribe}" style="color:#6b7280">Hủy nhận email chăm sóc</a>` : ""}
</td></tr></table></td></tr></table></body></html>`;
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  unsubscribe?: string;
  tags?: { name: string; value: string }[];
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "Chưa cấu hình RESEND_API_KEY" };
  const headers: Record<string, string> = {};
  if (input.unsubscribe) {
    // RFC 8058 — Gmail/Yahoo yêu cầu với email hàng loạt: hủy nhận 1 chạm
    headers["List-Unsubscribe"] = `<${input.unsubscribe}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM(),
        to: [input.to],
        reply_to: REPLY_TO(),
        subject: input.subject,
        html: input.html,
        headers,
        tags: input.tags,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !data.id) return { ok: false, error: data.message || `HTTP ${res.status}` };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Báo nhanh cho admin qua Telegram (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID) — không có thì bỏ qua */
export async function notifyTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { ok: false as const, error: "Chưa cấu hình Telegram" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
    });
    return res.ok ? { ok: true as const } : { ok: false as const, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
