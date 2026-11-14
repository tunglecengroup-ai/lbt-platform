import Link from "next/link";
import { BookOpen, Clock, PlayCircle, ShieldCheck, Zap, Infinity as InfinityIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CourseCover } from "@/components/course-cover";
import { ReviewCard } from "@/components/review-card";
import { PostCard } from "@/components/post-card";
import { listPublishedCourses } from "@/lib/courses";
import { listFeaturedReviews, listPublishedPosts } from "@/lib/content";
import { formatVND } from "@/lib/utils";
import { AUTHOR, SOCIALS, socialName, TRIAL_VIDEO, TRIAL_VIDEO_META, learnHref, marketingHref, youtubeIdFrom } from "@/lib/site";
import { JsonLd } from "@/components/json-ld";
import { faqLd, orgId, personId } from "@/lib/schema";

// Lưu sẵn trên CDN cho nhanh; tự làm mới tối đa 5 phút/lần, sửa trong Admin thì làm mới ngay.
export const revalidate = 300;


const FAQS = [
  { q: "Người mới chưa biết gì có học được quảng cáo Facebook không?", a: "Được. Khóa Facebook Ads Từ Cơ Bản Đến Nâng Cao bắt đầu từ cách tạo tài khoản, fanpage, đọc chỉ số rồi mới tới tối ưu và scale — mỗi bài làm theo được ngay." },
  { q: "Học online như thế nào, có hết hạn không?", a: "Học trên điện thoại hoặc máy tính tại hoc.lebatung.com, đăng nhập bằng email nhận mã (không cần mật khẩu). Mỗi khóa có thời hạn học tối đa 12 tháng kể từ ngày kích hoạt." },
  { q: "Thanh toán xong bao lâu thì vào học được?", a: "Chuyển khoản qua mã QR đúng nội dung, hệ thống tự mở khóa trong vài giây và gửi email hướng dẫn vào học." },
  { q: "Lê Bá Tùng là ai?", a: "Lê Bá Tùng là chuyên gia quảng cáo Facebook và marketing online với 10 năm thực chiến cho mô hình bán hàng online, COD tại Việt Nam, người sáng lập Học viện Lê Bá Tùng và kênh YouTube @lebatungofficial." },
  { q: "Gói thành viên LBT Member khác gì mua lẻ từng khóa?", a: "LBT Member mở trọn bộ các khóa Facebook Ads, AI và marketing trong gói (xem danh sách ở trang Thành viên), kèm bộ công cụ AI viết content, chấm điểm quảng cáo, chấm điểm fanpage và tạo landing page." },
];

export const metadata = {
  title: "Học viện Lê Bá Tùng — Khóa học Facebook Ads & Marketing thực chiến",
  description: "Khóa học online quảng cáo Facebook, marketing thực chiến từ chuyên gia 10 năm. Học mọi lúc, kích hoạt tự động sau khi chuyển khoản.",
  alternates: { canonical: "/" },
  openGraph: { images: [{ url: "https://i.ytimg.com/vi/u3PZ56cEFFE/maxresdefault.jpg", width: 1280, height: 720 }] },
};

const perks = [
  { icon: Zap, title: "Kích hoạt tức thì", text: "Chuyển khoản xong, hệ thống tự mở khóa trong vài giây." },
  { icon: InfinityIcon, title: "Học mọi lúc", text: "Xem lại không giới hạn trên điện thoại và máy tính." },
  { icon: ShieldCheck, title: "Thực chiến", text: "Kiến thức đúc kết từ 10 năm chạy quảng cáo thật." },
];

