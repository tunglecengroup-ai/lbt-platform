import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CertificateCard } from "@/components/certificate-card";
import { CertificateActions } from "@/components/certificate-actions";
import { getStudent, getStudentCourse } from "@/lib/learning";
import { completionOf, issueCertificate } from "@/lib/certificates";
import { marketingHref, siteUrl } from "@/lib/site";

export const metadata = { title: "Chứng nhận hoàn thành — Học viện Lê Bá Tùng" };

export default async function MyCertificatePage({ params }: PageProps<"/hoc/chung-nhan/[slug]">) {
  const { slug } = await params;
  const [student, course] = await Promise.all([getStudent(), getStudentCourse(slug)]);
  if (!course || !course.enrolled) notFound();

  const cert = await issueCertificate(student.id, course.id);
  const back = (
    <Link href={`/hoc/${slug}`} className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm print:hidden">
      <ArrowLeft className="size-4" /> Quay lại khóa học
    </Link>
  );

  if (!cert) {
    const c = await completionOf(student.id, course.id);
    const pct = c.total ? Math.round((c.done / c.total) * 100) : 0;
    return (
      <main className="mx-auto max-w-xl px-4 py-8">
        {back}
        <Card className="p-8 text-center">
          <Award className="text-muted-foreground mx-auto size-12" />
          <h1 className="mt-3 text-xl font-semibold">Hoàn thành khóa để nhận chứng nhận</h1>
          <p className="text-muted-foreground mt-1 text-sm">Bạn đã học {c.done}/{c.total} bài của &quot;{course.title}&quot;. Đánh dấu hoàn thành đủ tất cả bài là nhận được chứng nhận có mã xác minh.</p>
          <Progress value={pct} className="mt-5" />
          <Button asChild className="mt-6"><Link href={`/hoc/${slug}`}>Học tiếp</Link></Button>
        </Card>
      </main>
    );
  }

  const verifyUrl = marketingHref(`/chung-nhan/${cert.code}`);
  const absolute = verifyUrl.startsWith("http") ? verifyUrl : `${siteUrl}${verifyUrl}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {back}
      <div className="mb-6 text-center print:hidden">
        <h1 className="text-2xl font-semibold">🎉 Chúc mừng {student.name}!</h1>
        <p className="text-muted-foreground mt-1 text-sm">Chứng nhận có mã xác minh — ai mở link cũng kiểm tra được là thật.</p>
      </div>
      <CertificateCard cert={cert} verifyUrl={absolute} />
      <div className="mt-6"><CertificateActions verifyUrl={absolute} /></div>
    </main>
  );
}
