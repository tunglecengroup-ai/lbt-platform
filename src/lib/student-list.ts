import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";

/** Bộ lọc trang Admin → Học viên (đọc từ query string) */
export type StudentFilter = {
  q: string;
  course: string; // course id
  status: "" | "dang-hoc" | "het-han" | "da-khoa";
  progress: "" | "chua-hoc" | "dang-hoc" | "hoan-thanh";
  member: "" | "member" | "khong";
  from: string; // yyyy-mm-dd (ngày ghi danh)
  to: string;
};

export function parseStudentFilter(sp: Record<string, string | string[] | undefined>): StudentFilter {
  const s = (k: string) => String(sp[k] ?? "").trim();
  const pick = <T extends string>(v: string, ok: readonly T[]) => (ok.includes(v as T) ? (v as T) : ("" as T));
  return {
    q: s("q").toLowerCase(),
    course: s("course"),
    status: pick(s("status"), ["dang-hoc", "het-han", "da-khoa"] as const),
    progress: pick(s("progress"), ["chua-hoc", "dang-hoc", "hoan-thanh"] as const),
    member: pick(s("member"), ["member", "khong"] as const),
    from: /^\d{4}-\d{2}-\d{2}$/.test(s("from")) ? s("from") : "",
    to: /^\d{4}-\d{2}-\d{2}$/.test(s("to")) ? s("to") : "",
  };
}

export const hasFilter = (f: StudentFilter) => Object.values(f).some(Boolean);

/** Supabase trả tối đa 1000 dòng/lần -> đọc theo trang cho đủ */
async function fetchAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

type Profile = { id: string; email: string; full_name: string | null; phone: string | null; created_at: string | null };
type Enrollment = { id: string; user_id: string; course_id: string; status: string; enrolled_at: string; expires_at: string | null; source: string | null };

export type StudentRow = Enrollment & {
  profile?: Profile;
  course?: string;
  pct: number;
  done: number;
  total: number;
  lastAt: string | null;
  state: "dang-hoc" | "het-han" | "da-khoa";
  isMember: boolean;
};

export async function loadStudents(f: StudentFilter) {
  const db = createAdminSupabase();
  const now = new Date();
  const [courses, enrollments, profiles, lessons, counts, members] = await Promise.all([
    db.from("courses").select("id, title").order("position").then((r) => r.data ?? []),
    fetchAll<Enrollment>((a, b) =>
      db.from("enrollments").select("id, user_id, course_id, status, enrolled_at, expires_at, source").order("enrolled_at", { ascending: false }).range(a, b),
    ),
    fetchAll<Profile>((a, b) =>
      db.from("profiles").select("id, email, full_name, phone, created_at").order("created_at", { ascending: false }).range(a, b),
    ),
    db.from("lessons").select("course_id").then((r) => r.data ?? []),
    db.rpc("progress_counts").then((r) => (r.data ?? []) as { user_id: string; course_id: string; done: number; last_at: string | null }[]),
    db.from("memberships").select("user_id, expires_at, status").then((r) => r.data ?? []),
  ]);

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const courseById = new Map(courses.map((c) => [c.id, c.title]));
  const totals = new Map<string, number>();
  for (const l of lessons) totals.set(l.course_id, (totals.get(l.course_id) ?? 0) + 1);
  const countKey = (u: string, c: string) => `${u}|${c}`;
  const countMap = new Map(counts.map((c) => [countKey(c.user_id, c.course_id), c]));
  const memberIds = new Set(
    members.filter((m) => m.status === "active" && new Date(m.expires_at) > now).map((m) => m.user_id),
  );

  const text = (p?: Profile) => `${p?.email ?? ""} ${p?.full_name ?? ""} ${p?.phone ?? ""}`.toLowerCase();
  const fromT = f.from ? new Date(`${f.from}T00:00:00+07:00`).getTime() : null;
  const toT = f.to ? new Date(`${f.to}T23:59:59+07:00`).getTime() : null;

  const all: StudentRow[] = enrollments.map((e) => {
    const total = totals.get(e.course_id) ?? 0;
    const c = countMap.get(countKey(e.user_id, e.course_id));
    const done = c?.done ?? 0;
    const state = e.status !== "active" ? "da-khoa" : e.expires_at && new Date(e.expires_at) <= now ? "het-han" : "dang-hoc";
    return {
      ...e,
      profile: profileById.get(e.user_id),
      course: courseById.get(e.course_id),
      total,
      done,
      pct: total ? Math.round((done / total) * 100) : 0,
      lastAt: c?.last_at ?? null,
      state,
      isMember: memberIds.has(e.user_id),
    };
  });

  const rows = all.filter((r) => {
    if (f.q && !text(r.profile).includes(f.q)) return false;
    if (f.course && r.course_id !== f.course) return false;
    if (f.status && r.state !== f.status) return false;
    if (f.progress === "chua-hoc" && r.done > 0) return false;
    if (f.progress === "dang-hoc" && (r.done === 0 || r.pct >= 100)) return false;
    if (f.progress === "hoan-thanh" && r.pct < 100) return false;
    if (f.member === "member" && !r.isMember) return false;
    if (f.member === "khong" && r.isMember) return false;
    const t = new Date(r.enrolled_at).getTime();
    if (fromT && t < fromT) return false;
    if (toT && t > toT) return false;
    return true;
  });

  // Đăng ký tài khoản nhưng chưa có khóa nào (chỉ áp bộ lọc tìm kiếm + ngày tạo)
  const enrolledIds = new Set(enrollments.map((e) => e.user_id));
  const signups = profiles.filter((p) => {
    if (enrolledIds.has(p.id)) return false;
    if (f.q && !text(p).includes(f.q)) return false;
    const t = p.created_at ? new Date(p.created_at).getTime() : 0;
    if (fromT && t < fromT) return false;
    if (toT && t > toT) return false;
    return true;
  });

  const activeAll = all.filter((r) => r.state === "dang-hoc");
  const stats = {
    students: new Set(activeAll.map((r) => r.user_id)).size,
    activeEnrollments: activeAll.length,
    started: activeAll.filter((r) => r.done > 0).length,
    completed: activeAll.filter((r) => r.pct >= 100).length,
    signups: profiles.filter((p) => !enrolledIds.has(p.id)).length,
    members: memberIds.size,
  };

  return { courses, rows, signups, stats };
}

/** Một dòng CSV an toàn cho Excel (UTF-8 BOM thêm ở route) */
export function csvLine(cells: (string | number | null | undefined)[]) {
  return cells
    .map((c) => {
      const v = String(c ?? "");
      return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    })
    .join(",");
}
