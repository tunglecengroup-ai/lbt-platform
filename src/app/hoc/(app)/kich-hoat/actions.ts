"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { grantCourse } from "@/lib/orders";
import { normalizeCode } from "@/lib/activation";

export type ActivateState = { error?: string; course?: { title: string; slug: string } };

const MESSAGES: Record<string, string> = {
  code_not_found: "Mã không đúng. Kiểm tra lại từng ký tự nhé.",
  code_expired: "Mã này đã hết hạn.",
  code_used_up: "Mã này đã được người khác sử dụng.",
};

export async function activateCode(_prev: ActivateState, form: FormData): Promise<ActivateState> {
  const code = normalizeCode(String(form.get("code") ?? ""));
  if (code.length < 4) return { error: "Nhập mã kích hoạt." };

  const { data: auth } = await (await createServerSupabase()).auth.getUser();
  if (!auth.user?.email) return { error: "Phiên đăng nhập đã hết, tải lại trang rồi thử lại." };

  const db = createAdminSupabase();
  const { data: courseId, error } = await db.rpc("claim_activation_code", { p_code: code, p_user_id: auth.user.id });
  if (error) {
    const key = Object.keys(MESSAGES).find((k) => error.message.includes(k));
    return { error: key ? MESSAGES[key] : "Không kích hoạt được, thử lại sau." };
  }

  const { data: course } = await db
    .from("courses")
    .select("id, title, slug, access_days, gr_campaign_id")
    .eq("id", courseId as string)
    .single();
  if (!course) return { error: "Khóa học của mã này không còn tồn tại." };

  await grantCourse({ email: auth.user.email, course });
  revalidatePath("/hoc", "layout");
  return { course: { title: course.title, slug: course.slug } };
}
