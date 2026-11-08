// Netlify Scheduled Function: 15 phút/lần gọi cron automation của web (gửi email chăm sóc, quét sự kiện).
// Cần biến môi trường CRON_SECRET (giống trên web). process.env.URL = tên miền chính của site trên Netlify.
export default async () => {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.log("automation-cron: thiếu URL hoặc CRON_SECRET — bỏ qua");
    return;
  }
  const res = await fetch(`${base}/api/cron/automation`, { headers: { authorization: `Bearer ${secret}` } });
  console.log("automation-cron", res.status, (await res.text()).slice(0, 500));
};

export const config = { schedule: "*/15 * * * *" };
