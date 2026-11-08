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
export const TRIAL_VIDEO = "https://youtu.be/u3PZ56cEFFE";
/** Thông tin video học thử cho dữ liệu có cấu trúc VideoObject (lấy từ YouTube) */
export const TRIAL_VIDEO_META = {
  title: "Chạy Quảng Cáo Facebook Tin Nhắn 2026: Hướng Dẫn Chi Tiết Cho Người Mới (Phần 2)",
  description: "Bài học thử: hướng dẫn chạy quảng cáo Facebook mục tiêu tin nhắn 2026 từng bước cho người mới, do Lê Bá Tùng hướng dẫn.",
  uploadDate: "2026-11-08T12:00:36Z",
  duration: "PT19M44S",
};

export function youtubeIdFrom(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// ---------------- THƯƠNG HIỆU & TÁC GIẢ (SEO / E-E-A-T) ----------------
export const SOCIALS = [
  "https://www.facebook.com/lebatung.vn1",
  "https://www.youtube.com/@lebatungofficial",
  "https://www.tiktok.com/@lebatung.com",
];
export const BRAND = {
  name: "Học viện Lê Bá Tùng",
  description: "Đào tạo quảng cáo Facebook, marketing online và ứng dụng AI thực chiến cho chủ shop, người kinh doanh online tại Việt Nam.",
};
export const AUTHOR = {
  name: "Lê Bá Tùng",
  jobTitle: "Chuyên gia quảng cáo Facebook & marketing online",
  bio: "10 năm thực chiến chạy quảng cáo Facebook cho mô hình bán hàng online, COD và đào tạo tại Việt Nam. Người sáng lập Học viện Lê Bá Tùng, kênh YouTube @lebatungofficial.",
  aboutPath: "/p/le-ba-tung-la-ai",
};
