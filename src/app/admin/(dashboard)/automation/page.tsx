import { Zap, Mail, Send } from "lucide-react";
import { Topbar, MobileHeading } from "@/components/topbar";
import { PageBody } from "@/components/ui/page";
import { Card, CardContent } from "@/components/ui/card";

/** Chưa có kịch bản automation thật — trang chỉ ghi rõ những gì hệ thống đang tự làm. */
export default function AutomationPage() {
  return (
    <>
      <Topbar title="Automation" subtitle="Chuỗi email & Telegram tự động chăm sóc học viên và lead" />
      <PageBody>
        <MobileHeading title="Automation" />
        <Card>
          <CardContent className="py-12 text-center">
            <span className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-full">
              <Zap className="size-6" />
            </span>
            <h3 className="mt-4 font-semibold">Chưa có kịch bản automation nào</h3>
            <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
              Tính năng tạo kịch bản đang được xây. Hiện hệ thống tự động làm những việc sau:
            </p>
            <ul className="mx-auto mt-5 max-w-md space-y-2 text-left text-sm">
              <li className="flex gap-2">
                <Mail className="text-primary mt-0.5 size-4 shrink-0" />
                Gửi mã đăng nhập (OTP) qua email khi học viên đăng nhập / đăng ký.
              </li>
              <li className="flex gap-2">
                <Send className="text-primary mt-0.5 size-4 shrink-0" />
                Chuyển khoản SePay khớp mã đơn → tự mở khóa học và thêm vào list GetResponse của khóa.
              </li>
            </ul>
          </CardContent>
        </Card>
      </PageBody>
    </>
  );
}
