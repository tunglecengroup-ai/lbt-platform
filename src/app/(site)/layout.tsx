// Trang công khai được lưu sẵn (ISR) — phần riêng từng người (đã đăng nhập, đã mua) đọc ở trình duyệt.
// Trang cần cookie (trang mua, đơn hàng) tự động chạy động.

import { SiteHeader, SiteFooter } from "@/components/site-header";
import { JsonLd } from "@/components/json-ld";
import { organizationLd, orgId, personLd } from "@/lib/schema";
import { BRAND, siteUrl } from "@/lib/site";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Ai đứng sau trang web: tổ chức + tác giả (E-E-A-T), dùng chung mọi trang quảng bá */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            organizationLd(),
            personLd(),
            { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: BRAND.name, inLanguage: "vi-VN", publisher: { "@id": orgId() } },
          ],
        }}
      />
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
