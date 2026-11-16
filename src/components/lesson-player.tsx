"use client";

import { useEffect, useRef } from "react";

type YTPlayer = { getPlayerState: () => number };
type YTNamespace = { Player: new (el: HTMLIFrameElement, opts: object) => YTPlayer };
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytReady: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytReady) {
    ytReady = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT!);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return ytReady;
}

/** Gửi số giây vừa xem về máy chủ (sendBeacon: vẫn gửi được khi đang đóng/chuyển trang) */
function flush(lessonId: string, seconds: number) {
  if (seconds <= 0) return;
  const body = JSON.stringify({ lessonId, seconds });
  if (!navigator.sendBeacon?.("/api/hoc/xem", new Blob([body], { type: "application/json" }))) {
    fetch("/api/hoc/xem", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }
}

/**
 * Trình phát bài học: iframe video + đếm THỜI GIAN XEM THẬT (chỉ đếm giây video đang chạy).
 * YouTube: đọc trạng thái qua IFrame API mỗi giây; gửi về /api/hoc/xem mỗi 15 giây và khi rời trang.
 */
export function LessonPlayer({ embedUrl, title, lessonId }: { embedUrl: string; title: string; lessonId: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const isYouTube = /youtube(-nocookie)?\.com\/embed\//.test(embedUrl);
  const src = isYouTube ? `${embedUrl}${embedUrl.includes("?") ? "&" : "?"}enablejsapi=1` : embedUrl;

  useEffect(() => {
    if (!isYouTube || !ref.current) return;
    let player: YTPlayer | null = null;
    let pending = 0;
    let alive = true;

    loadYouTubeApi().then((YT) => {
      if (alive && ref.current) player = new YT.Player(ref.current, {});
    });

    const tick = setInterval(() => {
      try {
        if (player?.getPlayerState?.() === 1) pending += 1; // 1 = đang phát
      } catch {}
    }, 1000);
    const send = () => {
      flush(lessonId, pending);
      pending = 0;
    };
    const every = setInterval(send, 15_000);
    const onHide = () => {
      if (document.visibilityState === "hidden") send();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", send);

    return () => {
      alive = false;
      clearInterval(tick);
      clearInterval(every);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", send);
      send();
      player = null; // không destroy(): YouTube sẽ gỡ luôn thẻ iframe mà React đang quản lý
    };
  }, [isYouTube, lessonId]);

  return (
    <iframe
      key={lessonId}
      ref={ref}
      src={src}
      title={title}
      className="absolute inset-0 size-full"
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}
