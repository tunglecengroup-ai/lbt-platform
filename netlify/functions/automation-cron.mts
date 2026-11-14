// Netlify Scheduled Function: 5 phút/lần gọi cron của web (blog hẹn giờ lên sóng, gửi email chăm sóc, quét sự kiện).
// Mã gọi cron: CRON_SECRET nếu có, không thì tự suy ra từ APP_SESSION_SECRET (web cũng suy ra y hệt).
// process.env.URL = tên miền chính của site trên Netlify.
import { createHmac } from "node:crypto";

const cronSecret = () =>
  process.env.CRON_SECRET ||
  (process.env.APP_SESSION_SECRET ? createHmac("sha256", process.env.APP_SESSION_SECRET).update("lbt-cron").digest("hex") : "");

export default async () => {
  const base = process.env.URL;
  const secret = cronSecret();
  if (!base || !secret) {
    console.log("automation-cron: thiếu URL hoặc CRON_SECRET/APP_SESSION_SECRET — bỏ qua");
    return;
  }
  const res = await fetch(`${base}/api/cron/automation`, { headers: { authorization: `Bearer ${secret}` } });
  console.log("automation-cron", res.status, (await res.text()).slice(0, 500));
};

export const config = { schedule: "*/5 * * * *" };
