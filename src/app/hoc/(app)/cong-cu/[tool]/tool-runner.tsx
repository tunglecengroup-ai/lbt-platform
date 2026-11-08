"use client";

import { useMemo, useRef, useState } from "react";
import { Copy, Download, LoaderCircle, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toolByKey, type LandingResult, type ScoreResult, type ToolKey } from "@/lib/ai-tools";
import { buildLandingHtml } from "@/lib/landing-html";

const inputClass =
  "bg-background focus:border-primary focus:ring-primary/20 w-full rounded-md border px-3 text-sm outline-none focus:ring-2";

function scoreTone(n: number, max: number) {
  const r = n / max;
  return r >= 0.75 ? "text-success" : r >= 0.5 ? "text-warning" : "text-danger";
}

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1 font-semibold">{title}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}

function ScoreView({ r }: { r: ScoreResult }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <p className={`text-5xl font-bold ${scoreTone(r.total, 100)}`}>{r.total}<span className="text-muted-foreground text-lg">/100</span></p>
        <p className="font-medium">{r.verdict}</p>
      </div>
      <div className="divide-y rounded-lg border">
        {r.criteria.map((c) => (
          <div key={c.name} className="flex gap-3 p-3">
            <span className={`tabular w-12 shrink-0 text-lg font-semibold ${scoreTone(c.score, 10)}`}>{c.score}/10</span>
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-muted-foreground text-sm">{c.comment}</p>
            </div>
          </div>
        ))}
      </div>
      <List title="Điểm mạnh" items={r.strengths} />
      <List title="Cần sửa" items={r.issues} />
      <List title="Rủi ro chính sách quảng cáo" items={r.policy_risks} />
      <List title="Sửa ngay hôm nay" items={r.quick_wins} />
      <List title="Kế hoạch 7 ngày" items={r.plan_7_days} />
      {r.rewrite && (
        <div>
          <p className="mb-1 font-semibold">Bản viết lại đề xuất</p>
          <div className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap">{r.rewrite}</div>
          <CopyButton text={r.rewrite} />
        </div>
      )}
    </div>
  );
}

function CopyButton({ text, label = "Sao chép" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}>
      <Copy className="size-4" /> {ok ? "Đã chép" : label}
    </Button>
  );
}

function LandingView({ d, color, contact }: { d: LandingResult; color?: string; contact?: string }) {
  const html = useMemo(() => buildLandingHtml(d, { color, contact }), [d, color, contact]);
  const download = () => {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "landing-page.html";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={download}><Download className="size-4" /> Tải file HTML</Button>
        <CopyButton text={html} label="Chép mã HTML" />
      </div>
      <p className="text-muted-foreground text-xs">Mở file bằng trình duyệt để xem; đưa lên hosting/Netlify, hoặc dán từng phần vào Webcake/LadiPage. Thay ảnh và cảm nhận [cần điền] bằng nội dung thật trước khi chạy quảng cáo.</p>
      <iframe title="Xem trước landing page" srcDoc={html} sandbox="" className="h-[640px] w-full rounded-lg border bg-white" />
    </div>
  );
}

export function ToolRunner({ toolKey, allowed, remaining, quota }: { toolKey: ToolKey; allowed: boolean; remaining: number; quota: number }) {
  const tool = toolByKey(toolKey)!;
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [left, setLeft] = useState(remaining);
  const [values, setValues] = useState<Record<string, string>>({});
  const abort = useRef<AbortController | null>(null);

  async function run(form: FormData) {
    const payload = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    setValues(payload);
    setText("");
    setError("");
    setLoading(true);
    abort.current = new AbortController();
    try {
      const res = await fetch(`/api/ai/${toolKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abort.current.signal,
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error || `Lỗi ${res.status}`);
        return;
      }
      setLeft(Number(res.headers.get("X-AI-Remaining") ?? left - 1));
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setText(acc);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("Mất kết nối, thử lại.");
    } finally {
      setLoading(false);
    }
  }

  // Công cụ JSON: tách phần JSON (bỏ dòng thông báo lỗi [..] nếu có ở cuối)
  const parsed = useMemo(() => {
    if (tool.output !== "json" || loading || !text) return null;
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1)) as ScoreResult | LandingResult;
    } catch {
      return null;
    }
  }, [text, loading, tool.output]);
  const tail = text.match(/\n\n\[[^\]]+\]\s*$/)?.[0]?.trim();

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit p-5">
        <form action={run} className="space-y-3">
          {tool.fields.map((f) => (
            <label key={f.name} className="block">
              <span className="mb-1 block text-sm font-medium">{f.label}{f.required && <span className="text-danger"> *</span>}</span>
              {f.type === "textarea" ? (
                <textarea name={f.name} rows={f.rows ?? 3} required={f.required} placeholder={f.placeholder} defaultValue={values[f.name]} className={`${inputClass} py-2`} />
              ) : f.type === "select" ? (
                <select name={f.name} defaultValue={values[f.name]} className={`${inputClass} h-10`}>
                  {f.options!.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input name={f.name} required={f.required} placeholder={f.placeholder} defaultValue={values[f.name]} className={`${inputClass} h-10`} />
              )}
            </label>
          ))}
          {loading ? (
            <Button type="button" variant="outline" className="w-full" onClick={() => abort.current?.abort()}>
              <Square className="size-4" /> Dừng
            </Button>
          ) : (
            <Button type="submit" className="w-full" disabled={!allowed || left <= 0}>
              <Sparkles className="size-4" /> {allowed ? (left > 0 ? "Chạy AI" : "Hết lượt hôm nay") : "Cần có khóa học / Member"}
            </Button>
          )}
          {allowed && <p className="text-muted-foreground text-center text-xs">Còn {left}/{quota} lượt hôm nay</p>}
        </form>
      </Card>

      <Card className="min-h-[300px] p-5">
        {error && <p className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm">{error}</p>}
        {!error && !text && !loading && <p className="text-muted-foreground text-sm">Điền thông tin bên trái rồi bấm &quot;Chạy AI&quot;. Kết quả hiện ở đây.</p>}
        {loading && tool.output === "json" && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <LoaderCircle className="size-4 animate-spin" /> AI đang phân tích… ({text.length.toLocaleString("vi-VN")} ký tự)
          </p>
        )}
        {tool.output === "text" && text && (
          <div>
            {loading && <LoaderCircle className="text-primary mb-2 size-4 animate-spin" />}
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{text}</div>
            {!loading && <CopyButton text={text} />}
          </div>
        )}
        {parsed && toolKey === "tao-landing" && <LandingView d={parsed as LandingResult} color={values.color} contact={values.contact} />}
        {parsed && toolKey !== "tao-landing" && <ScoreView r={parsed as ScoreResult} />}
        {!loading && tool.output === "json" && text && !parsed && (
          <p className="text-danger text-sm">{tail ?? "Không đọc được kết quả, vui lòng thử lại."}</p>
        )}
        {parsed && tail && <p className="text-warning mt-3 text-sm">{tail}</p>}
      </Card>
    </div>
  );
}
