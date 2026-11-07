/** Tên miền chính của web — đặt NEXT_PUBLIC_SITE_URL trên Netlify khi gắn tên miền */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://lebatung.vn").replace(/\/$/, "");

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
