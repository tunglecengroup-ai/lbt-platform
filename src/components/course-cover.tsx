import { cn } from "@/lib/utils";

/** Ảnh bìa khóa: ưu tiên ảnh thật, không có thì dùng dải màu */
export function CourseCover({
  course,
  className,
  children,
}: {
  course: { cover_url: string | null; cover_gradient: string | null; title: string };
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br",
        course.cover_gradient || "from-blue-500 to-indigo-600",
        className,
      )}
    >
      {course.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={course.cover_url} alt={course.title} className="absolute inset-0 size-full object-cover" />
      )}
      {children}
    </div>
  );
}
