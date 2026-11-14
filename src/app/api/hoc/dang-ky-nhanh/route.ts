import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * Đăng ký học thử 1 bước: họ tên + email + SĐT -> tạo tài khoản + trả về token đăng nhập ngay (không gửi mã email).
 * CHỈ cho email CHƯA có tài khoản. Email đã có -> { exists: true }, form chuyển sang nhận mã như cũ
 * (tránh người lạ gõ email người khác mà vào được tài khoản đã mua khóa).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { fullName?: string; email?: string; phone?: string; website?: string } | null;
  if (!body) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  // Ô bẫy bot (ẩn với người thật)
  if (body.website) return NextResponse.json({ error: "Không đăng ký được" }, { status: 400 });

  const fullName = (body.fullName ?? "").trim().slice(0, 120);
  const email = (body.email ?? "").trim().toLowerCase();
  const phone = (body.phone ?? "").replace(/[\s.\-()]/g, "").replace(/^\+?84/, "0");
  if (fullName.length < 2) return NextResponse.json({ error: "Vui lòng nhập họ tên" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return NextResponse.json({ error: "Email chưa đúng" }, { status: 400 });
  if (!/^0\d{9,10}$/.test(phone)) return NextResponse.json({ error: "Số điện thoại chưa đúng (vd 0912 345 678)" }, { status: 400 });

  const db = createAdminSupabase();
  const { data: existing } = await db.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (existing) return NextResponse.json({ exists: true });

  const { data: created, error: createErr } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName, quick_signup: true },
  });
  if (createErr || !created.user) {
    // Trùng email (profiles chưa kịp có) -> coi như đã có tài khoản
    if (createErr && /already|registered|exists/i.test(createErr.message)) return NextResponse.json({ exists: true });
    console.error("dang-ky-nhanh createUser", createErr);
    return NextResponse.json({ error: "Không tạo được tài khoản, thử lại sau" }, { status: 500 });
  }
  await db.from("profiles").update({ full_name: fullName, phone }).eq("id", created.user.id);

  // Link đăng nhập 1 lần (không gửi email) -> trình duyệt đổi lấy phiên đăng nhập
  const { data: link, error: linkErr } = await db.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr || !link.properties?.hashed_token) {
    console.error("dang-ky-nhanh generateLink", linkErr);
    return NextResponse.json({ exists: true });
  }
  return NextResponse.json({ tokenHash: link.properties.hashed_token });
}
