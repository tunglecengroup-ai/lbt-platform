import type { Certificate } from "@/lib/certificates";
import { AUTHOR, BRAND } from "@/lib/site";

const dateVN = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });

/** Chứng nhận khổ A4 ngang — in/lưu PDF bằng trình duyệt (CSS @media print trong globals) */
export function CertificateCard({ cert, verifyUrl }: { cert: Certificate; verifyUrl: string }) {
  return (
    <div id="certificate" className="certificate-sheet relative mx-auto aspect-[297/210] w-full max-w-4xl overflow-hidden rounded-xl border bg-white text-[#1f2937] shadow-lg">
      {/* Viền trang trí */}
      <div className="absolute inset-[2.2%] rounded-lg border-[3px] border-[#2563eb]" />
      <div className="absolute inset-[3.4%] rounded border border-[#ca8a04]/60" />

      <div className="relative flex h-full flex-col items-center justify-between px-[8%] py-[6%] text-center">
        <div className="flex items-center gap-2">
          <span className="flex aspect-square w-[6%] min-w-9 items-center justify-center rounded-md bg-[#2563eb] text-[clamp(10px,1.6vw,16px)] font-bold text-white">LBT</span>
          <span className="text-[clamp(11px,1.6vw,17px)] font-semibold tracking-wide text-[#1e3a8a] uppercase">{BRAND.name}</span>
        </div>

        <div className="space-y-[1.5%]">
          <p className="text-[clamp(18px,3.6vw,38px)] font-bold tracking-[0.12em] text-[#1e3a8a] uppercase">Chứng nhận hoàn thành</p>
          <p className="text-[clamp(10px,1.4vw,15px)] text-[#6b7280]">Học viện Lê Bá Tùng trân trọng chứng nhận</p>
          <p className="py-[1%] font-serif text-[clamp(22px,4.6vw,50px)] font-semibold text-[#111827] italic">{cert.student_name}</p>
          <p className="text-[clamp(10px,1.4vw,15px)] text-[#6b7280]">đã hoàn thành {cert.lessons_completed} bài học của khóa</p>
          <p className="text-[clamp(14px,2.4vw,26px)] font-bold text-[#2563eb]">{cert.course_title}</p>
        </div>

        <div className="flex w-full items-end justify-between text-[clamp(9px,1.2vw,13px)]">
          <div className="text-left">
            <p className="text-[#6b7280]">Ngày cấp</p>
            <p className="font-semibold">{dateVN(cert.issued_at)}</p>
          </div>
          <div className="text-center">
            <p className="font-serif text-[clamp(14px,2.2vw,24px)] text-[#1e3a8a] italic">{AUTHOR.name}</p>
            <div className="mx-auto my-1 h-px w-[160%] max-w-56 bg-[#9ca3af]" />
            <p className="text-[#6b7280]">Giảng viên · Người sáng lập</p>
          </div>
          <div className="text-right">
            <p className="text-[#6b7280]">Mã xác minh</p>
            <p className="font-mono font-semibold">{cert.code}</p>
            <p className="max-w-[40ch] truncate text-[#9ca3af]">{verifyUrl.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
