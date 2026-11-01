import { Suspense } from "react";
import { StudentAuthForm } from "@/components/student-auth-form";

export const metadata = { title: "Đăng ký tài khoản — Học viện Lê Bá Tùng" };

export default function StudentRegisterPage() {
  return (
    <Suspense>
      <StudentAuthForm mode="register" />
    </Suspense>
  );
}
