"""data.json (từ scrape.py) -> supabase/import-lebatung.sql

Chạy:  python scripts/edubit-import/build_sql.py <thư-mục-chứa-data.json>
"""
import json, os, re, sys

SRC = os.path.join(sys.argv[1], "data.json")
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "supabase", "import-lebatung.sql")
d = json.load(open(SRC, encoding="utf8"))

TAG = "$lbt$"


def q(s):
    """Chuỗi SQL an toàn bằng dollar-quote (nội dung có dấu nháy, HTML...)."""
    if s is None:
        return "null"
    s = str(s)
    assert TAG not in s
    return f"{TAG}{s}{TAG}"


def arr(items):
    return "array[" + ", ".join(q(i) for i in items) + "]::text[]" if items else "'{}'::text[]"


GRADIENTS = ["from-violet-500 to-fuchsia-600", "from-blue-600 to-indigo-700", "from-blue-500 to-cyan-600",
             "from-red-500 to-rose-600", "from-sky-500 to-blue-600"]

# Mô tả ngắn bên Edubit bị cắt dở / thiếu -> viết lại từ chính lời giới thiệu khóa (sửa tiếp trong Admin)
SUBTITLES = {
    "ung-dung-ai-trong-quang-cao": "Ra đơn ngay — dùng AI viết content, làm ảnh, video, trang bán hàng và chốt đơn tự động.",
    "youtube-marketing": "YouTube Marketing — đột phá doanh số không cạnh tranh, xây thương hiệu cá nhân và doanh nghiệp.",
    "facebook-ads-co-ban-den-nang-cao": "Quảng cáo Facebook cầm tay chỉ việc cho người mới — làm được và bắt đầu ra đơn.",
}

# Cảm nhận ở trang chủ lebatung.vn (khối slider)
HOME_REVIEWS = [
    ("Nguyễn Sơn Hải", "Du học", "Cám ơn thầy, nhờ khóa học em đã tăng doanh thu 100%, mở rộng tuyển thêm 5 nhân sự về làm cho kịp công việc."),
    ("Thùy Đoan", "Quần áo trẻ em", "Cám ơn thầy! Nhờ khóa học của thầy mà em đã biết cách chạy quảng cáo, biết cách xử lý các vấn đề của quảng cáo. Công việc kinh doanh bây giờ rất ổn."),
    ("Ngọc Anh", "Đầm thiết kế", "Nhờ áp dụng công thức chạy quảng cáo win của thầy mà chi phí quảng cáo rẻ hơn 5 lần."),
]

out = ["""-- =============================================================
-- Dữ liệu chuyển từ lebatung.vn (Edubit) — tạo bởi scripts/edubit-import/build_sql.py
-- Gồm: 5 khóa học (giá, mô tả, mục lục chương/bài), cảm nhận học viên, 11 bài blog,
--      trang "Lê Bá Tùng là ai" và "Liên hệ".
-- Chạy SAU schema.sql: SQL Editor → New query → dán → Run
--
-- ⚠️ Chạy lại sẽ XÓA và tạo lại chương/bài + đánh giá của 5 khóa dưới đây
--    (mất link video đã dán và tiến độ học). Chỉ chạy 1 LẦN lúc chuyển nhà.
-- Video: chưa có — vào Admin → Khóa học → từng bài, dán link YouTube.
-- =============================================================
"""]

