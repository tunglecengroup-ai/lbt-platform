import Link from "next/link";
import Image from "next/image";
import {
  Award, BookOpen, Clock, Lock, PlayCircle, Quote, ShieldCheck, Smartphone, Sparkles, Users, Zap, CalendarCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CourseCover } from "@/components/course-cover";
import { PostCard } from "@/components/post-card";
import { listPublishedCourses } from "@/lib/courses";
import { listFeaturedReviews, listPublishedPosts } from "@/lib/content";
import { formatDuration, formatVND } from "@/lib/utils";
import { AUTHOR, SOCIALS, socialName, TRIAL_VIDEO, TRIAL_VIDEO_META, learnHref, marketingHref, youtubeIdFrom } from "@/lib/site";
import { JsonLd } from "@/components/json-ld";
import { HomeAuthPanel } from "@/components/home-auth-panel";
import { listTrialCourses } from "@/lib/trial-courses";
import { faqLd, orgId, personId } from "@/lib/schema";

// Lưu sẵn trên CDN cho nhanh; tự làm mới tối đa 5 phút/lần, sửa trong Admin thì làm mới ngay.
export const revalidate = 300;

/** Số liệu kênh YouTube @lebatungofficial (YouTube Data API, 15/11/2026) */
const CHANNEL = { subs: "141.000+", videos: "2.000+", views: "6,9 triệu" };

const FAQS = [
  { q: "Tôi muốn học thử có được không?", a: "Được. Điền họ tên, số điện thoại, email ở đầu trang là vào học ngay các bài học thử của khóa Facebook Ads Chuyên Sâu và khóa AI. Bài có nhãn “Học thử” xem miễn phí, các bài còn lại mở khi đăng ký khóa." },
  { q: "Người mới chưa biết gì có học được quảng cáo Facebook không?", a: "Được. Tài khoản mới còn được tặng khóa Facebook Ads Từ Cơ Bản Đến Nâng Cao để học từ đầu: tạo tài khoản, fanpage, đọc chỉ số rồi mới tới tối ưu và mở rộng." },
  { q: "Học online như thế nào, có hết hạn không?", a: "Học trên điện thoại hoặc máy tính tại hoc.lebatung.com. Lần đầu đăng nhập bằng mã gửi về email, sau đó đặt mật khẩu. Mỗi khóa học được tối đa 12 tháng kể từ ngày kích hoạt." },
  { q: "Thanh toán xong bao lâu thì vào học được?", a: "Chuyển khoản qua mã QR đúng nội dung, hệ thống tự mở khóa trong vài giây và gửi email hướng dẫn vào học." },
  { q: "Lê Bá Tùng là ai?", a: "Lê Bá Tùng là chuyên gia quảng cáo Facebook và marketing online với 10 năm thực chiến cho mô hình bán hàng online, COD tại Việt Nam, người sáng lập Học viện Lê Bá Tùng và kênh YouTube @lebatungofficial." },
  { q: "Gói thành viên LBT Member khác gì mua lẻ từng khóa?", a: "LBT Member mở trọn bộ các khóa trong gói (xem danh sách ở trang Thành viên), kèm bộ công cụ AI viết content, chấm điểm quảng cáo, chấm điểm fanpage và tạo landing page." },
];

const BENEFITS = [
  { icon: CalendarCheck, title: "Học 12 tháng", text: "Xem lại bao nhiêu lần cũng được trong suốt thời hạn khóa." },
  { icon: Smartphone, title: "Điện thoại & máy tính", text: "Học mọi lúc, đánh dấu bài đã học, tiếp tục đúng chỗ đang dở." },
  { icon: Zap, title: "Kích hoạt tự động", text: "Quét QR chuyển khoản là khóa mở trong vài giây, có email hướng dẫn." },
  { icon: Award, title: "Chứng nhận hoàn thành", text: "Học xong 100% nhận chứng nhận có mã xác minh, chia sẻ được." },
  { icon: Users, title: "Hỗ trợ học viên", text: "Hỏi khi làm theo bài chưa ra, trả lời email hoặc nhắn Zalo 0869 126 363." },
  { icon: Sparkles, title: "Công cụ AI (Member)", text: "Viết content, chấm điểm quảng cáo, chấm điểm fanpage, tạo landing." },
];

export const metadata = {
  title: "Học viện Lê Bá Tùng — Khóa học Facebook Ads & AI thực chiến, học thử miễn phí",
  description: "Học quảng cáo Facebook và ứng dụng AI thực chiến cùng Lê Bá Tùng — 10 năm chạy quảng cáo thật. Đăng ký miễn phí để học thử các bài trong khóa.",
  alternates: { canonical: "/" },
  openGraph: { images: [{ url: "https://i.ytimg.com/vi/u3PZ56cEFFE/maxresdefault.jpg", width: 1280, height: 720 }] },
};

