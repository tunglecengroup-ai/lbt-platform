"use client";

import { track } from "@/lib/track";

/** Fanpage Lê Bá Tùng (page id) + Zalo hỗ trợ */
const MESSENGER_URL = "https://m.me/107057668896782";
const ZALO_URL = "https://zalo.me/0869126363";

function MessengerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true" fill="currentColor">
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.98-.87c.17-.08.36-.09.53-.04.91.25 1.88.38 2.91.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2Zm6 7.46-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63Z" />
    </svg>
  );
}

function ZaloIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-7" aria-hidden="true">
      <text x="24" y="31" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="17" fill="currentColor">Zalo</text>
    </svg>
  );
}

/** Nút nổi góc dưới bên TRÁI: nhắn Fanpage (Messenger) + Zalo — khách dễ thấy, bấm là chat */
export function ChatButtons() {
  const items = [
    { key: "messenger" as const, href: MESSENGER_URL, label: "Nhắn Fanpage", icon: <MessengerIcon />, bg: "bg-gradient-to-br from-[#00b2ff] via-[#006aff] to-[#a334fa]" },
    { key: "zalo" as const, href: ZALO_URL, label: "Chat Zalo", icon: <ZaloIcon />, bg: "bg-[#0068ff]" },
  ];
  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-3 print:hidden">
      {items.map((it) => (
        <a
          key={it.key}
          href={it.href}
          target="_blank"
          rel="noopener"
          aria-label={it.label}
          onClick={() => track("contact", { channel: it.key })}
          className="group flex items-center gap-2"
        >
          <span className={`relative flex size-12 items-center justify-center rounded-full text-white shadow-lg ring-2 ring-white transition-transform group-hover:scale-110 ${it.bg}`}>
            <span className={`absolute inset-0 -z-10 animate-ping rounded-full opacity-40 ${it.bg}`} />
            {it.icon}
          </span>
          <span className="hidden rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-md md:inline-block">{it.label}</span>
        </a>
      ))}
    </div>
  );
}
