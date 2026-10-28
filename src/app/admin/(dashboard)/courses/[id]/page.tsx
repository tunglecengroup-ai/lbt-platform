import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Plus, Trash2, Video } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, inputClass } from "@/components/ui/field";
import { ConfirmButton } from "@/components/confirm-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatDuration } from "@/lib/utils";
import type { CourseRow } from "@/lib/types";
import {
  addChapter,
  addLesson,
  deleteChapter,
  deleteCourse,
  deleteLesson,
  updateChapter,
  updateCourse,
  updateLesson,
} from "../actions";

type AdminLesson = {
  id: string;
  chapter_id: string;
  title: string;
  position: number;
  duration_seconds: number;
  is_free_preview: boolean;
  bunny_video_id: string | null;
  youtube_id: string | null;
  content: string | null;
};

const areaClass = `${inputClass} h-auto py-2`;

export default async function CourseEditPage({ params }: PageProps<"/admin/courses/[id]">) {
  const { id } = await params;
  const db = createAdminSupabase();
  const { data: course } = await db.from("courses").select("*").eq("id", id).maybeSingle();
  if (!course) notFound();
  const c = course as CourseRow;

  const [{ data: chapters }, { data: lessons }, { data: resources }] = await Promise.all([
    db.from("chapters").select("id, title, position").eq("course_id", id).order("position"),
    db.from("lessons").select("*").eq("course_id", id).order("position"),
    db.from("lesson_resources").select("lesson_id, label, href").order("position"),
  ]);
  const ls = (lessons ?? []) as AdminLesson[];

  return (
    <>
      <Topbar title={c.title} subtitle="Chỉnh thông tin trang bán và nội dung khóa" />
      <PageBody className="max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link href="/admin/courses" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium">
            <ArrowLeft className="size-4" /> Tất cả khóa học
          </Link>
          <Link href={`/khoa-hoc/${c.slug}`} target="_blank" className="text-primary ml-auto inline-flex items-center gap-1 text-sm font-medium">
            Xem trang bán <ExternalLink className="size-3.5" />
          </Link>
        </div>

        {/* ---------- Thông tin khóa ---------- */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Thông tin trang bán</CardTitle>
              <CardDescription>Hiển thị ở trang chủ và trang chi tiết khóa học</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form action={updateCourse} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={c.id} />
              <Field label="Tên khóa học" className="sm:col-span-2"><input name="title" required defaultValue={c.title} className={inputClass} /></Field>
              <Field label="Đường dẫn" hint={`/khoa-hoc/${c.slug}`}><input name="slug" required defaultValue={c.slug} className={inputClass} /></Field>
              <Field label="Thứ tự hiển thị"><input name="position" inputMode="numeric" defaultValue={c.position} className={inputClass} /></Field>
              <Field label="Mô tả ngắn" className="sm:col-span-2"><input name="subtitle" defaultValue={c.subtitle ?? ""} className={inputClass} /></Field>
              <Field label="Giới thiệu chi tiết" className="sm:col-span-2">
                <textarea name="description" rows={5} defaultValue={c.description ?? ""} className={areaClass} />
              </Field>
              <Field label="Bạn sẽ học được" hint="Mỗi dòng 1 ý" className="sm:col-span-2">
                <textarea name="outcomes" rows={4} defaultValue={(c.outcomes ?? []).join("\n")} className={areaClass} />
              </Field>
              <Field label="Ảnh bìa (link ảnh)" hint="Tỉ lệ 16:9, để trống dùng dải màu" className="sm:col-span-2">
                <input name="cover_url" type="url" defaultValue={c.cover_url ?? ""} className={inputClass} placeholder="https://…" />
              </Field>
              <Field label="Giá bán (đ)"><input name="price" inputMode="numeric" defaultValue={c.price_vnd} className={inputClass} /></Field>
              <Field label="Giá gạch (đ)" hint="Để trống nếu không giảm giá"><input name="compare_price" inputMode="numeric" defaultValue={c.compare_price_vnd ?? ""} className={inputClass} /></Field>
              <Field label="Thời hạn học (ngày)" hint="Để trống = trọn đời"><input name="access_days" inputMode="numeric" defaultValue={c.access_days ?? ""} className={inputClass} /></Field>
              <Field label="Mã list GetResponse" hint="Mua xong tự thêm vào list này"><input name="gr_campaign_id" defaultValue={c.gr_campaign_id ?? ""} className={inputClass} /></Field>
              <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                <input type="checkbox" name="is_published" defaultChecked={c.is_published} className="accent-[hsl(var(--primary))] size-4" />
                Mở bán (hiện trên trang chủ)
              </label>
              <div className="sm:col-span-2"><Button type="submit">Lưu thông tin</Button></div>
            </form>
          </CardContent>
        </Card>

        {/* ---------- Chương & bài ---------- */}
        <div className="mt-8 mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Nội dung: {chapters?.length ?? 0} chương · {ls.length} bài</h2>
        </div>

        <div className="space-y-4">
          {(chapters ?? []).map((ch) => {
            const chLessons = ls.filter((l) => l.chapter_id === ch.id);
            return (
              <Card key={ch.id} className="overflow-hidden">
                <div className="bg-muted/50 flex flex-wrap items-center gap-2 border-b p-3">
                  <form action={updateChapter} className="flex flex-1 items-center gap-2">
                    <input type="hidden" name="id" value={ch.id} />
                    <input type="hidden" name="course_id" value={c.id} />
                    <input name="position" defaultValue={ch.position} aria-label="Thứ tự" className={`${inputClass} w-14 text-center`} />
                    <input name="title" defaultValue={ch.title} aria-label="Tên chương" className={`${inputClass} font-semibold`} />
                    <Button type="submit" variant="outline" size="sm">Lưu</Button>
                  </form>
                  <form action={deleteChapter}>
                    <input type="hidden" name="id" value={ch.id} />
                    <input type="hidden" name="course_id" value={c.id} />
                    <ConfirmButton message={`Xóa chương "${ch.title}" và toàn bộ bài trong chương?`} variant="ghost" size="sm" aria-label="Xóa chương (kèm toàn bộ bài)">
                      <Trash2 className="text-danger size-4" />
                    </ConfirmButton>
                  </form>
                </div>

                <div className="divide-y">
                  {chLessons.map((l) => (
                    <details key={l.id} className="group">
                      <summary className="hover:bg-muted/40 flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground tabular w-6">{l.position}</span>
                        <span className="min-w-0 flex-1 truncate font-medium">{l.title}</span>
                        {l.is_free_preview && <Badge tone="info">Học thử</Badge>}
                        {l.bunny_video_id || l.youtube_id ? (
                          <Badge tone="success"><Video className="size-3" /> Có video</Badge>
                        ) : (
                          <Badge tone="warning">Chưa có video</Badge>
                        )}
                        <span className="text-muted-foreground tabular text-xs">{formatDuration(l.duration_seconds)}</span>
                      </summary>
                      <div className="bg-muted/20 border-t p-4">
                        <form action={updateLesson} className="grid gap-3 sm:grid-cols-4">
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="course_id" value={c.id} />
                          <Field label="Tên bài" className="sm:col-span-3"><input name="title" defaultValue={l.title} className={inputClass} /></Field>
                          <Field label="Thứ tự"><input name="position" defaultValue={l.position} className={inputClass} /></Field>
                          <Field label="Link YouTube (Không công khai)" hint="Dán link video hoặc ID đều được" className="sm:col-span-2">
                            <input name="youtube_id" defaultValue={l.youtube_id ?? ""} className={inputClass} placeholder="https://youtu.be/…" />
                          </Field>
                          <Field label="Hoặc Bunny Video ID" hint="Nếu sau này dùng Bunny"><input name="bunny_video_id" defaultValue={l.bunny_video_id ?? ""} className={inputClass} /></Field>
                          <Field label="Thời lượng" hint="mm:ss"><input name="duration" defaultValue={formatDuration(l.duration_seconds)} className={inputClass} /></Field>
                          <Field label="Ghi chú bài học" className="sm:col-span-4">
                            <textarea name="content" rows={3} defaultValue={l.content ?? ""} className={areaClass} />
                          </Field>
                          <Field label="Tài liệu" hint="Mỗi dòng: Tên tài liệu | https://link-drive" className="sm:col-span-4">
                            <textarea name="resources" rows={2} className={areaClass}
                              defaultValue={(resources ?? []).filter((r) => r.lesson_id === l.id).map((r) => `${r.label} | ${r.href}`).join("\n")} />
                          </Field>
                          <label className="flex items-center gap-2 text-sm sm:col-span-2">
                            <input type="checkbox" name="is_free_preview" defaultChecked={l.is_free_preview} className="size-4" /> Cho học thử miễn phí
                          </label>
                          <div className="flex justify-end gap-2 sm:col-span-2">
                            <Button type="submit" size="sm">Lưu bài</Button>
                            <ConfirmButton message={`Xóa bài "${l.title}"?`} size="sm" variant="ghost" formAction={deleteLesson} className="text-danger">Xóa bài</ConfirmButton>
                          </div>
                        </form>
                      </div>
                    </details>
                  ))}
                  <form action={addLesson} className="flex gap-2 p-3">
                    <input type="hidden" name="course_id" value={c.id} />
                    <input type="hidden" name="chapter_id" value={ch.id} />
                    <input name="title" placeholder="Tên bài mới…" className={inputClass} />
                    <Button type="submit" variant="outline" size="sm" className="h-10"><Plus className="size-4" /> Thêm bài</Button>
                  </form>
                </div>
              </Card>
            );
          })}

          <form action={addChapter} className="flex gap-2">
            <input type="hidden" name="course_id" value={c.id} />
            <input name="title" placeholder="Tên chương mới…" className={inputClass} />
            <Button type="submit" variant="outline" className="shrink-0"><Plus className="size-4" /> Thêm chương</Button>
          </form>
        </div>

        <form action={deleteCourse} className="mt-12 border-t pt-6">
          <input type="hidden" name="id" value={c.id} />
          <ConfirmButton message={`XÓA VĨNH VIỄN khóa "${c.title}"? Học viên sẽ mất quyền học. Không hoàn tác được.`} variant="ghost" className="text-danger">
            <Trash2 className="size-4" /> Xóa khóa học này
          </ConfirmButton>
          <p className="text-muted-foreground mt-1 text-xs">Xóa vĩnh viễn khóa, chương, bài và quyền học của học viên. Muốn ẩn tạm thì bỏ tích “Mở bán”.</p>
        </form>
      </PageBody>
    </>
  );
}
