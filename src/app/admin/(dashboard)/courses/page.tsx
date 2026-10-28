import Link from "next/link";
import { Plus, PlayCircle, Users, ExternalLink } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { Field, inputClass } from "@/components/ui/field";
import { CourseCover } from "@/components/course-cover";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatVND } from "@/lib/utils";
import type { CourseRow } from "@/lib/types";
import { createCourse } from "./actions";

export default async function CoursesPage() {
  const db = createAdminSupabase();
  const [{ data: courses }, { data: lessons }, { data: enrollments }] = await Promise.all([
    db.from("courses").select("*").order("position"),
    db.from("lessons").select("course_id"),
    db.from("enrollments").select("course_id").eq("status", "active"),
  ]);
  const count = (rows: { course_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.course_id === id).length;

  return (
    <>
      <Topbar title="Khóa học" subtitle="Tạo khóa, sắp xếp chương/bài, gắn video" />
      <PageBody>
        <MobileHeading title="Khóa học" />

        <Card className="mb-6">
          <CardContent>
            <form action={createCourse} className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
              <Field label="Tên khóa học mới"><input name="title" required className={inputClass} placeholder="VD: TikTok Shop từ A-Z" /></Field>
              <Field label="Giá (đ)"><input name="price" inputMode="numeric" className={inputClass} placeholder="199000" /></Field>
              <Button type="submit"><Plus className="size-4" /> Tạo khóa học</Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {((courses ?? []) as CourseRow[]).map((c) => (
            <Card key={c.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <Link href={`/admin/courses/${c.id}`}>
                <CourseCover course={c} className="h-32">
                  <div className="absolute top-3 right-3">
                    <Badge tone={c.is_published ? "success" : "neutral"} className="bg-white/90 dark:bg-black/40">
                      <Dot /> {c.is_published ? "Đang bán" : "Nháp"}
                    </Badge>
                  </div>
                </CourseCover>
              </Link>
              <CardContent>
                <h3 className="font-semibold tracking-tight">
                  <Link href={`/admin/courses/${c.id}`} className="hover:text-primary">{c.title}</Link>
                </h3>
                <p className="mt-1 text-lg font-bold">{formatVND(c.price_vnd)}</p>
                <div className="text-muted-foreground mt-3 flex items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1"><PlayCircle className="size-3.5" /> {count(lessons, c.id)} bài</span>
                  <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {count(enrollments, c.id)} học viên</span>
                  {c.is_published && (
                    <Link href={`/khoa-hoc/${c.slug}`} target="_blank" className="hover:text-foreground ml-auto inline-flex items-center gap-1">
                      Trang bán <ExternalLink className="size-3" />
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageBody>
    </>
  );
}
