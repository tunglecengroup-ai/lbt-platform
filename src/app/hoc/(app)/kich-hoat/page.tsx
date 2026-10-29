import { Card } from "@/components/ui/card";
import { ActivateForm } from "./activate-form";

export const metadata = { title: "Kích hoạt khóa học — Học viện Lê Bá Tùng" };

export default function ActivatePage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-center text-2xl font-semibold tracking-tight">Kích hoạt khóa học</h1>
      <p className="text-muted-foreground mt-2 text-center text-sm">
        Nhập mã kích hoạt bạn nhận được để mở khóa học vào tài khoản này.
      </p>
      <Card className="mt-6 p-6">
        <ActivateForm />
      </Card>
    </main>
  );
}
