"use client";

import { useState } from "react";
import { Bold, Code, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Soạn bài kiểu Word — không cần thư viện ngoài.
 * Nội dung ghi vào <input name={name}> để form server action nhận được.
 * Dán từ Google Docs/Word được; server sẽ lọc bỏ style rác khi lưu.
 */
export function RichEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [html, setHtml] = useState(defaultValue);
  const [source, setSource] = useState(false);

  // Nạp HTML 1 lần khi khung soạn xuất hiện (lần đầu / quay lại từ chế độ HTML).
  // Sau đó React KHÔNG đụng vào nội dung nữa -> không mất chữ, không nhảy con trỏ khi trang render lại.
  const attachEditor = (el: HTMLDivElement | null) => {
    if (el && !el.dataset.loaded) {
      el.innerHTML = html;
      el.dataset.loaded = "1";
    }
  };

  const sync = (el: HTMLElement) => setHtml(el.innerHTML);

  // Lệnh định dạng; ask = hỏi link trước khi chèn
  const tools: { icon: typeof Bold; label: string; cmd: string; value?: string; ask?: string }[] = [
    { icon: Heading2, label: "Tiêu đề lớn", cmd: "formatBlock", value: "h2" },
    { icon: Heading3, label: "Tiêu đề nhỏ", cmd: "formatBlock", value: "h3" },
    { icon: Bold, label: "In đậm", cmd: "bold" },
    { icon: Italic, label: "In nghiêng", cmd: "italic" },
    { icon: List, label: "Danh sách chấm", cmd: "insertUnorderedList" },
    { icon: ListOrdered, label: "Danh sách số", cmd: "insertOrderedList" },
    { icon: Quote, label: "Trích dẫn", cmd: "formatBlock", value: "blockquote" },
    { icon: Link2, label: "Chèn link", cmd: "createLink", ask: "Dán đường link:" },
    { icon: ImagePlus, label: "Chèn ảnh", cmd: "insertImage", ask: "Dán link ảnh (https://...):" },
    { icon: Undo2, label: "Hoàn tác", cmd: "undo" },
  ];

  const runTool = (t: (typeof tools)[number], button: HTMLElement) => {
    const editor = button.closest("[data-rich-editor]")?.querySelector<HTMLElement>("[contenteditable]");
    if (!editor) return;
    const value = t.ask ? window.prompt(t.ask) : t.value;
    if (t.ask && !value) return;
    editor.focus();
    document.execCommand(t.cmd, false, value ?? undefined);
    sync(editor);
  };

  return (
    <div data-rich-editor className="overflow-hidden rounded-md border">
      <div className="bg-muted/50 flex flex-wrap items-center gap-0.5 border-b p-1">
        {!source &&
          tools.map((t) => (
            <button
              key={t.label}
              type="button"
              title={t.label}
              aria-label={t.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => runTool(t, e.currentTarget)}
              className="hover:bg-background text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded"
            >
              <t.icon className="size-4" />
            </button>
          ))}
        <button
          type="button"
          onClick={() => setSource(!source)}
          className={cn(
            "ml-auto inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium",
            source ? "bg-primary text-primary-foreground" : "hover:bg-background text-muted-foreground",
          )}
        >
          <Code className="size-3.5" /> {source ? "Quay lại soạn thảo" : "Sửa mã HTML"}
        </button>
      </div>

      {source ? (
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={24}
          className="bg-background block w-full p-3 font-mono text-xs outline-none"
        />
      ) : (
        <div
          ref={attachEditor}
          contentEditable
          onInput={(e) => sync(e.currentTarget)}
          onBlur={(e) => sync(e.currentTarget)}
          className="post-content bg-background min-h-96 p-4 outline-none"
        />
      )}
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
