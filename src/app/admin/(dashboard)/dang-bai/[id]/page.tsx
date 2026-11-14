import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { Topbar } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, inputClass } from "@/components/ui/field";
import { ConfirmButton } from "@/components/confirm-button";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { vnDateTime, vnLocal } from "@/lib/blog-time";
import { checkContent, checkFacebook } from "@/lib/social-rules";
import { SOCIAL, SOCIAL_ORDER, facebookSlotProblem, textFor, trackedLink, type Delivery, type SocialPost } from "@/lib/social";
import { CopyField } from "../../landing/[id]/editor-client";
import { cancelSocialPost, deleteSocialPost, markManualDone, reopenSocialPost, retryDelivery, saveSocialPost, uploadSocialMedia } from "../actions";
import { ApproveForm } from "./approve-form";
import { DELIVERY, STATUS } from "../status";

export const dynamic = "force-dynamic";

export default async function SocialPostPage({ params }: PageProps<"/admin/dang-bai/[id]">) {
  const { id } = await params;
  const db = createAdminSupabase();
  const [{ data }, { data: deliveries }, { data: courses }, { data: landings }] = await Promise.all([
    db.from("social_posts").select("*").eq("id", id).maybeSingle(),
    db.from("social_deliveries").select("*").eq("post_id", id),
    db.from("courses").select("slug, title").eq("is_published", true).order("position"),
    db.from("landing_pages").select("slug, name").eq("is_published", true),
  ]);
  if (!data) notFound();
  const post = data as SocialPost;
  const draft = post.status === "draft";
  const targets = [
    { label: "— Không gắn link —", path: "" },
    { label: "Trang chủ", path: "/" },
    ...(courses ?? []).map((c) => ({ label: `Khóa: ${c.title}`, path: `/khoa-hoc/${c.slug}` })),
    ...(landings ?? []).map((l) => ({ label: `Trang bán: ${l.name}`, path: `/l/${l.slug}` })),
    { label: "Gói thành viên", path: "/thanh-vien" },
    { label: "Blog", path: "/blog" },
    { label: "Đăng ký tài khoản", path: "/hoc/dang-ky" },
  ];
  if (post.link_path && !targets.some((t) => t.path === post.link_path)) targets.push({ label: post.link_path, path: post.link_path });

  // Kiểm tra trước (hiện cảnh báo ngay khi soạn)
  const hits = checkContent(`${post.title}\n${post.body}`);
  const fbErrors = post.channels.includes("facebook") ? checkFacebook(post.body, post.fb_comment_link) : [];
  const slot = draft && post.channels.includes("facebook") ? await facebookSlotProblem(post.scheduled_at ? new Date(post.scheduled_at) : new Date(), post.id) : null;
  const notReady = post.channels.filter((c) => SOCIAL[c].auto && !SOCIAL[c].ready());
  const problems = [
    ...hits.map((h) => `Điều cấm ${h.rule} (${h.label}): «${h.text}»`),
    ...fbErrors,
    ...(slot ? [`Fanpage: ${slot}`] : []),
  ];
  const byChannel = new Map(((deliveries ?? []) as Delivery[]).map((d) => [d.channel, d]));

  return (
    <>
      <Topbar title={post.title} subtitle="Đăng bài đa kênh" />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link href="/admin/dang-bai" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"><ArrowLeft className="size-4" /> Tất cả bài</Link>
          <Badge tone={STATUS[post.status]?.tone ?? "neutral"}>{STATUS[post.status]?.label ?? post.status}</Badge>
          {post.scheduled_at && <span className="text-muted-foreground text-sm">Hẹn {vnDateTime(post.scheduled_at)}</span>}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardContent>
                <form action={saveSocialPost} className="space-y-4">
                  <input type="hidden" name="id" value={post.id} />
                  <fieldset disabled={!draft} className="space-y-4 disabled:opacity-70">
                    <Field label="Tiêu đề (tên nội bộ + tiêu đề email)"><input name="title" defaultValue={post.title} className={inputClass} /></Field>
                    <Field label="Nội dung bài" hint="Viết chữ thường, xuống dòng bình thường. Fanpage: KHÔNG để link trong thân bài.">
                      <textarea name="body" rows={12} defaultValue={post.body} className={`${inputClass} h-auto py-2 leading-relaxed`} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Trang đích (mỗi kênh tự gắn mã theo dõi)">
                        <select name="link_path" defaultValue={post.link_path ?? ""} className={inputClass}>
                          {targets.map((t) => <option key={t.path} value={t.path}>{t.label}</option>)}
                        </select>
                      </Field>
                      <Field label="Link bình luận đầu fanpage (pke.to)" hint="Tạo ở Webcake → trang → tab UTM → Tạo short link">
                        <input name="fb_comment_link" defaultValue={post.fb_comment_link ?? ""} placeholder="https://pke.to/..." className={inputClass} />
                      </Field>
                      <Field label="Ngày giờ đăng (giờ VN)" hint="Để trống = đăng ngay khi duyệt">
                        <input type="datetime-local" name="scheduled_at" defaultValue={vnLocal(post.scheduled_at)} className={inputClass} />
                      </Field>
                      <Field label="Thêm ảnh/video bằng link" hint="Mỗi dòng 1 link công khai (video .mp4 cho Facebook)">
                        <textarea name="media_urls" rows={2} className={`${inputClass} h-auto py-2`} placeholder="https://..." />
                      </Field>
                    </div>
                    {post.media.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-sm font-medium">Ảnh / video ({post.media.length}) — tích để bỏ</p>
                        <div className="flex flex-wrap gap-3">
                          {post.media.map((m) => (
                            <label key={m.url} className="relative block w-28 cursor-pointer">
                              {m.type === "image" ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={m.url} alt="" className="aspect-square w-28 rounded-md border object-cover" />
                              ) : (
                                <span className="bg-muted flex aspect-square w-28 items-center justify-center rounded-md border text-xs">Video</span>
                              )}
                              <input type="checkbox" name="remove_media" value={m.url} className="absolute top-1.5 left-1.5 size-4" />
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="mb-1.5 text-sm font-medium">Đăng lên kênh</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {SOCIAL_ORDER.map((c) => (
                          <label key={c} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                            <input type="checkbox" name="channels" value={c} defaultChecked={post.channels.includes(c)} className="size-4" />
                            <span className="flex-1">{SOCIAL[c].label}</span>
                            {!SOCIAL[c].auto ? <span className="text-muted-foreground text-[11px]">tay</span> : !SOCIAL[c].ready() && <span className="text-warning text-[11px]">chưa nối</span>}
                          </label>
                        ))}
                      </div>
                    </div>
                  </fieldset>
                  {draft && <Button type="submit"><Save className="size-4" /> Lưu nháp</Button>}
                </form>

                {draft && (
                  <form action={uploadSocialMedia} className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
                    <input type="hidden" name="id" value={post.id} />
                    <input type="file" name="files" accept="image/*" multiple className="text-sm" />
                    <Button type="submit" variant="outline" size="sm"><Upload className="size-4" /> Tải ảnh lên</Button>
                    <span className="text-muted-foreground text-xs">Tối đa 4,5MB mỗi lần. Lưu nháp trước khi tải ảnh.</span>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Xem trước chữ từng kênh */}
            <Card>
              <CardHeader><div><CardTitle>Xem trước từng kênh</CardTitle><CardDescription>Mỗi kênh có link theo dõi riêng → Admin → Nguồn khách biết kênh nào ra khách.</CardDescription></div></CardHeader>
              <CardContent className="space-y-4">
                {post.channels.length === 0 && <p className="text-muted-foreground text-sm">Chưa chọn kênh.</p>}
                {post.channels.map((c) => {
                  const d = byChannel.get(c);
                  const link = trackedLink(post, c);
                  return (
                    <div key={c} className="rounded-md border">
                      <div className="bg-muted/40 flex flex-wrap items-center gap-2 border-b px-3 py-2 text-sm">
                        <span className="font-semibold">{SOCIAL[c].label}</span>
                        {d && <Badge tone={DELIVERY[d.status]?.tone ?? "neutral"}>{DELIVERY[d.status]?.label ?? d.status}</Badge>}
                        {d?.comment_status && <Badge tone={d.comment_status === "sent" ? "success" : d.comment_status === "failed" ? "danger" : "info"}>Bình luận link: {d.comment_status === "sent" ? "đã đăng" : d.comment_status === "failed" ? "lỗi" : "chờ bài lên"}</Badge>}
                        {d?.external_url && <a href={d.external_url} target="_blank" className="text-primary inline-flex items-center gap-1 text-xs">Xem bài <ExternalLink className="size-3" /></a>}
                        {d && d.status === "failed" && (
                          <form action={retryDelivery} className="ml-auto">
                            <input type="hidden" name="id" value={post.id} /><input type="hidden" name="channel" value={c} />
                            <Button size="sm" variant="outline"><RotateCcw className="size-3.5" /> Thử lại</Button>
                          </form>
                        )}
                      </div>
                      <pre className="max-h-48 overflow-auto p-3 font-sans text-sm whitespace-pre-wrap">{textFor(post, c) || "(chưa có nội dung)"}</pre>
                      {c === "facebook" && post.fb_comment_link && <p className="border-t px-3 py-2 text-xs">Bình luận đầu: Chi tiết anh/chị xem tại đây: {post.fb_comment_link}</p>}
                      {d?.error && <p className="text-danger border-t px-3 py-2 text-xs">{d.error}</p>}
                      {!SOCIAL[c].auto && (
                        <div className="space-y-2 border-t p-3">
                          <p className="text-muted-foreground text-xs">{SOCIAL[c].setup}. Copy chữ ở trên + tải ảnh, đăng xong bấm “Đã đăng”.</p>
                          {link && <CopyField label="Link theo dõi cho kênh này" value={link} />}
                          {post.media.map((m) => <a key={m.url} href={m.url} target="_blank" className="text-primary mr-3 text-xs underline">Tải {m.type === "image" ? "ảnh" : "video"}</a>)}
                          {d?.status === "manual" && (
                            <form action={markManualDone} className="flex flex-wrap gap-2">
                              <input type="hidden" name="id" value={post.id} /><input type="hidden" name="channel" value={c} />
                              <input name="url" placeholder="Link bài đã đăng (tùy chọn)" className={`${inputClass} h-8 max-w-xs text-xs`} />
                              <Button size="sm" variant="outline"><CheckCircle2 className="size-3.5" /> Đã đăng</Button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Kiểm tra + duyệt */}
          <div className="space-y-6">
            <Card>
              <CardHeader><div><CardTitle>Kiểm tra trước khi đăng</CardTitle><CardDescription>6 điều cấm + luật fanpage (≤3 bài/ngày, cách 2 giờ, link pke.to ở bình luận)</CardDescription></div></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {problems.length === 0 ? (
                  <p className="text-success flex items-center gap-1.5"><CheckCircle2 className="size-4" /> Nội dung sạch, đúng luật.</p>
                ) : (
                  <ul className="text-danger space-y-1">{problems.map((p) => <li key={p} className="flex gap-1.5"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {p}</li>)}</ul>
                )}
                {notReady.length > 0 && (
                  <p className="text-warning text-xs">Chưa kết nối: {notReady.map((c) => SOCIAL[c].label).join(", ")} — các kênh này sẽ báo lỗi, các kênh khác vẫn đăng.</p>
                )}
                <p className="text-muted-foreground text-xs">Kiểm tra theo bản đã lưu — sửa xong bấm “Lưu nháp” để kiểm tra lại.</p>
                {draft && <ApproveForm id={post.id} scheduled={!!post.scheduled_at && new Date(post.scheduled_at) > new Date()} />}
                {post.status === "approved" && (
                  <form action={cancelSocialPost}>
                    <input type="hidden" name="id" value={post.id} />
                    <ConfirmButton variant="outline" className="w-full" message="Hủy đăng? Bài hẹn trên Facebook sẽ bị xóa, các kênh chưa đăng sẽ dừng. Kênh đã đăng rồi thì không gỡ được.">Hủy đăng</ConfirmButton>
                  </form>
                )}
                {(post.status === "cancelled" || post.status === "failed") && (
                  <form action={reopenSocialPost}>
                    <input type="hidden" name="id" value={post.id} />
                    <Button variant="outline" className="w-full">Đưa về nháp để sửa</Button>
                  </form>
                )}
              </CardContent>
            </Card>
            {(draft || post.status === "cancelled") && (
              <form action={deleteSocialPost}>
                <input type="hidden" name="id" value={post.id} />
                <ConfirmButton variant="ghost" size="sm" className="text-danger" message="Xóa hẳn bài này?"><Trash2 className="size-4" /> Xóa bài</ConfirmButton>
              </form>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
