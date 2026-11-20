/**
 * Kỳ thời gian cho báo cáo Admin (tính theo GIỜ VIỆT NAM, UTC+7).
 * Mỗi kỳ = [start, end) dạng Date (mốc UTC thật).
 */
const VN = 7 * 3600_000;

/** Ngày/tháng/năm theo giờ VN của 1 thời điểm */
export function vnParts(d: Date) {
  const v = new Date(d.getTime() + VN);
  return { y: v.getUTCFullYear(), m: v.getUTCMonth(), d: v.getUTCDate() };
}
/** 0h giờ VN của ngày y-m-d (m tính từ 0, cho phép tràn) */
export const vnDate = (y: number, m: number, d = 1) => new Date(Date.UTC(y, m, d) - VN);
/** "YYYY-MM-DD" theo giờ VN */
export const vnDay = (d: Date) => new Date(d.getTime() + VN).toISOString().slice(0, 10);

export type Period = { start: Date; end: Date; label: string };

export const PRESETS = [
  { id: "hom-nay", label: "Hôm nay" },
  { id: "hom-qua", label: "Hôm qua" },
  { id: "7-ngay", label: "7 ngày qua" },
  { id: "30-ngay", label: "30 ngày qua" },
  { id: "thang-nay", label: "Tháng này" },
  { id: "thang-truoc", label: "Tháng trước" },
  { id: "quy-nay", label: "Quý này" },
  { id: "quy-truoc", label: "Quý trước" },
  { id: "nam-nay", label: "Năm nay" },
  { id: "nam-truoc", label: "Năm trước" },
  { id: "tuy-chon", label: "Tùy chọn ngày" },
] as const;
export type PresetId = (typeof PRESETS)[number]["id"];

export const COMPARES = [
  { id: "ky-truoc", label: "Kỳ liền trước" },
  { id: "nam-truoc", label: "Cùng kỳ năm trước" },
  { id: "khong", label: "Không so sánh" },
] as const;
export type CompareId = (typeof COMPARES)[number]["id"];

const fmt = (d: Date) => {
  const p = vnParts(d);
  return `${String(p.d).padStart(2, "0")}/${String(p.m + 1).padStart(2, "0")}/${p.y}`;
};
const rangeLabel = (s: Date, e: Date) => {
  const last = new Date(e.getTime() - 1);
  return vnDay(s) === vnDay(last) ? fmt(s) : `${fmt(s)} – ${fmt(last)}`;
};

/** Kỳ đang xem từ tham số trên link (?ky=...&tu=YYYY-MM-DD&den=YYYY-MM-DD) */
export function resolvePeriod(ky: string | undefined, tu?: string, den?: string, now = new Date()): Period & { id: PresetId } {
  const { y, m, d } = vnParts(now);
  const q = Math.floor(m / 3);
  const id = (PRESETS.some((p) => p.id === ky) ? ky : "thang-nay") as PresetId;
  let start: Date, end: Date;
  switch (id) {
    case "hom-nay": start = vnDate(y, m, d); end = vnDate(y, m, d + 1); break;
    case "hom-qua": start = vnDate(y, m, d - 1); end = vnDate(y, m, d); break;
    case "7-ngay": start = vnDate(y, m, d - 6); end = vnDate(y, m, d + 1); break;
    case "30-ngay": start = vnDate(y, m, d - 29); end = vnDate(y, m, d + 1); break;
    case "thang-truoc": start = vnDate(y, m - 1); end = vnDate(y, m); break;
    case "quy-nay": start = vnDate(y, q * 3); end = vnDate(y, q * 3 + 3); break;
    case "quy-truoc": start = vnDate(y, q * 3 - 3); end = vnDate(y, q * 3); break;
    case "nam-nay": start = vnDate(y, 0); end = vnDate(y + 1, 0); break;
    case "nam-truoc": start = vnDate(y - 1, 0); end = vnDate(y, 0); break;
    case "tuy-chon": {
      const ok = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
      const a = ok(tu) ? tu! : vnDay(vnDate(y, m));
      const b = ok(den) ? den! : vnDay(now);
      const [s0, e0] = a <= b ? [a, b] : [b, a];
      const [ys, ms, ds] = s0.split("-").map(Number);
      const [ye, me, de] = e0.split("-").map(Number);
      start = vnDate(ys, ms - 1, ds);
      end = vnDate(ye, me - 1, de + 1);
      break;
    }
    default: start = vnDate(y, m); end = vnDate(y, m + 1);
  }
  return { id, start, end, label: rangeLabel(start, end) };
}

/** Kỳ để so sánh: liền trước (cùng độ dài; tháng/quý/năm thì đúng tháng/quý/năm trước) hoặc cùng kỳ năm trước */
export function comparePeriod(p: Period & { id: PresetId }, mode: CompareId): Period | null {
  if (mode === "khong") return null;
  const s = vnParts(p.start), e = vnParts(p.end);
  let start: Date, end: Date;
  if (mode === "nam-truoc") {
    start = vnDate(s.y - 1, s.m, s.d);
    end = vnDate(e.y - 1, e.m, e.d);
  } else if (["thang-nay", "thang-truoc"].includes(p.id)) {
    start = vnDate(s.y, s.m - 1); end = vnDate(s.y, s.m);
  } else if (["quy-nay", "quy-truoc"].includes(p.id)) {
    start = vnDate(s.y, s.m - 3); end = vnDate(s.y, s.m);
  } else if (["nam-nay", "nam-truoc"].includes(p.id)) {
    start = vnDate(s.y - 1, 0); end = vnDate(s.y, 0);
  } else {
    const len = p.end.getTime() - p.start.getTime();
    start = new Date(p.start.getTime() - len); end = p.start;
  }
  return { start, end, label: rangeLabel(start, end) };
}

/** Các mốc để so sánh theo tháng / quý / năm (mới nhất ở cuối) */
export function buckets(kind: "thang" | "quy" | "nam", now = new Date()): Period[] {
  const { y, m } = vnParts(now);
  if (kind === "nam")
    return [2, 1, 0].map((k) => ({ start: vnDate(y - k, 0), end: vnDate(y - k + 1, 0), label: `Năm ${y - k}` }));
  if (kind === "quy") {
    const q = Math.floor(m / 3);
    return Array.from({ length: 8 }, (_, i) => {
      const qq = q - 7 + i;
      const s = vnDate(y, qq * 3);
      const pp = vnParts(s);
      return { start: s, end: vnDate(y, qq * 3 + 3), label: `Q${Math.floor(pp.m / 3) + 1}/${pp.y}` };
    });
  }
  return Array.from({ length: 12 }, (_, i) => {
    const s = vnDate(y, m - 11 + i);
    const pp = vnParts(s);
    return { start: s, end: vnDate(y, m - 10 + i), label: `T${pp.m + 1}/${String(pp.y).slice(2)}` };
  });
}

export const inPeriod = (iso: string | null | undefined, p: { start: Date; end: Date }) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= p.start.getTime() && t < p.end.getTime();
};
