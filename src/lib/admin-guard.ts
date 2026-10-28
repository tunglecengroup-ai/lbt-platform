import "server-only";
import { cookies } from "next/headers";

/** Server Action gọi được bằng POST trực tiếp -> mỗi action admin phải tự kiểm tra lại phiên */
export async function assertAdmin() {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") throw new Error("Chưa cấu hình APP_SESSION_SECRET");
    return;
  }
  const session = (await cookies()).get("lbt_session")?.value;
  if (session !== secret) throw new Error("Không có quyền admin");
}
