// Danh sách khóa + trạng thái đăng nhập đọc mới mỗi lần, admin sửa là thấy ngay
export const dynamic = "force-dynamic";

import { SiteHeader, SiteFooter } from "@/components/site-header";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