for i, c in enumerate(d["courses"], 1):
    slug = c["slug"]
    out.append(f"\n-- ---------- KHÓA {i}: {c['title']} ----------")
    out.append(f"""insert into public.courses (slug, title, subtitle, description, cover_url, cover_gradient, price_vnd, compare_price_vnd, outcomes, is_published, position)
values ({q(slug)}, {q(c['title'])}, {q(SUBTITLES.get(slug) or c['subtitle'] or c['og_description'])}, {q(c['description'] or None)}, {q(c['cover_url'])}, {q(GRADIENTS[i - 1])}, {c['price'] or 0}, {c['compare_price'] or 'null'}, {arr(c['outcomes'])}, true, {i})
on conflict (slug) do update set
  title = excluded.title, subtitle = excluded.subtitle, description = excluded.description,
  cover_url = excluded.cover_url, price_vnd = excluded.price_vnd, compare_price_vnd = excluded.compare_price_vnd,
  outcomes = excluded.outcomes, is_published = excluded.is_published, position = excluded.position;

delete from public.chapters where course_id = (select id from public.courses where slug = {q(slug)});
delete from public.reviews where course_id = (select id from public.courses where slug = {q(slug)});""")
    for ci, ch in enumerate(c["chapters"], 1):
        if not ch["lessons"]:
            continue
        values = ",\n  ".join(
            f"({q(l['title'])}, {l['duration']}, {li}, {'true' if l['free'] else 'false'})"
            for li, l in enumerate(ch["lessons"], 1))
        out.append(f"""with c as (select id from public.courses where slug = {q(slug)}),
ch as (
  insert into public.chapters (course_id, title, position)
  select id, {q(ch['title'])}, {ci} from c
  returning id, course_id
)
insert into public.lessons (chapter_id, course_id, title, duration_seconds, position, is_free_preview)
select ch.id, ch.course_id, v.title, v.dur, v.pos, v.free
from ch, (values
  {values}
) as v(title, dur, pos, free);""")
    if c["reviews"]:
        values = ",\n  ".join(f"({q(r['name'])}, {q(r['content'])}, {ri})" for ri, r in enumerate(c["reviews"], 1))
        out.append(f"""insert into public.reviews (course_id, name, content, rating, position)
select (select id from public.courses where slug = {q(slug)}), v.name, v.content, 5, v.pos
from (values
  {values}
) as v(name, content, pos);""")

out.append("\n-- ---------- CẢM NHẬN TRANG CHỦ ----------")
out.append("delete from public.reviews where course_id is null and is_featured = true and name in ("
           + ", ".join(q(n) for n, _, _ in HOME_REVIEWS) + ");")
values = ",\n  ".join(f"({q(n)}, {q(r)}, {q(t)}, {i})" for i, (n, r, t) in enumerate(HOME_REVIEWS, 1))
out.append(f"""insert into public.reviews (name, role, content, rating, is_featured, position)
select v.name, v.role, v.content, 5, true, v.pos
from (values
  {values}
) as v(name, role, content, pos);""")


def demote_h1(html):
    # Tiêu đề trang đã là <h1> -> đổi <h1> trong nội dung thành <h2> (chuẩn SEO: 1 trang 1 h1)
    return re.sub(r"<(/?)h1>", r"<\1h2>", html)


out.append("\n-- ---------- BLOG + TRANG TĨNH ----------")
rows = []
for p in d["posts"]:
    date = f"{q(p['published_at'] + 'T08:00:00+07:00')}::timestamptz" if p["published_at"] else "now()"
    rows.append(f"({q('post')}, {q(p['slug'])}, {q(p['title'])}, {q(p['excerpt'])}, {q(p['cover_url'])}, "
                f"{q(demote_h1(p['content_html']))}, true, {date})")
for p in d["pages"]:
    title = "Lê Bá Tùng là ai?" if p["slug"] == "le-ba-tung-la-ai" else "Liên hệ" if p["slug"] == "lien-he" else p["title"]
    rows.append(f"({q('page')}, {q(p['slug'])}, {q(title)}, {q(p['excerpt'])}, null, "
                f"{q(demote_h1(p['content_html']))}, true, now())")
out.append("insert into public.posts (kind, slug, title, excerpt, cover_url, content_html, is_published, published_at)\nvalues\n"
           + ",\n".join(rows)
           + """
on conflict (kind, slug) do update set
  title = excluded.title, excerpt = excluded.excerpt, cover_url = excluded.cover_url,
  content_html = excluded.content_html, is_published = excluded.is_published,
  published_at = excluded.published_at, updated_at = now();""")

open(OUT, "w", encoding="utf8", newline="\n").write("\n".join(out) + "\n")
print("Đã ghi", os.path.normpath(OUT))
