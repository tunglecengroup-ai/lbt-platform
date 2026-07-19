import { StudentHeader } from "@/components/student-header";

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
