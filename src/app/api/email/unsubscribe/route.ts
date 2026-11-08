import { createAdminSupabase } from "@/lib/supabase/admin";
import { verifyUnsubscribe } from "@/lib/email";

const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:64px auto;padding:0 16px;color:#1f2937;text-align:center">
<h1 style="font-size:20px">${title}</h1>${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

async function suppress(email: string) {
  await createAdminSupabase().from("email_suppressions").upsert({ email, reason: "unsubscribe" }, { onConflict: "email" });
}

/** GET: trang xác nhận (không hủy ngay — tránh bị máy quét link tự bấm) */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("e") ?? "").toLowerCase();
  const t = url.searchParams.get("t") ?? "";
  if (!email || !verifyUnsubscribe(email, t)) return page("Link không hợp lệ", "<p>Link hủy nhận email đã hỏng hoặc hết hạn.</p>");
  const esc = email.replace(/[<>&"]/g, "");
  return page(
    "Hủy nhận email chăm sóc",
    `<p>Ngừng gửi email chăm sóc, ưu đãi tới <b>${esc}</b>?</p><p style="color:#6b7280;font-size:14px">Bạn vẫn nhận email cần thiết như mã đăng nhập và xác nhận thanh toán.</p>
<form method="post"><button style="background:#2563eb;color:#fff;border:0;border-radius:8px;padding:12px 20px;font-size:15px;cursor:pointer">Xác nhận hủy nhận</button></form>`,
  );
}

/** POST: hủy nhận (nút xác nhận + chuẩn List-Unsubscribe-Post 1 chạm của Gmail/Yahoo) */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("e") ?? "").toLowerCase();
  if (!email || !verifyUnsubscribe(email, url.searchParams.get("t") ?? "")) return page("Link không hợp lệ", "");
  await suppress(email);
  await createAdminSupabase()
    .from("automation_runs")
    .update({ status: "stopped", stop_reason: "unsubscribe" })
    .eq("email", email)
    .eq("status", "active");
  return page("Đã hủy nhận email", "<p>Bạn sẽ không nhận email chăm sóc nữa. Cảm ơn bạn đã theo dõi Học viện Lê Bá Tùng.</p>");
}
