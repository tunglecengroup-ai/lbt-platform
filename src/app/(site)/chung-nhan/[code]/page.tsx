import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CertificateCard } from "@/components/certificate-card";
import { CertificateActions } from "@/components/certificate-actions";
import { getCertificateByCode } from "@/lib/certificates";
import { siteUrl } from "@/lib/site";

// Trang xác minh công khai — không đưa lên Google (có tên học viên)
export async function generateMetadata({ params }: PageProps<"/chung-nhan/[code]">) {
  const { code } = await params;
  const cert = await getCertificateByCode(code);
  if (!cert) return { title: "Không tìm thấy chứng nhận", robots: { index: false } };
  const title = `${cert.student_name} đã hoàn thành "${cert.course_title}" — Học viện Lê Bá Tùng`;
  return {
    title,
    description: `Chứng nhận hoàn thành khóa ${cert.course_title}, mã xác minh ${cert.code}.`,
    robots: { index: false, follow: true },
    openGraph: { title, description: `Mã xác minh ${cert.code} · Học viện Lê Bá Tùng`, images: ["/logo.png"] },
  };
}

export default async function VerifyCertificatePage({ params }: PageProps<"/chung-nhan/[code]">) {
  const { code } = await params;
  const cert = await getCertificateByCode(code.toUpperCase());
  if (!cert) notFound();
  const url = `${siteUrl}/chung-nhan/${cert.code}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <div className="mb-6 text-center">
        {cert.revoked_at ? (
          <p className="bg-danger-soft text-danger inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
            <CircleX className="size-4" /> Chứng nhận này đã bị thu hồi
          </p>
        ) : (
          <p className="bg-success-soft text-success inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium">
            <BadgeCheck className="size-4" /> Chứng nhận hợp lệ — do Học viện Lê Bá Tùng cấp
          </p>
        )}
      </div>
      <CertificateCard cert={cert} verifyUrl={url} />
      <div className="mt-6"><CertificateActions verifyUrl={url} /></div>
      <div className="mt-10 text-center print:hidden">
        <p className="text-muted-foreground text-sm">Muốn học như {cert.student_name}?</p>
        <Button asChild className="mt-2"><Link href="/#khoa-hoc">Xem các khóa học</Link></Button>
      </div>
    </main>
  );
}
