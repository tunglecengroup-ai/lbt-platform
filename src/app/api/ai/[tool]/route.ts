import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { AI_MODEL, PROMPTS, anthropic, isAiConfigured, logUsage, toolAccess, usedToday } from "@/lib/ai";
import { toolByKey } from "@/lib/ai-tools";

export const maxDuration = 60;

const fail = (status: number, message: string) => NextResponse.json({ error: message }, { status });

/**
 * POST /api/ai/<công cụ> — body JSON là các trường của form.
 * Trả về luồng chữ (text/plain) để hiện dần — tránh bị Netlify cắt khi chờ lâu.
 * Công cụ dạng JSON: client gom đủ chữ rồi JSON.parse.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/ai/[tool]">) {
  const { tool: key } = await ctx.params;
  const tool = toolByKey(key);
  if (!tool) return fail(404, "Không có công cụ này");
  if (!isAiConfigured()) return fail(503, "Công cụ AI chưa được bật (thiếu ANTHROPIC_API_KEY).");

  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return fail(401, "Vui lòng đăng nhập");

  const access = await toolAccess(user.id);
  if (!access.allowed) return fail(403, "Công cụ AI dành cho học viên đang có khóa học hoặc thành viên LBT Member.");
  const used = await usedToday(user.id);
  if (used >= access.quota) return fail(429, `Bạn đã dùng hết ${access.quota} lượt hôm nay. Lượt mới mở lại lúc 0 giờ.`);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const lines: string[] = [];
  for (const f of tool.fields) {
    const v = String(body[f.name] ?? "").trim().slice(0, 6000);
    if (f.required && !v) return fail(422, `Vui lòng nhập: ${f.label}`);
    if (v) lines.push(`${f.label}: ${v}`);
  }
  const prompt = PROMPTS[tool.key];

  let stream;
  try {
    stream = anthropic().beta.messages.stream({
      model: AI_MODEL(),
      max_tokens: prompt.maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        ...(prompt.schema ? { format: { type: "json_schema", schema: prompt.schema } } : {}),
      },
      system: prompt.system,
      messages: [{ role: "user", content: `<input>\n${lines.join("\n")}\n</input>` }],
    });
  } catch (e) {
    console.error("ai start", e);
    return fail(502, "Không gọi được AI, thử lại sau ít phút.");
  }

  const encoder = new TextEncoder();
  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\n[AI từ chối nội dung này — hãy kiểm tra lại thông tin nhập (có thể vi phạm chính sách).]"));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n[Kết quả bị cắt vì quá dài — hãy rút gọn thông tin nhập.]"));
        }
        await logUsage(user.id, tool.key, final.usage);
      } catch (e) {
        const msg =
          e instanceof Anthropic.RateLimitError
            ? "AI đang quá tải, thử lại sau 1 phút."
            : e instanceof Anthropic.APIError
              ? `Lỗi AI (${e.status}).`
              : "Mất kết nối với AI.";
        console.error("ai stream", e);
        controller.enqueue(encoder.encode(`\n\n[${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body$, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-AI-Remaining": String(Math.max(0, access.quota - used - 1)),
    },
  });
}
