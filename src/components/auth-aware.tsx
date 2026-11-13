"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { learnHref } from "@/lib/site";

/**
 * Phần riêng từng người trên trang công khai (đã đăng nhập? đã mua?) đọc ở TRÌNH DUYỆT,
 * để trang được lưu sẵn trên CDN (nhanh) thay vì dựng lại cho mỗi lượt xem.
 * getSession() đọc cookie tại chỗ — không gọi mạng.
 */
function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    createBrowserSupabase()
      .auth.getSession()
      .then(({ data }) => alive && setUserId(data.session?.user.id ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return userId;
}

export function HeaderAuthButtons() {
  const loggedIn = !!useUserId();
  return (
    <>
      {!loggedIn && (
        <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
          <Link href={learnHref("/hoc/dang-ky")}>Đăng ký</Link>
        </Button>
      )}
      <Button asChild size="sm">
        <Link href={learnHref("/hoc")}>
          <GraduationCap className="size-4" />
          {loggedIn ? "Khóa của tôi" : "Vào học"}
        </Link>
      </Button>
    </>
  );
}

/** Nút trên trang khóa học: đã có khóa thì "Vào học ngay", chưa thì "Đăng ký học" */
export function CourseBuyButton({ courseId, slug }: { courseId: string; slug: string }) {
  const userId = useUserId();
  const [enrolled, setEnrolled] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    createBrowserSupabase()
      .from("enrollments")
      .select("id")
      .eq("course_id", courseId)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data }) => alive && setEnrolled(!!data));
    return () => {
      alive = false;
    };
  }, [userId, courseId]);

  return enrolled ? (
    <Button asChild className="mt-5 h-12 w-full text-base">
      <Link href={learnHref(`/hoc/${slug}`)}>Vào học ngay</Link>
    </Button>
  ) : (
    <Button asChild className="mt-5 h-12 w-full text-base">
      <Link href={`/khoa-hoc/${slug}/mua`}>Đăng ký học</Link>
    </Button>
  );
}
