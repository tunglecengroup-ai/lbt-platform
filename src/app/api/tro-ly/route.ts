import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, anthropic, isAiConfigured } from "@/lib/ai";
import { CHOT_SALE_NAO } from "@/lib/chot-sale-nao";
import { giaThanhChu, khoaHocGia } from "@/lib/chot-sale-gia";
import { notifyTelegram } from "@/lib/email";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * POST /api/tro-ly — Agent CHỐT SALE trên website (nút nổi góc trái, không cần đăng nhập).
 * Não dùng chung với agent fanpage: D:\Git\chot-sale-tu-dong\nao\*.md → src/lib/chot-sale-nao.ts (dong-bo-web.py).
 * Chỉ bán 1 khóa Facebook: Facebook Ads Chuyên Sâu Từ A-Z (999K).
 * Body: { messages: [{ role: "user" | "assistant", content: string }], trang?: string }. Trả về luồng chữ (text/plain).
 * Khách để lại SĐT trong khung chat → lưu bảng leads (nguồn "Trợ lý AI web") + báo Telegram.
 * Chống tốn tiền: tối đa 12 lượt gần nhất, 800 ký tự/câu, giới hạn theo IP (AI_CHAT_PER_HOUR, mặc định 20 câu/giờ).
 */

const PER_HOUR = () => Number(process.env.AI_CHAT_PER_HOUR ?? 20);
const hits = new Map<string, number[]>(); // giới hạn tạm theo IP (mỗi máy chủ 1 bản — đủ chặn spam thường)

function rateLimited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (list.length >= PER_HOUR()) return true;
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

type ChatMsg = { role: "user" | "assistant"; content: string };

const text = (status: number, msg: string) =>
  new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

/** Số điện thoại Việt Nam trong tin khách (0xxxxxxxxx hoặc +84xxxxxxxxx, cho phép dấu cách/chấm) */
function findPhone(s: string) {
  const m = s.replace(/[.\s-]/g, "").match(/(?:\+?84|0)(?:3|5|7|8|9)\d{8}/);
  if (!m) return null;
  return m[0].replace(/^\+?84/, "0");
}

const savedPhones = new Set<string>();
/** Lưu khách để lại SĐT vào CRM (bảng leads) + báo Telegram. Lỗi thì bỏ qua, không làm hỏng câu trả lời. */
async function captureLead(messages: ChatMsg[], trang: string | null) {
  const userText = messages.filter((m) => m.role === "user").map((m) => m.content);
  const phone = userText.map(findPhone).find(Boolean);
  if (!phone || savedPhones.has(phone)) return;
  savedPhones.add(phone);
  const transcript = messages
    .slice(-8)
    .map((m) => `${m.role === "user" ? "Khách" : "Bot"}: ${m.content.slice(0, 300)}`)
    .join("\n");
  try {
    const db = createAdminSupabase();
    const { data: existed } = await db.from("leads").select("id").eq("phone", phone).limit(1);
    if (!existed?.length) {
      await db.from("leads").insert({
        name: "Khách chat web",
        phone,
        source: "Trợ lý AI web",
        interest: "Facebook Ads Chuyên Sâu Từ A-Z",
        stage: "quan-tam",
        note: `${trang ? `Trang: ${trang}\n` : ""}${transcript}`.slice(0, 4000),
      });
    }
  } catch (e) {
    console.error("tro-ly lead", e);
  }
  await notifyTelegram(`🔥 Khách để lại SĐT trên chat web: ${phone}${trang ? `\nTrang: ${trang}` : ""}\n\n${transcript}`).catch(() => null);
}

export async function POST(req: Request) {
  if (!isAiConfigured()) return text(503, "Trợ lý AI đang bảo trì. Anh/chị nhắn Fanpage Lê Bá Tùng để được hỗ trợ ngay nhé.");

  const ip = (req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (rateLimited(ip)) return text(429, "Anh/chị hỏi hơi nhanh, đợi chút rồi hỏi tiếp nhé. Cần gấp thì nhắn Fanpage Lê Bá Tùng.");

  const body = (await req.json().catch(() => null)) as { messages?: unknown; trang?: unknown } | null;
  const raw = Array.isArray(body?.messages) ? (body.messages as unknown[]) : [];
  const trang = typeof body?.trang === "string" ? body.trang.slice(0, 200) : null;
  const messages: ChatMsg[] = raw
    .filter((m): m is ChatMsg => !!m && typeof m === "object" && ((m as ChatMsg).role === "user" || (m as ChatMsg).role === "assistant") && typeof (m as ChatMsg).content === "string")
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 800) }))
    .filter((m) => m.content)
    .slice(-12);
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return text(422, "Anh/chị nhập câu hỏi giúp em nhé.");

  await captureLead(messages, trang);

  const today = new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const gia = giaThanhChu(await khoaHocGia().catch(() => []));
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: CHOT_SALE_NAO, cache_control: { type: "ephemeral" } },
    { type: "text", text: `${gia}\n\nHôm nay là ${today}. Kênh: WEBSITE.${trang ? ` Khách đang xem trang: ${trang}.` : ""}` },
  ];

  let stream;
  try {
    stream = anthropic().beta.messages.stream({
      model: AI_MODEL(),
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system,
      messages,
    });
  } catch (e) {
    console.error("tro-ly start", e);
    return text(502, "Trợ lý đang bận, anh/chị thử lại sau ít phút hoặc nhắn Fanpage Lê Bá Tùng.");
  }

  const encoder = new TextEncoder();
  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("Câu này em chưa hỗ trợ được. Anh/chị nhắn Fanpage Lê Bá Tùng để được tư vấn trực tiếp nhé."));
        }
      } catch (e) {
        const msg =
          e instanceof Anthropic.RateLimitError
            ? "Trợ lý đang quá tải, anh/chị thử lại sau 1 phút nhé."
            : "Mất kết nối với trợ lý, anh/chị thử lại hoặc nhắn Fanpage Lê Bá Tùng.";
        console.error("tro-ly stream", e);
        controller.enqueue(encoder.encode(`\n${msg}`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
