/**
 * Bộ lọc nội dung trước khi đăng — chép từ D:/Git/fb-scheduler/batch/kiem_noi_dung.py (6 điều cấm anh chốt 14/11/2026)
 * + luật fanpage chống spam (13–14/11): thân bài không link, link chỉ pke.to ở bình luận đầu, ≤3 bài/ngày, cách ≥2 giờ.
 */

// \b của JS không hiểu chữ có dấu -> thay bằng ranh giới chữ Unicode
const B = (src: string) => {
  // \b ở đầu -> lookbehind, \b ở cuối -> lookahead
  const s = src.replace(/^\\b/, "(?<![\\p{L}\\p{N}])").replace(/\\b$/, "(?![\\p{L}\\p{N}])").replace(/\\b/g, "(?<![\\p{L}\\p{N}])");
  return new RegExp(s, "giu");
};

const LUAT: Record<string, { label: string; pats: string[] }> = {
  "1": {
    label: "Khẳng định thiếu chứng cứ",
    pats: [
      "chắc chắn\\s+(ra|có|thành|hiệu quả|thắng)", "\\b100\\s*%", "đảm bảo\\s+(ra|hiệu quả|thành công|có đơn)",
      "cam kết\\s+(hiệu quả|ra đơn|doanh thu|kết quả|thành công)",
      "(cách|cách thức|bí quyết|giải pháp|con đường|khóa học|phương pháp)\\s+(\\S+\\s+){0,5}?(duy nhất|nhanh nhất|tốt nhất|hiệu quả nhất)",
      "(win|ra đơn|bán hàng|kiếm tiền|lên top)\\s+(nhanh|tốt)\\s+nhất",
    ],
  },
  "2": {
    label: "Từ tục / miệt thị",
    pats: ["\\bđéo\\b", "\\bvcl\\b", "\\bvl\\b", "\\bđm\\b", "\\bdm\\b", "\\bcc\\b", "\\bvãi\\b", "\\bđ[ịi]t\\b", "\\blồn\\b", "\\bcặc\\b", "\\bngu\\s+như", "\\bmẹ\\s+kiếp", "\\bchó\\s+má"],
  },
  "3": {
    label: "Cam kết tiền bạc / thu nhập",
    pats: [
      "kiếm\\s+(được\\s+)?\\d+[\\.,]?\\d*\\s*(triệu|tr|củ|nghìn|k)\\b", "thu nhập\\s+(thụ động|khủng|\\d)", "\\d+\\s*(triệu|tr)\\s*/\\s*(tháng|ngày)",
      "\\bx\\s?[2-9]\\s+doanh thu", "gấp\\s+(đôi|\\d+)\\s+doanh thu", "hoàn vốn", "làm giàu", "giàu\\s+nhanh", "bao\\s+ra\\s+đơn", "ra đơn ngay", "tiền\\s+về\\s+đều", "nghỉ việc vẫn",
    ],
  },
  "4": {
    label: "Đầu tư / tiền ảo / đa cấp / cờ bạc",
    pats: [
      "\\bđầu tư\\b", "chứng khoán", "\\bforex\\b", "\\bcoin\\b", "bitcoin", "\\bcrypto", "tiền ảo", "tiền số", "\\btoken\\b", "\\bnft\\b", "sàn giao dịch", "lãi suất",
      "góp vốn", "huy động vốn", "đa cấp", "\\bmlm\\b", "tuyến dưới", "cá cược", "cờ bạc", "\\bcasino\\b",
    ],
  },
  "5": {
    label: "Mượn thương hiệu bên thứ 3",
    pats: [
      "đối tác\\s+(của\\s+)?(meta|facebook|google|tiktok|youtube)", "(meta|facebook|google|tiktok|youtube)\\s+chứng nhận",
      "được\\s+(meta|facebook|google)\\s+(công nhận|bảo trợ|xác nhận)", "phạm thành long", "huân academy", "\\bshark\\s+\\S+",
      "mai xuân đạt", "đặng hữu sơn", "\\bunica\\b", "\\bgitiho\\b", "\\bmci\\b",
    ],
  },
  "6": {
    label: "Tuyển dụng",
    pats: [
      "\\btuyển\\s+(\\d+\\s+)?(nhân viên|nhân sự|ctv|cộng tác viên|đại lý|thực tập|gấp|dụng)", "tuyển dụng", "ứng tuyển", "gửi\\s+cv", "\\bcv\\b",
      "mức lương", "lương\\s+(cứng|cơ bản|thỏa thuận|từ|\\d)", "việc làm thêm", "làm việc tại nhà", "tìm việc",
    ],
  },
};

const COMPILED = Object.entries(LUAT).map(([k, v]) => ({ key: k, label: v.label, res: v.pats.map(B) }));

export type RuleHit = { rule: string; label: string; text: string };

/** Quét 6 điều cấm. Trả về các cụm vi phạm (rỗng = sạch). */
export function checkContent(text: string): RuleHit[] {
  const t = text.toLowerCase();
  const out: RuleHit[] = [];
  for (const r of COMPILED) {
    for (const re of r.res) {
      re.lastIndex = 0;
      for (const m of t.matchAll(re)) out.push({ rule: r.key, label: r.label, text: m[0] });
    }
  }
  // "70% chủ shop…" không ghi nguồn
  for (const m of t.matchAll(/(?<![\p{L}\p{N}])\d{1,3}\s*%\s+(người|chủ shop|doanh nghiệp|anh em|shop)/giu)) {
    const a = t.lastIndexOf("\n", m.index ?? 0);
    const b = t.indexOf("\n", (m.index ?? 0) + m[0].length);
    const para = t.slice(Math.max(a, 0), b > 0 ? b : t.length);
    if (!/báo cáo|khảo sát|nguồn|theo |thống kê|nghiên cứu|ghi nhận/.test(para)) out.push({ rule: "1", label: "Số % không ghi nguồn", text: m[0] });
  }
  return out;
}

const URL_RE = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|vn|net|to|me|ly|gd|link|io|co)(\/\S*)?/gi;
const BANNED_SHORT = /(tinyurl|is\.gd|bit\.ly|bom\.so|cutt\.ly|rb\.gy|t\.ly)/i;

/** Luật riêng fanpage Facebook */
export function checkFacebook(body: string, commentLink: string | null) {
  const errors: string[] = [];
  if (URL_RE.test(body)) errors.push("Thân bài fanpage không được chứa link — để link pke.to ở ô “Link bình luận đầu”.");
  URL_RE.lastIndex = 0;
  if (commentLink) {
    if (BANNED_SHORT.test(commentLink)) errors.push("Cấm link rút gọn tinyurl / bit.ly / is.gd / bom.so — chỉ dùng pke.to của Webcake.");
    else if (!/^https?:\/\/pke\.to\//i.test(commentLink.trim())) errors.push("Link bình luận đầu fanpage phải là link pke.to của Webcake.");
  }
  return errors;
}
