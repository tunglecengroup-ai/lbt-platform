import { Suspense } from "react";
import { StudentAuthForm } from "@/components/student-auth-form";

export const metadata = { title: "Đăng nhập — Học viện Lê Bá Tùng" };

export default function StudentLoginPage() {
  return (
    <Suspense>
      <StudentAuthForm mode="login" />
    </Suspense>
  );
}
