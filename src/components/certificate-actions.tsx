"use client";

import { useState } from "react";
import { Copy, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CertificateActions({ verifyUrl }: { verifyUrl: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap justify-center gap-2 print:hidden">
      <Button type="button" onClick={() => window.print()}>
        <Printer className="size-4" /> In / Lưu PDF
      </Button>
      <Button asChild variant="outline">
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(verifyUrl)}`} target="_blank" rel="noopener">
          <Share2 className="size-4" /> Khoe lên Facebook
        </a>
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          navigator.clipboard.writeText(verifyUrl);
          setCopied(true);
        }}
      >
        <Copy className="size-4" /> {copied ? "Đã chép link" : "Chép link xác minh"}
      </Button>
    </div>
  );
}
