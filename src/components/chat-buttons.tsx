"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Send, X, LoaderCircle } from "lucide-react";
import { track } from "@/lib/track";

/** Fanpage Lê Bá Tùng (page id) */
const MESSENGER_URL = "https://m.me/107057668896782";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING = "Chào anh/chị, em là trợ lý AI của Học viện Lê Bá Tùng. Anh/chị cần tư vấn khóa học, học thử hay cách thanh toán ạ?";
const SUGGESTIONS = ["Người mới nên học khóa nào?", "Học thử miễn phí thế nào?", "Giá khóa Facebook Ads Chuyên Sâu?", "Thanh toán và vào học ra sao?"];
const STORE_KEY = "lbt_tro_ly";

function MessengerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true" fill="currentColor">
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.98-.87c.17-.08.36-.09.53-.04.91.25 1.88.38 2.91.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2Zm6 7.46-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63Z" />
    </svg>
  );
}


/** Biến link trong câu trả lời thành thẻ <a> bấm được */
function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p.replace(/[.,;]$/, "")} target="_blank" rel="noopener" className="font-medium text-[#0068ff] underline break-all">
            {p.replace(/[.,;]$/, "")}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function AiChat({ onClose }: { onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORE_KEY);
      return saved ? (JSON.parse(saved) as Msg[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-20)));
    } catch {}
  }, [msgs]);

  async function ask(q: string) {
    const question = q.trim().slice(0, 800);
    if (!question || busy) return;
    setInput("");
    setBusy(true);
    const history: Msg[] = [...msgs, { role: "user", content: question }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/tro-ly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12) }),
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...history, { role: "assistant", content: acc }]);
      }
      if (!acc.trim()) setMsgs([...history, { role: "assistant", content: "Em chưa trả lời được, anh/chị thử lại hoặc nhắn Fanpage nhé." }]);
    } catch {
      setMsgs([...history, { role: "assistant", content: "Mất kết nối, anh/chị thử lại hoặc nhắn Fanpage nhé." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-[60] flex h-[min(75dvh,560px)] w-[min(calc(100vw-2rem),380px)] flex-col overflow-hidden rounded-2xl border bg-white text-gray-900 shadow-2xl">
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#0f1424] to-[#1d2b55] px-4 py-3 text-white">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#f5c451] text-black"><Bot className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Trợ lý AI · Học viện Lê Bá Tùng</p>
          <p className="text-xs text-white/70">Trả lời tự động 24/7</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-md p-1 hover:bg-white/10"><X className="size-5" /></button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3 text-sm leading-relaxed">
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">{GREETING}</div>
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-[#0068ff]/30 bg-white px-3 py-1.5 text-xs text-[#0068ff] hover:bg-[#0068ff]/5">
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#0068ff] px-3 py-2 whitespace-pre-wrap text-white">{m.content}</div>
          ) : (
            <div key={i} className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 whitespace-pre-wrap shadow-sm">
              {m.content ? <Linkify text={m.content} /> : <LoaderCircle className="size-4 animate-spin text-gray-400" />}
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t bg-white px-3 pt-2 pb-1 text-[11px] text-gray-500">
        Cần người thật? <a href={MESSENGER_URL} target="_blank" rel="noopener" onClick={() => track("contact", { channel: "messenger" })} className="font-medium text-[#0068ff]">Nhắn Fanpage Lê Bá Tùng</a>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 bg-white p-3 pt-1"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={800}
          placeholder="Nhập câu hỏi..."
          aria-label="Câu hỏi cho trợ lý AI"
          className="h-10 min-w-0 flex-1 rounded-full border bg-gray-50 px-4 text-sm outline-none focus:border-[#0068ff]"
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Gửi" className="flex size-10 items-center justify-center rounded-full bg-[#0068ff] text-white disabled:opacity-40">
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}

/** Trang không hiện nút (khu quản trị, trang duyệt bài nội bộ) */
const HIDDEN = (p: string) => p.startsWith("/admin") || p.startsWith("/duyet-") || p.startsWith("/l/xem-truoc");

/** Nút nổi góc dưới bên TRÁI trên toàn web: Trợ lý AI + nhắn Fanpage (Messenger) */
export function ChatButtons() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";
  const links = [
    { key: "messenger" as const, href: MESSENGER_URL, label: "Nhắn Fanpage", icon: <MessengerIcon />, bg: "bg-gradient-to-br from-[#00b2ff] via-[#006aff] to-[#a334fa]" },
  ];

  if (HIDDEN(pathname)) return null;
  if (open) return <AiChat onClose={() => setOpen(false)} />;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-3 print:hidden">
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          track("contact", { channel: "ai" });
        }}
        aria-label="Trợ lý AI"
        className="group flex items-center gap-2 text-left"
      >
        <span className="relative flex size-12 items-center justify-center rounded-full bg-[#f5c451] text-black shadow-lg ring-2 ring-white transition-transform group-hover:scale-110">
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#f5c451] opacity-40" />
          <Bot className="size-6" />
        </span>
        <span className="hidden rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-md md:inline-block">Trợ lý AI</span>
      </button>
      {links.map((it) => (
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
