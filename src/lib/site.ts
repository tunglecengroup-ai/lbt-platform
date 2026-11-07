/**
 * HAI TÊN MIỀN, MỘT CODE:
 *  • NEXT_PUBLIC_MARKETING_URL (vd https://lebatung.com)     — trang quảng bá: trang chủ, khóa học, blog, mua khóa
 *  • NEXT_PUBLIC_LEARN_URL     (vd https://hoc.lebatung.com) — khu học viên /hoc + admin
 * Đặt đủ cả 2 thì bật chế độ tách (proxy tự chuyển trang sang đúng tên miền, đăng nhập dùng chung).
 * Thiếu 1 trong 2 = chạy 1 tên miền như cũ (localhost, bản xem trước Netlify...).
 */
const clean = (u?: string) => (u || "").trim().replace(/\/$/, "");
export const marketingUrl = clean(process.env.NEXT_PUBLIC_MARKETING_URL);
export const learnUrl = clean(process.env.NEXT_PUBLIC_LEARN_URL);
export const splitDomains = !!(marketingUrl && learnUrl);
export const marketingHost = splitDomains ? new URL(marketingUrl).hostname : "";
export const learnHost = splitDomains ? new URL(learnUrl).hostname : "";

/** Cookie đăng nhập dùng chung cho mọi tên miền con: ".lebatung.com" */
export const authCookieDomain = splitDomains ? "." + marketingHost.replace(/^www\./, "") : undefined;
/** Chỉ gắn domain cookie khi đang chạy đúng trên tên miền đó (bản xem trước *.netlify.app thì không) */
export function cookieDomainFor(host: string | null | undefined) {
  const h = (host || "").split(":")[0].toLowerCase();
  return authCookieDomain && (h === authCookieDomain.slice(1) || h.endsWith(authCookieDomain)) ? authCookieDomain : undefined;
}

/** Link sang khu học (/hoc...) và sang trang quảng bá — tuyệt đối khi tách tên miền, tương đối khi chạy 1 tên miền */
export const learnHref = (path: string) => (splitDomains ? learnUrl + path : path);
export const marketingHref = (path: string) => (splitDomains ? marketingUrl + path : path);

/** Tên miền chính (SEO: sitemap, canonical, ảnh chia sẻ) */
export const siteUrl = marketingUrl || clean(process.env.NEXT_PUBLIC_SITE_URL) || "https://lebatung.vn";

/**
 * Video học thử ở section đầu trang chủ.
 * Dán link YouTube (youtu.be/…, youtube.com/watch?v=…) hoặc ID 11 ký tự. Để trống = hiện khung "sắp ra mắt".
 */
export const TRIAL_VIDEO = "";

export function youtubeIdFrom(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}
