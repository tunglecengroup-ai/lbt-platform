/**
 * Nhận diện KÊNH khách đến (dùng chung trình duyệt + máy chủ).
 * Thứ tự ưu tiên: utm_source trên link -> mã click quảng cáo (fbclid/gclid/ttclid) -> trang giới thiệu (referrer) -> trực tiếp.
 */

export type Channel =
  | "facebook" | "instagram" | "threads" | "messenger" | "tiktok" | "youtube" | "linkedin"
  | "zalo" | "telegram" | "email" | "google" | "google_ads" | "bing" | "coccoc" | "ai"
  | "webcake" | "referral" | "direct" | "other";

export const CHANNELS: Record<Channel, { label: string; color: string }> = {
  facebook: { label: "Facebook", color: "#1877f2" },
  instagram: { label: "Instagram", color: "#e1306c" },
  threads: { label: "Threads", color: "#111827" },
  messenger: { label: "Messenger", color: "#0084ff" },
  tiktok: { label: "TikTok", color: "#000000" },
  youtube: { label: "YouTube", color: "#ff0000" },
  linkedin: { label: "LinkedIn", color: "#0a66c2" },
  zalo: { label: "Zalo", color: "#0068ff" },
  telegram: { label: "Telegram", color: "#229ed9" },
  email: { label: "Email", color: "#7c3aed" },
  google: { label: "Google (tìm kiếm)", color: "#34a853" },
  google_ads: { label: "Google Ads", color: "#fbbc05" },
  bing: { label: "Bing", color: "#008373" },
  coccoc: { label: "Cốc Cốc", color: "#16a34a" },
  ai: { label: "AI (ChatGPT, Perplexity…)", color: "#10a37f" },
  webcake: { label: "Trang Webcake (lebatung.com)", color: "#f97316" },
  referral: { label: "Web khác giới thiệu", color: "#64748b" },
  direct: { label: "Trực tiếp / không rõ", color: "#94a3b8" },
  other: { label: "Nguồn khác (UTM)", color: "#a3a3a3" },
};

/** Kênh dùng trong ô "Tạo link theo dõi" (utm_source / utm_medium chuẩn) */
export const LINK_CHANNELS: { channel: Channel; source: string; medium: string }[] = [
  { channel: "facebook", source: "facebook", medium: "social" },
  { channel: "instagram", source: "instagram", medium: "social" },
  { channel: "threads", source: "threads", medium: "social" },
  { channel: "tiktok", source: "tiktok", medium: "social" },
  { channel: "youtube", source: "youtube", medium: "video" },
  { channel: "linkedin", source: "linkedin", medium: "social" },
  { channel: "zalo", source: "zalo", medium: "chat" },
  { channel: "telegram", source: "telegram", medium: "chat" },
  { channel: "messenger", source: "messenger", medium: "chat" },
  { channel: "email", source: "email", medium: "email" },
];

const SOURCE_ALIASES: [RegExp, Channel][] = [
  [/^(fb|facebook|face|meta)$/i, "facebook"],
  [/^(ig|insta|instagram)$/i, "instagram"],
  [/^threads?$/i, "threads"],
  [/^(messenger|fbmessenger|mess)$/i, "messenger"],
  [/^(tiktok|tt)$/i, "tiktok"],
  [/^(youtube|yt)$/i, "youtube"],
  [/^(linkedin|li)$/i, "linkedin"],
  [/^zalo/i, "zalo"],
  [/^(telegram|tele|tg)$/i, "telegram"],
  [/^(email|mail|newsletter|getresponse|gr|resend)$/i, "email"],
  [/^google$/i, "google"],
  [/^bing$/i, "bing"],
  [/^coccoc$/i, "coccoc"],
  [/^(chatgpt|openai|perplexity|gemini|claude|copilot)/i, "ai"],
  [/^webcake$/i, "webcake"],
];

const REFERRER_HOSTS: [RegExp, Channel][] = [
  [/(^|\.)(facebook|fb)\.(com|me)$|^l\.facebook\.com$|^lm\.facebook\.com$/i, "facebook"],
  [/(^|\.)messenger\.com$/i, "messenger"],
  [/(^|\.)instagram\.com$/i, "instagram"],
  [/(^|\.)threads\.(net|com)$/i, "threads"],
  [/(^|\.)tiktok\.com$/i, "tiktok"],
  [/(^|\.)(youtube\.com|youtu\.be)$/i, "youtube"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/i, "linkedin"],
  [/(^|\.)zalo\.(me|vn)$|(^|\.)zaloapp\.com$/i, "zalo"],
  [/(^|\.)(t\.me|telegram\.(org|me))$/i, "telegram"],
  [/(^|\.)(mail\.google\.com|outlook\.(live|office)\.com|mail\.yahoo\.com)$/i, "email"],
  [/(^|\.)google\.[a-z.]+$/i, "google"],
  [/(^|\.)bing\.com$/i, "bing"],
  [/(^|\.)coccoc\.com$/i, "coccoc"],
  [/(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|gemini\.google\.com|claude\.ai|copilot\.microsoft\.com)$/i, "ai"],
  [/(^|\.)(lebatung\.com|pke\.to)$/i, "webcake"],
];

/** Kênh từ utm_source (hoặc null nếu không nhận ra) */
export function channelFromSource(source?: string | null, medium?: string | null): Channel | null {
  if (!source) return null;
  if (/^google$/i.test(source) && /cpc|ppc|paid|ads/i.test(medium ?? "")) return "google_ads";
  for (const [re, ch] of SOURCE_ALIASES) if (re.test(source.trim())) return ch;
  return "other";
}

export function channelFromReferrer(referrer?: string | null, ownHost?: string): Channel | null {
  if (!referrer) return null;
  let host = "";
  try {
    host = new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  if (ownHost && (host === ownHost || host.endsWith(`.${ownHost}`)) && host !== "lebatung.com") return null; // trang nội bộ
  for (const [re, ch] of REFERRER_HOSTS) if (re.test(host)) return ch;
  return "referral";
}

export type Touch = {
  channel: Channel;
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landing?: string;
  at: string; // ISO
};

/** Dựng 1 "lần chạm" từ URL + referrer hiện tại. null = trang nội bộ (không phải lần ghé mới) */
export function touchFrom(url: URL, referrer: string): Touch | null {
  const q = url.searchParams;
  const get = (k: string) => q.get(k)?.trim().slice(0, 200) || undefined;
  const source = get("utm_source");
  const medium = get("utm_medium");
  const base = {
    source,
    medium,
    campaign: get("utm_campaign"),
    content: get("utm_content"),
    term: get("utm_term"),
    referrer: referrer ? referrer.slice(0, 300) : undefined,
    landing: (url.pathname + (url.search ? url.search : "")).slice(0, 300),
    at: new Date().toISOString(),
  };
  let channel = channelFromSource(source, medium);
  if (!channel) {
    if (q.get("gclid") || q.get("gbraid") || q.get("wbraid")) channel = "google_ads";
    else if (q.get("ttclid")) channel = "tiktok";
    else if (q.get("fbclid")) channel = "facebook";
  }
  if (!channel) channel = channelFromReferrer(referrer, url.hostname.replace(/^www\./, ""));
  if (!channel) return referrer ? null : { ...base, channel: "direct" };
  return { ...base, channel };
}

/** Cookie gửi lên máy chủ: lần chạm đầu (f) + gần nhất (l) */
export const SOURCE_COOKIE = "lbt_src";
export type Attribution = { f?: Touch; l?: Touch };
