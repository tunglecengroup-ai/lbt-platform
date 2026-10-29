import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Save, Trash2 } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { ConfirmButton } from "@/components/confirm-button";
import { RichEditor } from "@/components/rich-editor";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { PostRow } from "@/lib/types";
import { deletePost, updatePost } from "../actions";

/** ISO -> "yyyy-mm-dd" theo giờ Việt Nam cho ô chọn ngày */
const vnDate = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3_600_000).toISOString().slice(0, 10);

export default async function EditPostPage({ params }: PageProps<"/admin/blog/[id]">) {
  const { id } = await params;
  const { data } = await createAdminSupabase().from("posts").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as PostRow;
  const href = p.kind === "post" ? `/blog/${p.slug}` : `/p/${p.slug}`;

  return (
    <>
      <Topbar title={p.title} subtitle={p.kind === "post" ? "Sửa bài blog" : "Sửa trang tĩnh"} />
      <PageBody className="max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link href="/admin/blog" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium">
            <ArrowLeft className="size-4" /> Tất cả bài
          </Link>
          {p.is_published && (
            <Link href={href} target="_blank" className="text-primary ml-auto inline-flex items-center gap-1 text-sm font-medium">
              Xem trên web <ExternalLink className="size-3.5" />
            </Link>
          )}
        </div>

        <form action={updatePost} className="space-y-6">
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="published_at_orig" value={p.published_at} />
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Tiêu đề" className="sm:col-span-2"><input name="title" required defaultValue={p.title} className={inputClass} /></Field>
              <Field label="Đường dẫn" hint={href}><input name="slug" defaultValue={p.slug} className={inputClass} /></Field>
              <Field label="Loại">
                <select name="kind" defaultValue={p.kind} className={inputClass}>
                  <option value="post">Bài blog (/blog/...)</option>
                  <option value="page">Trang tĩnh (/p/...)</option>
                </select>
              </Field>
              <Field label="Mô tả ngắn (hiện trên Google + danh sách bài)" className="sm:col-span-2" hint="Nên 120–160 ký tự, có từ khóa chính">
                <textarea name="excerpt" rows={2} defaultValue={p.excerpt ?? ""} className={`${inputClass} h-auto py-2`} />
              </Field>
              <Field label="Link ảnh bìa" hint="Ảnh ngang 1200×630">
                <input name="cover_url" defaultValue={p.cover_url ?? ""} className={inputClass} placeholder="https://..." />
              </Field>
              <Field label="Chuyên mục"><input name="category" defaultValue={p.category ?? ""} className={inputClass} placeholder="Facebook Marketing" /></Field>
              <Field label="Ngày đăng" hint="Đặt ngày tương lai = hẹn ngày đăng"><input type="date" name="published_at" defaultValue={vnDate(p.published_at)} className={inputClass} /></Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
                <input type="checkbox" name="is_published" defaultChecked={p.is_published} className="size-4" /> Đăng công khai
              </label>
            </CardContent>
          </Card>

          <div>
            <p className="mb-1.5 text-sm font-medium">Nội dung</p>
            <RichEditor name="content_html" defaultValue={p.content_html} />
          </div>

          <div className="flex justify-end">
            <Button type="submit"><Save className="size-4" /> Lưu bài</Button>
          </div>
        </form>

        <form action={deletePost} className="mt-10 border-t pt-6">
          <input type="hidden" name="id" value={p.id} />
          <ConfirmButton variant="outline" message="Xóa hẳn bài này?" className="text-danger">
            <Trash2 className="size-4" /> Xóa bài
          </ConfirmButton>
        </form>
      </PageBody>
    </>
  );
}
