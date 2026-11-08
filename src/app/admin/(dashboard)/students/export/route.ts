import { NextResponse, type NextRequest } from "next/server";
import { assertAdmin } from "@/lib/admin-guard";
import { csvLine, loadStudents, parseStudentFilter } from "@/lib/student-list";

const stateLabel = { "dang-hoc": "Đang học", "het-han": "Hết hạn", "da-khoa": "Đã khóa" } as const;
const d = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "");

/** Xuất danh sách học viên ĐÃ LỌC ra CSV mở bằng Excel (UTF-8 có BOM để giữ dấu tiếng Việt) */
export async function GET(request: NextRequest) {
  await assertAdmin();
  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const { rows } = await loadStudents(parseStudentFilter(sp));
  const lines = [
    csvLine(["Họ tên", "Email", "Số điện thoại", "Khóa học", "Trạng thái", "Bài xong", "Tổng bài", "Tiến độ %", "Học gần nhất", "Ngày ghi danh", "Hết hạn", "Member"]),
    ...rows.map((r) =>
      csvLine([
        r.profile?.full_name, r.profile?.email, r.profile?.phone, r.course, stateLabel[r.state],
        r.done, r.total, r.pct, d(r.lastAt), d(r.enrolled_at), d(r.expires_at), r.isMember ? "Có" : "",
      ]),
    ),
  ];
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hoc-vien-${date}.csv"`,
    },
  });
}
