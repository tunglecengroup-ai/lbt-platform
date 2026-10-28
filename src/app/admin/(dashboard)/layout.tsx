// Dữ liệu admin luôn đọc mới từ DB, không render tĩnh lúc build
export const dynamic = "force-dynamic";

export const metadata = { title: "LBT Platform — Quản trị", robots: { index: false } };

import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