export default async function HomePage() {
  const [courses, reviews, posts] = await Promise.all([
    listPublishedCourses(),
    listFeaturedReviews(),
    listPublishedPosts(3),
  ]);
  const trialId = youtubeIdFrom(TRIAL_VIDEO);

  return (
    <main>
      {trialId && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: TRIAL_VIDEO_META.title,
            description: TRIAL_VIDEO_META.description,
            thumbnailUrl: [`https://i.ytimg.com/vi/${trialId}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${trialId}/hqdefault.jpg`],
            uploadDate: TRIAL_VIDEO_META.uploadDate,
            duration: TRIAL_VIDEO_META.duration,
            embedUrl: `https://www.youtube.com/embed/${trialId}`,
            contentUrl: `https://www.youtube.com/watch?v=${trialId}`,
            inLanguage: "vi",
            author: { "@id": personId() },
            publisher: { "@id": orgId() },
          }}
        />
      )}
      <JsonLd data={faqLd(FAQS)} />
      {/* Section 1 — video học thử Facebook Ads */}
      <section className="border-b bg-gradient-to-b from-primary/10 to-transparent">
        <div className="mx-auto max-w-5xl px-4 pt-10 pb-12 text-center md:px-6 md:pt-16 md:pb-16">
          <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
            <PlayCircle className="size-3.5" /> Học thử miễn phí
          </span>
          <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">
            Học thử quảng cáo Facebook cùng Lê Bá Tùng
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base md:text-lg">
            Xem ngay một bài học thật trong khóa — 10 năm chạy quảng cáo đúc kết thành từng bước làm theo được.
          </p>

          <div className="bg-card mx-auto mt-8 aspect-video w-full max-w-4xl overflow-hidden rounded-xl border shadow-lg">
            {trialId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trialId}?rel=0&modestbranding=1`}
                title="Video học thử quảng cáo Facebook — Lê Bá Tùng"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="size-full"
              />
            ) : (
              <div className="from-primary/20 to-primary/5 flex size-full flex-col items-center justify-center gap-3 bg-gradient-to-br">
                <span className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-full shadow-lg">
                  <PlayCircle className="size-9" />
                </span>
                <p className="font-semibold">Video học thử sắp ra mắt</p>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="h-11 px-6">
              <Link href={learnHref("/hoc/dang-ky")}>Đăng ký tài khoản miễn phí</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 px-6">
              <Link href="#khoa-hoc">Xem các khóa học</Link>
            </Button>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">
            Đã có tài khoản? <Link href={learnHref("/hoc")} className="text-primary font-medium hover:underline">Vào học</Link>
            {" · "}
            <Link href={learnHref("/hoc/kich-hoat")} className="text-primary font-medium hover:underline">Tôi có mã kích hoạt</Link>
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-3 md:px-6">
        {perks.map((p) => (
          <div key={p.title} className="flex gap-3">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <p.icon className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{p.title}</p>
              <p className="text-muted-foreground text-sm">{p.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section id="khoa-hoc" className="mx-auto max-w-6xl scroll-mt-20 px-4 md:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Khóa học</h2>
        {courses.length === 0 ? (
          <p className="text-muted-foreground mt-4 text-sm">Chưa có khóa học nào được mở bán.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <Card key={c.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
                <Link href={`/khoa-hoc/${c.slug}`}>
                  <CourseCover course={c} className="aspect-video" />
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold tracking-tight">
                    <Link href={`/khoa-hoc/${c.slug}`} className="hover:text-primary">{c.title}</Link>
                  </h3>
                  {c.subtitle && <p className="text-muted-foreground mt-1 text-sm">{c.subtitle}</p>}
                  <div className="text-muted-foreground mt-3 flex items-center gap-4 text-xs">
                    <span className="inline-flex items-center gap-1"><BookOpen className="size-3.5" /> {c.lessonCount} bài</span>
                    {c.totalSec > 0 && <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {Math.round(c.totalSec / 60)} phút</span>}
                  </div>
                  <div className="flex-1" />
                  <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                      {c.compare_price_vnd && c.compare_price_vnd > c.price_vnd && (
                        <p className="text-muted-foreground text-xs line-through">{formatVND(c.compare_price_vnd)}</p>
                      )}
                      <p className="text-lg font-bold">{c.price_vnd ? formatVND(c.price_vnd) : "Miễn phí"}</p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/khoa-hoc/${c.slug}`}>Xem chi tiết</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {reviews.length > 0 && (
        <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Học viên nói gì</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Bài viết mới</h2>
            <Link href="/blog" className="text-primary text-sm font-medium">Xem tất cả →</Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </section>
      )}
      {/* Người hướng dẫn — E-E-A-T: kinh nghiệm thật, ai chịu trách nhiệm nội dung */}
      <section className="mx-auto mt-16 max-w-6xl px-4 md:px-6">
        <div className="bg-muted/40 grid items-center gap-6 rounded-2xl border p-6 md:grid-cols-[1fr_2fr] md:p-10">
          <div>
            <p className="text-primary text-sm font-semibold">Người hướng dẫn</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{AUTHOR.name}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{AUTHOR.jobTitle}</p>
          </div>
          <div className="space-y-3 text-sm leading-relaxed">
            <p>{AUTHOR.bio}</p>
            <p>Mọi bài học đều là quy trình tôi đã áp dụng thật trên tài khoản quảng cáo của mình và học viên — cập nhật theo thay đổi thuật toán, chính sách của Meta mỗi năm.</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href={AUTHOR.aboutPath} className="text-primary font-medium hover:underline">Câu chuyện của Lê Bá Tùng →</Link>
              {SOCIALS.map((u) => (
                <a key={u} href={u} target="_blank" rel="noopener" className="text-muted-foreground hover:text-foreground">
                  {socialName(u)}
                </a>
              ))}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 mb-16 max-w-3xl px-4 md:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Câu hỏi thường gặp</h2>
        <div className="mt-6 divide-y rounded-lg border">
          {FAQS.map((f) => (
            <details key={f.q} className="p-4">
              <summary className="cursor-pointer font-medium">{f.q}</summary>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          Muốn học trọn bộ khóa + công cụ AI? <Link href={marketingHref("/thanh-vien")} className="text-primary font-medium hover:underline">Xem gói LBT Member</Link>
        </p>
      </section>
    </main>
  );
}
