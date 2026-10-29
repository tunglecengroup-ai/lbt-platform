"""Tải nội dung lebatung.vn (Edubit) -> data.json + ảnh vào public/ của lbt-platform."""
import json, os, re, sys, hashlib
import requests
from bs4 import BeautifulSoup, Comment

OUT = sys.argv[1]            # thư mục ghi data.json
PUBLIC = sys.argv[2]         # D:/Git/lbt-platform/public
BASE = "https://lebatung.vn"
S = requests.Session()
S.headers["User-Agent"] = "Mozilla/5.0"

COURSES = ["ung-dung-ai-trong-quang-cao", "facebook-power-system", "facebook-ads-chuyen-sau-tu-a-z",
           "youtube-marketing", "facebook-ads-co-ban-den-nang-cao"]
PAGES = ["le-ba-tung-la-ai", "lien-he"]


def get(url):
    r = S.get(url, timeout=60)
    r.raise_for_status()
    return BeautifulSoup(r.text, "lxml")


def download(src, folder):
    """Tải ảnh về public/<folder>/, trả đường dẫn web /<folder>/<file>."""
    if not src or src.startswith("data:"):
        return src
    if src.startswith("/"):
        src = BASE + src
    name = os.path.basename(src.split("?")[0]) or "img"
    name = re.sub(r"[^\w.-]", "-", name)
    if "." not in name:
        name += ".jpg"
    name = hashlib.md5(src.encode()).hexdigest()[:6] + "-" + name
    d = os.path.join(PUBLIC, folder)
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, name)
    if not os.path.exists(p):
        try:
            r = S.get(src, timeout=60)
            r.raise_for_status()
            open(p, "wb").write(r.content)
        except Exception as e:
            print("  ! không tải được", src, e)
            return src
    return f"/{folder}/{name}"


def clean_html(node, folder):
    """Bỏ data-*, style rác, script; tải ảnh về máy."""
    for t in node(["script", "style", "noscript", "iframe", "link"]):
        if t.name == "iframe" and "youtube" in (t.get("src") or ""):
            continue
        t.decompose()
    for c in node.find_all(string=lambda s: isinstance(s, Comment)):
        c.extract()
    for t in node.find_all(True):
        for a in list(t.attrs):
            if a.startswith("data-") or a in ("class", "id", "style", "dir", "width", "height", "border",
                                               "cellpadding", "cellspacing", "align"):
                del t.attrs[a]
        if t.name == "img":
            t["src"] = download(t.get("src"), folder)
            t["alt"] = t.get("alt") or ""
            t["loading"] = "lazy"
        if t.name == "a" and t.get("href", "").startswith(BASE):
            t["href"] = t["href"][len(BASE):] or "/"
    for t in node.find_all(["span", "div", "font"]):
        t.unwrap()
    for _ in range(3):
        for t in node.find_all(["p", "h1", "h2", "h3", "h4", "b", "strong", "em", "li", "ul"]):
            if not t.get_text(strip=True) and not t.find("img"):
                t.decompose()
    html = node.decode_contents()
    html = re.sub(r"\n{3,}", "\n\n", html)
    html = re.sub(r"<p>(\s|&nbsp;|\xa0)*</p>", "", html)
    return html.strip()


def text_block(node):
    for br in node.find_all("br"):
        br.replace_with("\n")
    lines = []
    for el in node.find_all(["p", "li", "h1", "h2", "h3", "h4"]):
        if el.find(["p", "li"]):
            continue
        t = el.get_text(" ", strip=True).replace("\xa0", " ")
        t = re.sub(r"\s+", " ", t)
        if t:
            lines.append(("• " if el.name == "li" else "") + t)
    return "\n".join(lines)


def to_sec(s):
    parts = [int(p) for p in s.split(":")]
    v = 0
    for p in parts:
        v = v * 60 + p
    return v


def meta(s, prop):
    m = s.find("meta", attrs={"property": prop}) or s.find("meta", attrs={"name": prop})
    return m["content"].strip() if m and m.get("content") else None


def parse_price(s):
    return int(re.sub(r"\D", "", s)) if s and re.search(r"\d", s) else None


