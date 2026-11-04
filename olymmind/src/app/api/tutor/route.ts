import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).min(1).max(20),
  topic: z.string().max(60).optional(),
});

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const l = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  l.push(now);
  hits.set(ip, l);
  return l.length > 8;
}

const SYSTEM = `Bạn là gia sư ôn thi "Đường lên đỉnh Olympia" cho học sinh THPT Việt Nam.
Trả lời bằng tiếng Việt chuẩn, ngắn gọn, đúng trọng tâm, có ví dụ khi cần.
Khi giải thích kiến thức, nêu rõ phần chắc chắn và phần không chắc. Không bịa số liệu, ngày tháng, tên riêng; nếu không chắc hãy nói rõ và khuyên kiểm tra lại với sách giáo khoa hoặc nguồn chính thống.
Có thể ra câu hỏi luyện tập theo kiểu từng vòng thi (Khởi động, Vượt chướng ngại vật, Tăng tốc, Về đích) rồi chờ học sinh trả lời trước khi đưa đáp án.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Chưa cấu hình ANTHROPIC_API_KEY trên máy chủ." }, { status: 503 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "Bạn hỏi hơi nhanh, thử lại sau ít phút." }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  const { messages, topic } = parsed.data;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 800,
      system: topic ? `${SYSTEM}\nChủ đề đang ôn: ${topic}.` : SYSTEM,
      messages,
    });
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return NextResponse.json({ reply: text });
  } catch (e) {
    console.error("[tutor]", e);
    return NextResponse.json({ error: "Gia sư AI tạm thời không phản hồi." }, { status: 502 });
  }
}