const GOLD = "text-[#f5c451]";
const goldTitle = "bg-gradient-to-b from-[#ffe29a] via-[#f5c451] to-[#c98a1c] bg-clip-text text-transparent";

function SectionTitle({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-extrabold tracking-tight uppercase md:text-3xl ${GOLD}`}>{top}</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-white uppercase md:text-2xl">{bottom}</p>
    </div>
  );
}

const HERO_CHIPS: [typeof PlayCircle, string][] = [
  [PlayCircle, "Bài học thật"],
  [Smartphone, "Học trên điện thoại"],
  [ShieldCheck, "Không cần thẻ"],
];

export default async function HomePage() {
  const [courses, trials, reviews, posts] = await Promise.all([
    listPublishedCourses(),
    listTrialCourses(),
    listFeaturedReviews(),
    listPublishedPosts(3),
  ]);
  const trialId = youtubeIdFrom(TRIAL_VIDEO);
  const firstTrial = trials[0];
  const trialFrom = firstTrial ? `/hoc/${firstTrial.slug}${firstTrial.firstFreeId ? `/${firstTrial.firstFreeId}` : ""}` : "/hoc";
  const trialVideos = trials.reduce((n, t) => n + t.total, 0);

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

      {/* 1. ĐẦU TRANG — giới thiệu + giảng viên + khung đăng ký học thử */}
      <section className="relative overflow-hidden bg-[#0a0e1a] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(245,196,81,0.18),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(37,99,235,0.25),transparent_50%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-10 md:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-16">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f5c451]/50 bg-white/5 px-4 py-1.5 text-sm font-semibold">
              <PlayCircle className={`size-4 ${GOLD}`} /> {trialVideos > 0 ? `${trialVideos}+ video bài học thật` : "Học thử miễn phí"} · Facebook Ads & AI
            </span>
            <h1 className={`mt-5 text-4xl leading-tight font-black tracking-tight uppercase md:text-5xl ${goldTitle}`}>
              Học quảng cáo Facebook &amp; AI thực chiến
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/80 md:text-lg lg:mx-0">
              Quy trình 10 năm chạy quảng cáo thật, chia thành từng bài làm theo được. Học thử miễn phí trước, thấy hợp rồi mới đăng ký khóa.
            </p>

            <div className="relative mx-auto mt-6 max-w-md lg:mx-0">
              <div className="absolute inset-x-8 bottom-0 h-3/4 rounded-full bg-[#f5c451]/25 blur-3xl" />
              <Image src="/images/lbt-hero.webp" alt="Lê Bá Tùng — chuyên gia quảng cáo Facebook" width={964} height={900} priority className="relative mx-auto h-auto w-full max-w-sm" />
            </div>
            <p className={`mt-2 text-xl font-bold ${GOLD}`}>Lê Bá Tùng</p>
            <p className="text-sm text-white/70">Chuyên gia quảng cáo Facebook · Sáng lập Học viện Lê Bá Tùng</p>

            <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 divide-x divide-[#f5c451]/30 rounded-2xl border border-[#f5c451]/40 bg-white/5 py-4 lg:mx-0">
              {[
                ["10+", "năm chạy quảng cáo thật"],
                [CHANNEL.subs, "người đăng ký YouTube"],
                [CHANNEL.videos, "video chia sẻ kiến thức"],
              ].map(([n, l]) => (
                <div key={l} className="px-2 text-center">
                  <p className={`text-2xl font-black md:text-3xl ${goldTitle}`}>{n}</p>
                  <p className="mt-1 text-xs text-white/75 md:text-sm">{l}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-white/50">Số liệu kênh YouTube @lebatungofficial, tháng 11/2026.</p>
          </div>

          {/* Khung đăng ký học thử */}
          <div id="hoc-thu-dang-ky" className="scroll-mt-24 lg:pt-6">
            <div className="rounded-2xl border-2 border-[#f5c451]/70 bg-[#111827] p-1 shadow-2xl shadow-black/40">
              <div className="rounded-xl bg-[#111827] px-5 pt-5 pb-3 text-center">
                <p className={`text-xl font-black tracking-tight uppercase md:text-2xl ${goldTitle}`}>Học thử miễn phí</p>
                <p className="mt-1 text-sm text-white/80">
                  {trials.length ? trials.map((t) => t.title).join(" · ") : "Các khóa quảng cáo Facebook & AI"}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] font-semibold text-white/85 uppercase">
                  {HERO_CHIPS.map(([Icon, l]) => (
                    <div key={l} className="flex flex-col items-center gap-1 rounded-lg bg-white/5 px-1 py-2">
                      <Icon className={`size-5 ${GOLD}`} /> {l}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card text-foreground rounded-xl p-5">
                <HomeAuthPanel from={trialFrom} />
              </div>
              <p className="px-5 py-3 text-center text-xs text-white/70">
                Chỉ cần họ tên, số điện thoại, email. Tài khoản mới được tặng thêm khóa Facebook Ads Từ Cơ Bản Đến Nâng Cao.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HỌC VIÊN NÓI GÌ */}
      {reviews.length > 0 && (
        <section className="bg-[#0f1424] text-white">
          <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
            <SectionTitle top="Học viên nói gì" bottom="Sau khi học và làm theo" />
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.slice(0, 6).map((r) => (
                <figure key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <Quote className={`size-6 ${GOLD}`} />
                  <blockquote className="mt-2 text-sm leading-relaxed text-white/85">{r.content}</blockquote>
                  <figcaption className="mt-4 text-sm">
                    <span className="font-semibold">{r.name}</span>
                    {r.role && <span className="text-white/60"> · {r.role}</span>}
                    <span className={`ml-2 ${GOLD}`}>{"★".repeat(Math.max(1, Math.min(5, r.rating)))}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. KHÓA HỌC DẠY GÌ — mục lục từng chương */}
      {trials.length > 0 && (
        <section className="bg-[#0a0e1a] text-white">
          <div className="mx-auto max-w-5xl px-4 py-14 md:px-6 md:py-20">
            <SectionTitle top="Khóa học dạy gì?" bottom="Mục lục chi tiết từng bài" />
            {trials.map((t) => (
              <div key={t.slug} className="mt-10">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#f5c451]/30 pb-3">
                  <div>
                    <p className={`text-sm font-semibold uppercase ${GOLD}`}>Khóa học bao gồm {t.total} video bài giảng</p>
                    <h3 className="text-xl font-bold">{t.title}</h3>
                  </div>
                  <p className="text-sm text-white/70">{t.free.length} bài học thử miễn phí · {t.locked.length} bài mở khi đăng ký</p>
                </div>
                <div className="mt-4 space-y-3">
                  {t.chapters.map((ch, i) => {
                    const sec = ch.lessons.reduce((s, l) => s + l.sec, 0);
                    return (
                      <details key={`${ch.title}-${i}`} open={i === 0} className="group rounded-xl border border-white/10 bg-white/[0.03]">
                        <summary className="flex cursor-pointer list-none items-center gap-4 p-4">
                          <span className={`text-2xl font-black ${goldTitle}`}>{String(i + 1).padStart(2, "0")}.</span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold uppercase">{ch.title}</span>
                            <span className="text-xs text-white/60">Số lượng bài: {ch.lessons.length}{sec > 0 ? ` · Thời lượng: ${Math.round(sec / 60)} phút` : ""}</span>
                          </span>
                          <span className="text-white/50 transition group-open:rotate-180">▾</span>
                        </summary>
                        <ul className="divide-y divide-white/5 border-t border-white/10">
                          {ch.lessons.map((l, li) => (
                            <li key={`${l.title}-${li}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                              {l.free ? <PlayCircle className={`size-4 shrink-0 ${GOLD}`} /> : <Lock className="size-4 shrink-0 text-white/40" />}
                              <span className={`min-w-0 flex-1 ${l.free ? "text-white" : "text-white/70"}`}>{l.title}</span>
                              {l.free && <span className="rounded bg-[#f5c451]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#f5c451] uppercase">Học thử</span>}
                              {l.sec > 0 && <span className="tabular text-xs text-white/50">{formatDuration(l.sec)}</span>}
                            </li>
                          ))}
                        </ul>
                      </details>
                    );
                  })}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild className="h-11 bg-[#f5c451] px-6 font-bold text-black hover:bg-[#ffd36b]">
                    <Link href="#hoc-thu-dang-ky">Đăng ký học thử miễn phí</Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 border-white/30 bg-transparent px-6 text-white hover:bg-white/10">
                    <Link href={`/khoa-hoc/${t.slug}`}>Xem giá trọn khóa{t.price ? ` · ${formatVND(t.price)}` : ""}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. QUYỀN LỢI */}
      <section className="bg-[#0f1424] text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <SectionTitle top="Quyền lợi học viên" bottom="Khi đăng ký khóa học" />
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-2xl border border-[#f5c451]/25 bg-gradient-to-b from-white/[0.06] to-transparent p-5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#f5c451]/15"><b.icon className={`size-5 ${GOLD}`} /></span>
                <p className="mt-3 font-semibold">{b.title}</p>
                <p className="mt-1 text-sm text-white/70">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. TẤT CẢ KHÓA HỌC */}
      <section id="khoa-hoc" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 md:px-6 md:py-20">
        <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Tất cả khóa học</h2>
        {courses.length === 0 ? (
          <p className="text-muted-foreground mt-4 text-center text-sm">Chưa có khóa học nào được mở bán.</p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                    {trials.some((t) => t.slug === c.slug) && <span className="text-primary font-semibold">Có học thử</span>}
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

      {/* 7. LÊ BÁ TÙNG LÀ AI — E-E-A-T */}
      <section className="bg-[#0a0e1a] text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-[1fr_1.3fr] md:px-6 md:py-20">
          <div className="relative mx-auto max-w-sm">
            <div className="absolute inset-x-6 bottom-0 h-2/3 rounded-full bg-[#2563eb]/40 blur-3xl" />
            <Image src="/images/lbt-about.webp" alt="Lê Bá Tùng" width={755} height={900} className="relative h-auto w-full" />
          </div>
          <div>
            <p className={`text-3xl font-black uppercase md:text-4xl ${goldTitle}`}>Lê Bá Tùng là ai?</p>
            <p className="mt-1 text-white/70">{AUTHOR.jobTitle}</p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                ["10+", "năm thực chiến"],
                [CHANNEL.subs, "người đăng ký YouTube"],
                [CHANNEL.views, "lượt xem video"],
              ].map(([n, l]) => (
                <div key={l} className="rounded-xl border border-[#f5c451]/30 bg-white/5 p-3 text-center">
                  <p className={`text-xl font-black md:text-2xl ${goldTitle}`}>{n}</p>
                  <p className="mt-1 text-xs text-white/70">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3 leading-relaxed text-white/85">
              <p>{AUTHOR.bio}</p>
              <p>Mọi bài học đều là quy trình tôi đã làm thật trên tài khoản quảng cáo của mình và học viên, cập nhật theo thay đổi thuật toán và chính sách của Meta mỗi năm.</p>
            </div>
            <p className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link href={AUTHOR.aboutPath} className={`font-semibold hover:underline ${GOLD}`}>Câu chuyện của Lê Bá Tùng</Link>
              {SOCIALS.map((u) => (
                <a key={u} href={u} target="_blank" rel="noopener" className="text-white/70 hover:text-white">{socialName(u)}</a>
              ))}
            </p>
          </div>
        </div>
      </section>

      {/* 8. KÊU GỌI LẦN NỮA */}
      <section className="bg-gradient-to-r from-[#0f1424] via-[#1d2b55] to-[#0f1424] text-white">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center md:px-6">
          <p className={`text-2xl font-black uppercase md:text-3xl ${goldTitle}`}>Bắt đầu bằng vài bài học thử</p>
          <p className="mx-auto mt-2 max-w-2xl text-white/80">Đăng ký 1 phút, học ngay trên điện thoại. Thấy hợp rồi mới mở khóa toàn bộ.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild className="h-12 bg-[#f5c451] px-8 text-base font-bold text-black hover:bg-[#ffd36b]">
              <Link href="#hoc-thu-dang-ky">Đăng ký học thử miễn phí</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 border-white/30 bg-transparent px-6 text-white hover:bg-white/10">
              <Link href={learnHref("/hoc/kich-hoat")}>Tôi có mã kích hoạt</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 9. HỎI ĐÁP */}
      <section className="mx-auto mt-14 max-w-3xl px-4 md:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">Bạn có thắc mắc?</h2>
        <div className="mt-6 divide-y rounded-xl border">
          {FAQS.map((f) => (
            <details key={f.q} className="group p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                {f.q} <span className="text-muted-foreground transition group-open:rotate-180">▾</span>
              </summary>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="text-muted-foreground mt-4 text-center text-sm">
          Muốn học trọn bộ khóa + công cụ AI? <Link href={marketingHref("/thanh-vien")} className="text-primary font-medium hover:underline">Xem gói LBT Member</Link>
        </p>
      </section>

      {/* 10. BÀI VIẾT MỚI */}
      {posts.length > 0 && (
        <section className="mx-auto mt-14 mb-16 max-w-6xl px-4 md:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight">Bài viết mới</h2>
            <Link href="/blog" className="text-primary text-sm font-medium">Xem tất cả</Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </section>
      )}
    </main>
  );
}
