import { Plus, Star, Trash2 } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody, SectionTitle } from "@/components/ui/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, inputClass } from "@/components/ui/field";
import { ConfirmButton } from "@/components/confirm-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { ReviewRow } from "@/lib/types";
import { createReview, deleteReview, toggleFeatured } from "./actions";

export default async function AdminReviewsPage() {
  const db = createAdminSupabase();
  const [{ data: reviews }, { data: courses }] = await Promise.all([
    db.from("reviews").select("*").order("position"),
    db.from("courses").select("id, title").order("position"),
  ]);
  const list = (reviews ?? []) as ReviewRow[];
  const courseName = new Map((courses ?? []).map((c) => [c.id as string, c.title as string]));

  return (
    <>
      <Topbar title="Cảm nhận học viên" subtitle="Hiện ở trang chủ và trang từng khóa học" />
      <PageBody>
        <MobileHeading title="Cảm nhận học viên" />

        <Card className="mb-6">
          <CardContent>
            <form action={createReview} className="grid gap-3 sm:grid-cols-2">
              <Field label="Tên học viên"><input name="name" required className={inputClass} placeholder="Ngọc Anh" /></Field>
              <Field label="Ngành / nghề" hint="Không bắt buộc"><input name="role" className={inputClass} placeholder="Đầm thiết kế" /></Field>
              <Field label="Cảm nhận" className="sm:col-span-2">
                <textarea name="content" required rows={3} className={`${inputClass} h-auto py-2`} />
              </Field>
              <Field label="Thuộc khóa học">
                <select name="course_id" className={inputClass}>
                  <option value="">— Cảm nhận chung —</option>
                  {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Số sao">
                  <select name="rating" defaultValue="5" className={inputClass}>
                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
                  </select>
                </Field>
                <Field label="Thứ tự"><input name="position" inputMode="numeric" defaultValue="0" className={inputClass} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="is_featured" defaultChecked className="size-4" /> Hiện ở trang chủ
              </label>
              <div className="flex justify-end">
                <Button type="submit"><Plus className="size-4" /> Thêm cảm nhận</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <SectionTitle title={`Tất cả (${list.length})`} />
        <Card className="divide-y">
          {list.length === 0 && <p className="text-muted-foreground p-4 text-sm">Chưa có cảm nhận nào.</p>}
          {list.map((r) => (
            <div key={r.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {r.name}
                  {r.role && <span className="text-muted-foreground font-normal"> — {r.role}</span>}
                  <span className="text-warning ml-2 text-xs">{"★".repeat(r.rating)}</span>
                </p>
                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">{r.content}</p>
                <p className="text-muted-foreground mt-1 text-xs">{r.course_id ? courseName.get(r.course_id) : "Cảm nhận chung"}</p>
              </div>
              <form action={toggleFeatured}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="featured" value={String(r.is_featured)} />
                <button type="submit" title="Bật/tắt hiện ở trang chủ">
                  <Badge tone={r.is_featured ? "warning" : "neutral"}>
                    <Star className="size-3" /> {r.is_featured ? "Trang chủ" : "Ẩn khỏi trang chủ"}
                  </Badge>
                </button>
              </form>
              <form action={deleteReview}>
                <input type="hidden" name="id" value={r.id} />
                <ConfirmButton variant="ghost" size="icon" message="Xóa cảm nhận này?" aria-label="Xóa">
                  <Trash2 className="size-4" />
                </ConfirmButton>
              </form>
            </div>
          ))}
        </Card>
      </PageBody>
    </>
  );
}
