import { NextResponse } from "next/server";
import { khoaHocGia } from "@/lib/chot-sale-gia";

/** GET /api/khoa-hoc — danh sách khóa đang bán + giá (công khai, chỉ dữ liệu đã hiện trên trang). Agent chốt sale fanpage đọc ở đây. */
export async function GET() {
  try {
    const courses = await khoaHocGia();
    return NextResponse.json({ ok: true, courses }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (e) {
    console.error("api khoa-hoc", e);
    return NextResponse.json({ ok: false, courses: [] }, { status: 500 });
  }
}
