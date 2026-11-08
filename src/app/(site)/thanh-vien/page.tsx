import Link from "next/link";
import { Check, Crown, Sparkles, BookOpen, Bot, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";
import { TrackEvent } from "@/components/track-event";
import { listPublishedPlans } from "@/lib/membership";
import { listPublishedCourses } from "@/lib/courses";
import { formatVND } from "@/lib/utils";
import { siteUrl } from "@/lib/site";

export const metadata = {
  title: "LBT Member — Trọn bộ khóa Facebook Ads + công cụ AI quảng cáo | Học viện Lê Bá Tùng",
  description:
    "Gói thành viên LBT Member: học toàn bộ khóa Facebook Ads, marketing của Lê Bá Tùng và dùng bộ công cụ AI viết content, chấm điểm quảng cáo, chấm điểm fanpage, tạo landing page.",
  alternates: { canonical: "/thanh-vien" },
};

const faqs = [
  { q: "Gói LBT Member gồm những gì?", a: "Quyền học các khóa học có trong gói (danh sách ngay trên trang này) và bộ công cụ AI hỗ trợ làm quảng cáo: viết content, chấm điểm bài quảng cáo, chấm điểm fanpage, tạo landing page bán hàng." },
  { q: "Thời hạn thành viên tính thế nào?", a: "Tính từ lúc thanh toán thành công. Gia hạn sớm sẽ được cộng nối tiếp, tối đa 12 tháng tính từ thời điểm gia hạn." },
  { q: "Thanh toán xong bao lâu thì vào học được?", a: "Chuyển khoản đúng nội dung, hệ thống tự kích hoạt trong vài giây. Đăng nhập bằng email đã đăng ký tại hoc.lebatung.com, nhận mã đăng nhập qua email, không cần mật khẩu." },
  { q: "Tôi đã mua lẻ một khóa, lên Member có bị mất quyền khóa cũ không?", a: "Không. Khóa đã mua vẫn giữ nguyên, nếu hạn của khóa ngắn hơn hạn thành viên thì được nâng lên theo hạn thành viên." },
];

export default async function MembershipPage() {
  const [plans, allCourses] = await Promise.all([listPublishedPlans(), listPublishedCourses()]);
  // Chỉ hiện khóa thật sự có trong gói (gói "selected" giới hạn danh sách)
  const included = new Set(plans.flatMap((p) => (p.course_scope === "all" ? allCourses.map((c) => c.id) : p.course_ids)));
  const courses = allCourses.filter((c) => included.has(c.id));

  return (
    <main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      {plans.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Product",
            name: "LBT Member",
            description: metadata.description,
            brand: { "@type": "Brand", name: "Học viện Lê Bá Tùng" },
            url: `${siteUrl}/thanh-vien`,
            offers: plans.map((p) => ({
              "@type": "Offer",
              name: p.name,
              price: p.price_vnd,
              priceCurrency: "VND",
              availability: "https://schema.org/InStock",
              url: `${siteUrl}/thanh-vien/${p.slug}/mua`,
            })),
          }}
        />
      )}

      {plans[0] && <TrackEvent event="view_item" item={{ id: plans[0].id, name: plans[0].name, price: plans[0].price_vnd, category: "membership" }} />}
      <section className="border-b bg-gradient-to-b from-warning/10 to-transparent">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center md:px-6 md:py-20">
          <span className="bg-warning-soft text-warning inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
            <Crown className="size-3.5" /> Chương trình thành viên
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">LBT Member — học trọn bộ, làm quảng cáo nhanh hơn</h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl md:text-lg">
            Một lần đăng ký: mở {courses.length} khóa học Facebook Ads, AI & marketing cùng bộ công cụ AI hỗ trợ chạy quảng cáo — đúc kết từ 10 năm làm thật.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 md:px-6">
        {plans.length === 0 ? (
          <p className="text-muted-foreground text-center">Chương trình thành viên sắp mở đăng ký.</p>
        ) : (
          <div className={`grid gap-6 ${plans.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-md"}`}>
            {plans.map((p) => (
              <Card key={p.id} className={`relative flex flex-col p-6 ${p.is_featured ? "border-primary ring-primary/20 ring-2" : ""}`}>
                {p.is_featured && (
                  <span className="bg-primary text-primary-foreground absolute -top-3 left-6 rounded-full px-3 py-0.5 text-xs font-semibold">Được chọn nhiều nhất</span>
                )}
                <h2 className="text-xl font-semibold">{p.name}</h2>
                {p.tagline && <p className="text-muted-foreground mt-1 text-sm">{p.tagline}</p>}
                <div className="mt-5">
                  {p.compare_price_vnd && p.compare_price_vnd > p.price_vnd && (
                    <p className="text-muted-foreground text-sm line-through">{formatVND(p.compare_price_vnd)}</p>
                  )}
                  <p className="text-3xl font-bold">{formatVND(p.price_vnd)}</p>
                  <p className="text-muted-foreground text-sm">cho {p.duration_days >= 365 ? "12 tháng" : `${p.duration_days} ngày`}</p>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex gap-2">
                      <Check className="text-success mt-0.5 size-4 shrink-0" /> {perk}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6 h-11" variant={p.is_featured ? "primary" : "outline"}>
                  <Link href={`/thanh-vien/${p.slug}/mua`}>Đăng ký {p.name}</Link>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="bg-muted/40 border-y">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 md:grid-cols-3 md:px-6">
          {[
            { icon: BookOpen, title: `${courses.length} khóa học`, text: "Facebook Ads từ cơ bản đến chuyên sâu, AI marketing, tối ưu quảng cáo — học trên điện thoại và máy tính." },
            { icon: Bot, title: "Bộ công cụ AI", text: "Viết content quảng cáo, chấm điểm bài quảng cáo, chấm điểm fanpage, tạo landing page bán hàng trong vài phút." },
            { icon: BadgeCheck, title: "Kiến thức làm thật", text: "Quy trình Lê Bá Tùng đã áp dụng 10 năm chạy quảng cáo — làm theo được ngay, cập nhật theo thuật toán mới." },
          ].map((b) => (
            <div key={b.title} className="flex gap-3">
              <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg"><b.icon className="size-5" /></span>
              <div>
                <p className="font-semibold">{b.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {courses.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-12 md:px-6">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Sparkles className="text-warning size-5" /> Khóa học có trong gói</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {courses.map((c) => (
              <li key={c.id}>
                <Link href={`/khoa-hoc/${c.slug}`} className="hover:border-primary/40 flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors">
                  <span className="font-medium">{c.title}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">{c.lessonCount} bài</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-3xl px-4 pb-16 md:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Câu hỏi thường gặp</h2>
        <div className="mt-6 divide-y rounded-lg border">
          {faqs.map((f) => (
            <details key={f.q} className="group p-4">
              <summary className="cursor-pointer font-medium">{f.q}</summary>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
