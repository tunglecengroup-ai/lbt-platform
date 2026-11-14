"use client";

import { useRef, useState } from "react";
import { ImageUp, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";

/** Thu nhỏ ảnh trong trình duyệt (tối đa 1600px, JPEG 85%) để tải lên nhanh, nhẹ trang */
async function shrink(file: File): Promise<File> {
  if (file.type === "image/gif" || file.size < 300_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? new File([blob], "cover.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/**
 * Ô ảnh bìa: dán link HOẶC bấm "Tải ảnh từ máy" (tải lên kho ảnh, tự điền link) + xem trước.
 * Giá trị gửi theo form qua input name={name}.
 */
export function CoverUpload({
  name,
  defaultValue,
  courseId,
  upload,
}: {
  name: string;
  defaultValue: string;
  courseId: string;
  upload: (form: FormData) => Promise<{ url?: string; error?: string }>;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("course_id", courseId);
      fd.set("file", await shrink(picked));
      const res = await upload(fd);
      if (res.url) setUrl(res.url);
      else setError(res.error ?? "Không tải được ảnh");
    } catch {
      setError("Không tải được ảnh, thử lại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input name={name} type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={inputClass} placeholder="https://… hoặc bấm Tải ảnh từ máy" />
        <Button type="button" variant="outline" className="shrink-0" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
          {busy ? "Đang tải…" : "Tải ảnh từ máy"}
        </Button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onPick} />
      </div>
      {error && <p className="text-danger text-sm">{error}</p>}
      {url && (
        <div className="relative w-full max-w-sm overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Ảnh bìa xem trước" className="aspect-video w-full object-cover" />
          <button type="button" onClick={() => setUrl("")} aria-label="Bỏ ảnh bìa" className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
            <X className="size-4" />
          </button>
        </div>
      )}
      <p className="text-muted-foreground text-xs">Ảnh tải lên chỉ được dùng sau khi bấm Lưu thông tin.</p>
    </div>
  );
}
