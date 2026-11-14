"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { CHANNELS, LINK_CHANNELS } from "@/lib/channels";
import { CopyField } from "../landing/[id]/editor-client";
import { createTrackingLink, type LinkState } from "./actions";

export function TrackingLinkForm({ targets }: { targets: { label: string; path: string }[] }) {
  const [state, action, pending] = useActionState<LinkState, FormData>(createTrackingLink, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label="Kênh đăng">
        <select name="channel" required defaultValue="" className={inputClass}>
          <option value="" disabled>— Chọn kênh —</option>
          {LINK_CHANNELS.map((c) => <option key={c.channel} value={c.channel}>{CHANNELS[c.channel].label}</option>)}
        </select>
      </Field>
      <Field label="Trang đích">
        <select name="target" defaultValue="/" className={inputClass}>
          {targets.map((t) => <option key={t.path} value={t.path}>{t.label}</option>)}
        </select>
      </Field>
      <Field label="Hoặc dán đường dẫn khác" hint="vd: /blog/ten-bai — để trống thì dùng trang đích ở trên" className="sm:col-span-2">
        <input name="custom" className={inputClass} placeholder="/blog/..." />
      </Field>
      <Field label="Tên chiến dịch" hint="Nhóm các bài cùng mục tiêu, vd: khoa-ai-t11">
        <input name="campaign" required className={inputClass} placeholder="khoa-ai-t11" />
      </Field>
      <Field label="Nội dung / bài cụ thể" hint="Phân biệt từng bài, vd: video-hook-1, bai-15-11">
        <input name="content" className={inputClass} placeholder="bai-15-11" />
      </Field>
      <Field label="Ghi chú (tùy chọn)" className="sm:col-span-2"><input name="name" className={inputClass} placeholder="Bài reel 15/11 về quảng cáo tin nhắn" /></Field>
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Đang tạo…" : "Tạo link"}</Button></div>
      {state.error && <p className="text-danger text-sm sm:col-span-2">{state.error}</p>}
      {state.url && (
        <div className="sm:col-span-2">
          <CopyField label="Link đã tạo — dán vào bài đăng" value={state.url} />
          <p className="text-muted-foreground mt-1 text-xs">Riêng fanpage Facebook đang áp dụng luật chỉ đăng link pke.to của Webcake ở bình luận đầu — link này dùng cho TikTok, YouTube, Instagram, Zalo, email…</p>
        </div>
      )}
    </form>
  );
}
