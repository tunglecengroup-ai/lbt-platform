import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody, SectionTitle } from "@/components/ui/page";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/confirm-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { formatCode } from "@/lib/activation";
import { formatDate } from "@/lib/utils";
import { CodeForms } from "./code-forms";
import { deleteCode } from "./actions";

type CodeRow = {
  id: string;
  code: string;
  course_id: string;
  max_uses: number;
  used_count: number;
  note: string | null;
  expires_at: string | null;
  created_at: string;
};

export default async function CodesPage({ searchParams }: PageProps<"/admin/codes">) {
  const { course, status } = await searchParams;
  const db = createAdminSupabase();
  const { data: courses } = await db.from("courses").select("id, title").order("position");

  let q = db.from("activation_codes").select("*").order("created_at", { ascending: false }).limit(1000);
  if (typeof course === "string" && course) q = q.eq("course_id", course);
  const { data } = await q;
  let codes = (data ?? []) as CodeRow[];
  const isLeft = (c: CodeRow) => c.used_count < c.max_uses && (!c.expires_at || new Date(c.expires_at) > new Date());
  if (status === "con") codes = codes.filter(isLeft);
  if (status === "het") codes = codes.filter((c) => !isLeft(c));

  const courseName = new Map((courses ?? []).map((c) => [c.id as string, c.title as string]));
  const filterHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(typeof course === "string" && course ? { course } : {}), ...(typeof status === "string" && status ? { status } : {}), ...patch });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `/admin/codes${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <Topbar title="Mã kích hoạt" subtitle="Bán / tặng khóa học bằng mã — học viên nhập ở /hoc/kich-hoat" />
      <PageBody>
        <MobileHeading title="Mã kích hoạt" />

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card className="self-start">
            <CardContent>
              <CodeForms courses={courses ?? []} />
            </CardContent>
          </Card>

          <section className="min-w-0">
            <SectionTitle title={`Danh sách mã (${codes.length})`} />
            <div className="mb-3 flex flex-wrap gap-2 text-sm">
              <select
                defaultValue={typeof course === "string" ? course : ""}
                className="bg-background h-8 rounded-md border px-2 text-sm"
                // Đổi khóa -> tải lại trang kèm bộ lọc (không cần JS riêng)
                form="code-filter"
                name="course"
              >
                <option value="">Tất cả khóa</option>
                {(courses ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <form id="code-filter" action="/admin/codes" className="contents">
                {typeof status === "string" && status && <input type="hidden" name="status" value={status} />}
                <button type="submit" className="hover:bg-muted h-8 rounded-md border px-3">Lọc</button>
              </form>
              {[["", "Tất cả"], ["con", "Còn lượt"], ["het", "Đã dùng / hết hạn"]].map(([v, label]) => (
                <Link
                  key={v}
                  href={filterHref({ status: v })}
                  className={`h-8 rounded-md border px-3 leading-8 ${(status ?? "") === v ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                >
                  {label}
                </Link>
              ))}
            </div>

            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Mã</th>
                    <th className="px-4 py-2.5 font-medium">Khóa học</th>
                    <th className="px-4 py-2.5 font-medium">Đã dùng</th>
                    <th className="px-4 py-2.5 font-medium">Hạn</th>
                    <th className="px-4 py-2.5 font-medium">Ghi chú</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {codes.length === 0 && (
                    <tr><td colSpan={6} className="text-muted-foreground px-4 py-6 text-center">Chưa có mã nào.</td></tr>
                  )}
                  {codes.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2.5 font-mono font-semibold whitespace-nowrap select-all">{formatCode(c.code)}</td>
                      <td className="px-4 py-2.5">{courseName.get(c.course_id)}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={c.used_count >= c.max_uses ? "neutral" : c.used_count > 0 ? "info" : "success"}>
                          {c.used_count}/{c.max_uses}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 whitespace-nowrap">{c.expires_at ? formatDate(c.expires_at) : "—"}</td>
                      <td className="text-muted-foreground px-4 py-2.5">{c.note}</td>
                      <td className="px-2 py-1.5 text-right">
                        <form action={deleteCode}>
                          <input type="hidden" name="id" value={c.id} />
                          <ConfirmButton variant="ghost" size="icon" message={`Xóa mã ${formatCode(c.code)}? Người đã kích hoạt vẫn giữ quyền học.`} aria-label="Xóa mã">
                            <Trash2 className="size-4" />
                          </ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        </div>
      </PageBody>
    </>
  );
}
