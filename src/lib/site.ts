/** Tên miền chính của web — đặt NEXT_PUBLIC_SITE_URL trên Netlify khi gắn tên miền */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://lebatung.vn").replace(/\/$/, "");
