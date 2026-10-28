import { StudentHeader } from "@/components/student-header";

export const metadata = { title: "Khu học tập — Học viện Lê Bá Tùng", robots: { index: false } };

export default function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh">
      <StudentHeader />
      {children}
    </div>
  );
}
