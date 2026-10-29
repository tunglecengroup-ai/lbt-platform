import type { NextConfig } from "next";

// Khóa học bên Edubit nằm ngay dưới tên miền gốc (lebatung.vn/<slug>) -> chuyển 301 sang /khoa-hoc/<slug>
// để giữ thứ hạng Google và link cũ đã chia sẻ.
const EDUBIT_COURSES = [
  "ung-dung-ai-trong-quang-cao",
  "facebook-power-system",
  "facebook-ads-chuyen-sau-tu-a-z",
  "youtube-marketing",
  "facebook-ads-co-ban-den-nang-cao",
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...EDUBIT_COURSES.map((slug) => ({ source: `/${slug}`, destination: `/khoa-hoc/${slug}`, permanent: true })),
      { source: "/courses", destination: "/#khoa-hoc", permanent: true },
      { source: "/category/:cat", destination: "/blog", permanent: true },
      { source: "/activated", destination: "/hoc/kich-hoat", permanent: true },
      { source: "/signin", destination: "/hoc/dang-nhap", permanent: true },
      { source: "/signup", destination: "/hoc/dang-nhap", permanent: true },
      { source: "/cart", destination: "/#khoa-hoc", permanent: false },
    ];
  },
};

export default nextConfig;
