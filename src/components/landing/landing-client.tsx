"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { track, type TrackItem } from "@/lib/track";
import { UTM_KEYS, type Utm } from "@/lib/landing-blocks";
import { landingCheckout, type LandingCheckoutState } from "@/app/l/[slug]/actions";

// ---------- Nguồn khách (UTM) + mã người xem ----------

const store = {
  get: (s: Storage, k: string) => {
    try {
      return s.getItem(k);
    } catch {
      return null;
    }
  },
  set: (s: Storage, k: string, v: string) => {
    try {
      s.setItem(k, v);
    } catch {}
  },
};

/** UTM lấy từ link; nếu link không có (khách bấm qua lại) thì dùng UTM đã nhớ trong phiên */
function attribution(): Utm {
  const q = new URLSearchParams(location.search);
  const fromUrl: Utm = {};
  for (const k of UTM_KEYS) {
    const v = q.get(k);
    if (v) fromUrl[k] = v;
  }
  // Facebook gắn fbclid khi không có UTM -> ít nhất biết là từ Facebook
  if (!fromUrl.utm_source && q.get("fbclid")) fromUrl.utm_source = "facebook";
  if (Object.keys(fromUrl).length) {
    store.set(sessionStorage, "lbt_utm", JSON.stringify(fromUrl));
    return fromUrl;
  }
  try {
    return JSON.parse(store.get(sessionStorage, "lbt_utm") || "{}") as Utm;
  } catch {
    return {};
  }
}

function visitorId() {
  let id = store.get(localStorage, "lbt_vid");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    store.set(localStorage, "lbt_vid", id);
  }
  return id;
}

function send(landingId: string, kind: "view" | "checkout") {
  const body = JSON.stringify({ landing_id: landingId, kind, visitor_id: visitorId(), referrer: document.referrer, ...attribution() });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/l/event", new Blob([body], { type: "application/json" }));
  else fetch("/api/l/event", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
}

/** Ghi 1 lượt xem / phiên + bắn ViewContent (Pixel) & view_item (GA4) */
export function LandingTracker({ landingId, item, preview }: { landingId: string; item: TrackItem; preview?: boolean }) {
  useEffect(() => {
    if (preview) return;
    const flag = `lbt_lv_${landingId}`;
    if (!store.get(sessionStorage, flag)) {
      store.set(sessionStorage, flag, "1");
      send(landingId, "view");
    }
    const t = setTimeout(() => track("view_item", { item }), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingId, preview]);
  return null;
}

// ---------- Form đăng ký ----------

const inputClass =
  "h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-base text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-[var(--lp)] focus:ring-2 focus:ring-[var(--lp)]/20";

export function LandingCheckoutForm({
  landingId,
  buttonText,
  item,
  preview,
}: {
  landingId: string;
  buttonText: string;
  item: TrackItem;
  preview?: boolean;
}) {
  const [state, action, pending] = useActionState<LandingCheckoutState, FormData>(landingCheckout, {});
  const started = useRef(false);
  // Gắn UTM vào đơn lúc bấm gửi (đọc từ link / phiên)
  const submit = (fd: FormData) => {
    for (const [k, v] of Object.entries(attribution())) if (v) fd.set(k, v);
    return action(fd);
  };

  const onStart = () => {
    if (started.current || preview) return;
    started.current = true;
    send(landingId, "checkout");
    track("begin_checkout", { item });
  };

  return (
    <form action={submit} onFocus={onStart} className="space-y-3 text-left">
      <input type="hidden" name="landing_id" value={landingId} />
      <input name="name" required autoComplete="name" placeholder="Họ và tên" aria-label="Họ và tên" className={inputClass} />
      <input name="phone" type="tel" required autoComplete="tel" placeholder="Số điện thoại / Zalo" aria-label="Số điện thoại" className={inputClass} />
      <input name="email" type="email" required autoComplete="email" placeholder="Email (dùng để đăng nhập học)" aria-label="Email" className={inputClass} />
      {state.error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || preview}
        className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--lp)] text-lg font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? <><LoaderCircle className="size-5 animate-spin" /> Đang tạo đơn…</> : preview ? "Xem trước — không gửi được" : buttonText}
      </button>
      <p className="text-center text-xs text-zinc-500">🔒 Thông tin của bạn được bảo mật. Bước sau quét mã QR chuyển khoản, kích hoạt tự động.</p>
    </form>
  );
}

// ---------- Đếm ngược ----------

export function Countdown({ deadline }: { deadline: string }) {
  const end = new Date(deadline).getTime();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [end]);
  if (!Number.isFinite(end) || left === null || left <= 0) return null;
  const s = Math.floor(left / 1000);
  const parts = [
    [Math.floor(s / 86400), "Ngày"],
    [Math.floor((s % 86400) / 3600), "Giờ"],
    [Math.floor((s % 3600) / 60), "Phút"],
    [s % 60, "Giây"],
  ] as const;
  return (
    <div className="mt-5">
      <p className="text-sm font-medium text-zinc-600">Ưu đãi kết thúc sau</p>
      <div className="mt-2 flex justify-center gap-2">
        {parts.map(([n, l]) => (
          <div key={l} className="w-16 rounded-lg bg-zinc-900 py-2 text-white">
            <div className="text-2xl font-bold tabular-nums">{String(n).padStart(2, "0")}</div>
            <div className="text-[10px] tracking-wide uppercase opacity-70">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
