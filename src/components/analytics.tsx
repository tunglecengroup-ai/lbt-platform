"use client";

import { useEffect, useSyncExternalStore } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { ADS_ID, GA4_ID, PIXEL_ID, trackingEnabled } from "@/lib/track";

/**
 * GA4 + Google Ads + Meta Pixel với HỎI ĐỒNG Ý COOKIE (Consent Mode v2 — chuẩn Google bắt buộc từ 2024,
 * phù hợp Nghị định 13/2023 về dữ liệu cá nhân):
 *  • Chưa đồng ý: GA4 chạy chế độ không cookie (Google vẫn ước lượng chuyển đổi), Meta Pixel CHƯA tải
 *  • Đồng ý: bật cookie phân tích + quảng cáo, tải Meta Pixel
 *  • Không chạy trong khu admin
 */
const KEY = "lbt_consent";
const listeners = new Set<() => void>();
const readConsent = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

function setConsent(v: "granted" | "denied") {
  try {
    localStorage.setItem(KEY, v);
  } catch {}
  window.gtag?.("consent", "update", {
    analytics_storage: v,
    ad_storage: v,
    ad_user_data: v,
    ad_personalization: v,
  });
  listeners.forEach((l) => l());
}

const GTAG_INIT = `
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
var c='denied';try{if(localStorage.getItem('${KEY}')==='granted')c='granted';}catch(e){}
gtag('consent','default',{analytics_storage:c,ad_storage:c,ad_user_data:c,ad_personalization:c,wait_for_update:500});
gtag('set','linker',{domains:['lebatung.com','hoc.lebatung.com']});
gtag('js',new Date());
${GA4_ID ? `gtag('config','${GA4_ID}',{send_page_view:false});` : ""}
${ADS_ID ? `gtag('config','${ADS_ID}');` : ""}`;

const PIXEL_INIT = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');`;

export function Analytics() {
  const pathname = usePathname();
  const search = useSearchParams();
  const consent = useSyncExternalStore(subscribe, readConsent, () => "pending");
  const isAdmin = pathname.startsWith("/admin");

  // page_view mỗi lần đổi trang (Next chuyển trang không tải lại)
  useEffect(() => {
    if (isAdmin || !GA4_ID) return;
    const t = setTimeout(() => window.gtag?.("event", "page_view", { page_location: window.location.href, page_title: document.title }), 0);
    return () => clearTimeout(t);
  }, [pathname, search, isAdmin]);

  // Meta Pixel chỉ chạy sau khi đồng ý: PageView khi đổi trang hoặc ngay lúc vừa đồng ý
  useEffect(() => {
    if (isAdmin || !PIXEL_ID || consent !== "granted") return;
    const t = setTimeout(() => window.fbq?.("track", "PageView"), 0);
    return () => clearTimeout(t);
  }, [pathname, search, consent, isAdmin]);

  if (!trackingEnabled() || isAdmin) return null;
  const gtagId = GA4_ID || ADS_ID;

  return (
    <>
      {gtagId && (
        <>
          <Script id="gtag-init" strategy="afterInteractive">{GTAG_INIT}</Script>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`} strategy="afterInteractive" />
        </>
      )}
      {PIXEL_ID && consent === "granted" && <Script id="fb-pixel" strategy="afterInteractive">{PIXEL_INIT}</Script>}

      {consent === null && (
        <div role="dialog" aria-label="Đồng ý cookie" className="bg-card fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-xl border p-4 shadow-lg md:inset-x-auto md:right-4 md:left-4">
          <p className="text-sm">
            Chúng tôi dùng cookie để đo lường và cải thiện quảng cáo (Google Analytics, Meta Pixel). Bạn đồng ý chứ?
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setConsent("denied")} className="hover:bg-muted rounded-md px-3 py-1.5 text-sm">Từ chối</button>
            <button onClick={() => setConsent("granted")} className="bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-medium">Đồng ý</button>
          </div>
        </div>
      )}
    </>
  );
}
