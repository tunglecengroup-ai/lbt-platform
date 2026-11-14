"use client";

import { useState } from "react";
import { Bold, Italic, Link2, List, Undo2, UserRound } from "lucide-react";
import { LINK_TOKENS, TEXT_TOKENS } from "@/lib/email-tokens";

/**
 * Soạn email như Word — không thấy mã. Tên khách, tên khóa… chèn bằng nút (hiện dạng [Tên khách]);
 * link vào học / thanh toán… chèn bằng nút, đường dẫn thật nằm ẩn trong link.
 * Nội dung ghi vào <input name={name}> cho server action (server tự đổi chữ trong ngoặc vuông về mã).
 */
export function EmailEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [html, setHtml] = useState(defaultValue);

  const attach = (el: HTMLDivElement | null) => {
    if (el && !el.dataset.loaded) {
      el.innerHTML = defaultValue;
      el.dataset.loaded = "1";
    }
  };

  const editorOf = (from: HTMLElement) =>
    from.closest("[data-email-editor]")?.querySelector<HTMLElement>("[contenteditable]") ?? null;

  const run = (from: HTMLElement, cmd: string, value?: string) => {
    const ed = editorOf(from);
    if (!ed) return;
    ed.focus();
    document.execCommand(cmd, false, value);
    setHtml(ed.innerHTML);
  };

  const btn = "hover:bg-background text-muted-foreground hover:text-foreground inline-flex h-8 items-center gap-1 rounded px-2 text-xs font-medium";
  const select = "hover:bg-background text-muted-foreground h-8 rounded border-0 bg-transparent px-1 text-xs font-medium outline-none";

  return (
    <div data-email-editor className="overflow-hidden rounded-md border">
      <div className="bg-muted/50 flex flex-wrap items-center gap-0.5 border-b p-1">
        <button type="button" title="In đậm" aria-label="In đậm" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => run(e.currentTarget, "bold")}><Bold className="size-4" /></button>
        <button type="button" title="In nghiêng" aria-label="In nghiêng" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => run(e.currentTarget, "italic")}><Italic className="size-4" /></button>
        <button type="button" title="Danh sách chấm" aria-label="Danh sách chấm" className={btn} onMouseDown={(e) => e.preventDefault()} onClick={(e) => run(e.currentTarget, "insertUnorderedList")}><List className="size-4" /></button>
        <button
          type="button"
          title="Bôi đen chữ rồi bấm để gắn link web bất kỳ"
          className={btn}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            const url = window.prompt("Dán đường link (https://...):");
            if (url) run(e.currentTarget, "createLink", url);
          }}
        >
          <Link2 className="size-4" /> Gắn link
        </button>
        <span className="bg-border mx-1 h-5 w-px" />
        <UserRound className="text-muted-foreground ml-1 size-3.5" />
        <select
          aria-label="Chèn thông tin khách"
          className={select}
          value=""
          onChange={(e) => {
            const t = TEXT_TOKENS.find((x) => x.key === e.target.value);
            if (t) run(e.currentTarget, "insertText", `[${t.label}]`);
          }}
        >
          <option value="">Chèn thông tin khách…</option>
          {TEXT_TOKENS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <select
          aria-label="Chèn link có sẵn"
          className={select}
          value=""
          onChange={(e) => {
            const t = LINK_TOKENS.find((x) => x.key === e.target.value);
            if (t) run(e.currentTarget, "insertHTML", `<a href="{{${t.key}}}">${t.text}</a>&nbsp;`);
          }}
        >
          <option value="">Chèn link có sẵn…</option>
          {LINK_TOKENS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <button type="button" title="Hoàn tác" aria-label="Hoàn tác" className={`${btn} ml-auto`} onMouseDown={(e) => e.preventDefault()} onClick={(e) => run(e.currentTarget, "undo")}><Undo2 className="size-4" /></button>
      </div>
      <div
        ref={attach}
        contentEditable
        onInput={(e) => setHtml(e.currentTarget.innerHTML)}
        onBlur={(e) => setHtml(e.currentTarget.innerHTML)}
        className="bg-background min-h-40 p-4 text-sm leading-relaxed outline-none [&_a]:text-blue-600 [&_a]:underline [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
      />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
