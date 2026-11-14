"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SOURCE_COOKIE, touchFrom, type Attribution, type Touch } from "@/lib/channels";

/**
 * Ghi NGUỒN KHÁCH ở mọi trang (trừ admin):
 *  • Lần chạm ĐẦU (first) giữ 180 ngày — biết khách biết tới web nhờ kênh nào
 *  • Lần chạm GẦN NHẤT (last) — không ghi đè bằng "trực tiếp" (giống GA: last non-direct click)
 *  • Gửi 1 lượt ghé / phiên về /api/track/visit
 *  • Ghi cookie lbt_src để máy chủ gắn nguồn vào đơn hàng / tài khoản mới
 * Chỉ lưu nguồn (kênh, UTM, trang vào) — không có thông tin cá nhân.
 */
const FIRST_KEY = "lbt_ft";
const LAST_KEY = "lbt_lt";
const SESSION_KEY = "lbt_visit";
const DAYS = 180;

const ls = {
  get<T>(k: string): T | undefined {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : undefined;
    } catch {
      return undefined;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

function visitorId() {
  try {
    let id = localStorage.getItem("lbt_vid");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("lbt_vid", id);
    }
    return id;
  } catch {
    return undefined;
  }
}

const slim = (t?: Touch) =>
  t && { ...t, referrer: t.referrer?.slice(0, 120), landing: t.landing?.slice(0, 120) };

export function SourceTracker() {
  const pathname = usePathname();
  const skip = pathname?.startsWith("/admin");

  useEffect(() => {
    if (skip) return;
    const touch = touchFrom(new URL(location.href), document.referrer);
    let first = ls.get<Touch>(FIRST_KEY);
    let last = ls.get<Touch>(LAST_KEY);
    const expired = first && Date.now() - new Date(first.at).getTime() > DAYS * 86_400_000;
    const isFirst = !first || !!expired;

    if (touch) {
      if (isFirst) {
        first = touch;
        ls.set(FIRST_KEY, first);
      }
      if (!last || touch.channel !== "direct") {
        last = touch;
        ls.set(LAST_KEY, last);
      }
    }

    // Cookie cho máy chủ (gắn nguồn vào đơn / tài khoản)
    if (first || last) {
      const value = btoa(unescape(encodeURIComponent(JSON.stringify({ f: slim(first), l: slim(last) } satisfies Attribution))));
      document.cookie = `${SOURCE_COOKIE}=${value}; Path=/; Max-Age=${DAYS * 86400}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    }

    // 1 lượt ghé / phiên
    let logged = false;
    try {
      logged = !!sessionStorage.getItem(SESSION_KEY);
    } catch {}
    if (touch && !logged) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {}
      const body = JSON.stringify({ ...touch, visitor_id: visitorId(), is_first: isFirst });
      if (!navigator.sendBeacon?.("/api/track/visit", new Blob([body], { type: "application/json" }))) {
        fetch("/api/track/visit", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
      }
    }
    // chỉ chạy khi trang được tải (referrer chỉ có ý nghĩa lúc đó)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