def scrape_course(slug):
    s = get(f"{BASE}/{slug}")
    title = s.select_one("h1.course_name_theme").get_text(strip=True)
    sub = s.select_one(".intro-chitiet")
    subtitle = re.sub(r"\s+", " ", sub.get_text(" ", strip=True)) if sub else None
    pb = s.select_one(".price-box-theme")
    price = parse_price(pb.find("strong").get_text()) if pb and pb.find("strong") else 0
    compare = parse_price(pb.find("del").get_text()) if pb and pb.find("del") else None
    og_desc = meta(s, "og:description")
    outcomes = []
    box = s.find(id="about_instructor_courses")
    if box:
        outcomes = [re.sub(r"\s+", " ", li.get_text(" ", strip=True)) for li in box.find_all("li")]
        outcomes = [o for o in outcomes if o]
    about = s.find(id="about_courses")
    desc = ""
    if about:
        h = about.find("h2")
        if h:
            h.decompose()
        desc = text_block(about)
    chapters = []
    cc = s.find(id="content_courses")
    if cc:
        for cp in cc.select(".cp"):
            btn = cp.select_one(".hd-cp button")
            ch = {"title": re.sub(r"\s+", " ", btn.get_text(" ", strip=True)), "lessons": []}
            for li in cp.select("ul li"):
                name = li.select_one("span.flex-1")
                if not name:
                    continue
                spans = [sp.get_text(strip=True) for sp in li.find_all("span")]
                dur = next((x for x in spans if re.fullmatch(r"\d{1,2}(:\d{2}){1,2}", x)), None)
                ch["lessons"].append({
                    "title": re.sub(r"\s+", " ", name.get_text(" ", strip=True)),
                    "duration": to_sec(dur) if dur else 0,
                    "free": li.select_one(".review-demo") is not None,
                })
            chapters.append(ch)
    reviews = []
    for c in s.select(".list-comment-course"):
        name = c.select_one(".name-student")
        cm = c.select_one(".cm-hv")
        if not name or not cm:
            continue
        for t in cm(["script", "span"]):
            t.decompose()
        txt = re.sub(r"\s+", " ", cm.get_text(" ", strip=True))
        if txt:
            reviews.append({"name": name.get_text(strip=True), "content": txt})
    cover = meta(s, "og:image")
    return {
        "slug": slug, "title": title, "subtitle": subtitle, "price": price, "compare_price": compare, "og_description": og_desc, "outcomes": outcomes,
        "description": desc, "chapters": chapters, "reviews": reviews,
        "cover_url": download(cover, "courses") if cover else None,
    }


def scrape_post(url, folder_root="blog"):
    s = get(url)
    slug = url.rstrip("/").split("/")[-1]
    title = s.select_one("h1.blog-title") or s.select_one("#main h1")
    m = s.select_one(".blog-post-meta")
    date = None
    if m:
        d = re.search(r"(\d{2})/(\d{2})/(\d{4})", m.get_text())
        if d:
            date = f"{d.group(3)}-{d.group(2)}-{d.group(1)}"
    body = s.find(id="content_news") or s.select_one(".blog-post") or s.select_one("#main .container")
    cover = meta(s, "og:image")
    cats = [a.get_text(strip=True) for a in s.select('a[href*="/category/"]')]
    return {
        "slug": slug,
        "title": title.get_text(" ", strip=True) if title else slug,
        "excerpt": meta(s, "description") or meta(s, "og:description"),
        "published_at": date,
        "cover_url": download(cover, f"{folder_root}/{slug}") if cover else None,
        "content_html": clean_html(body, f"{folder_root}/{slug}") if body else "",
    }


def scrape_page(slug):
    s = get(f"{BASE}/p/{slug}")
    main = s.find(id="main") or s.body
    title = main.find("h1")
    for sel in ["nav", ".breadcrumb", "footer", "header"]:
        for t in main.select(sel):
            t.decompose()
    t = title.get_text(" ", strip=True) if title else slug
    if title:
        title.decompose()
    return {"slug": slug, "title": t, "excerpt": meta(s, "description"),
            "content_html": clean_html(main, f"pages/{slug}")}


def main():
    blog = get(f"{BASE}/blog")
    urls = set()
    for a in blog.select('a[href*="/blog/"]'):
        urls.add(a["href"].split("?")[0])
    for cat in ["ban-be-cua-toi", "facebook-marketing", "nguoi-toi-kinh-trong"]:
        for a in get(f"{BASE}/category/{cat}").select('a[href*="/blog/"]'):
            urls.add(a["href"].split("?")[0])
    home = get(BASE)
    for a in home.select('a[href*="/blog/"]'):
        urls.add(a["href"].split("?")[0])
    urls = sorted(u if u.startswith("http") else BASE + u for u in urls)
    print(len(urls), "bài blog")

    data = {"courses": [], "posts": [], "pages": []}
    for c in COURSES:
        print("khóa", c)
        data["courses"].append(scrape_course(c))
    for u in urls:
        print("bài", u)
        data["posts"].append(scrape_post(u))
    for p in PAGES:
        print("trang", p)
        data["pages"].append(scrape_page(p))
    os.makedirs(OUT, exist_ok=True)
    json.dump(data, open(os.path.join(OUT, "data.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)


main()
