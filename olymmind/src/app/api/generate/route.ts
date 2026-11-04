import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { generateQuestions } from "@/lib/generate";
import { EMPTY_SEEN, type SeenInfo } from "@/lib/planner";
import type { RoundKey } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const ROUNDS: RoundKey[] = ["khoi-dong", "ve-dich"];

// Giới hạn đơn giản theo IP để bảo vệ API key: 6 lần/phút.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 6;
}

const strArr = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length < 40).slice(0, max) : [];

/**
 * POST /api/generate  { round, count, ai, seen: { fps, answers, coverage } }
 * Mỗi lần gọi dùng seed ngẫu nhiên mới => bộ đề mới, và không ra lại các câu trong `seen`.
 * (Dùng cho chế độ luyện nhanh 60/90 giây.)
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "Bạn thao tác hơi nhanh, thử lại sau ít phút." }, { status: 429 });
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* thân rỗng */
  }
  const round = (typeof body.round === "string" ? body.round : "khoi-dong") as RoundKey;
  if (!ROUNDS.includes(round)) return NextResponse.json({ error: "Vòng thi không hợp lệ." }, { status: 400 });
  const count = Math.min(30, Math.max(1, Number(body.count ?? 20) || 20));
  const s = (body.seen ?? {}) as Record<string, unknown>;
  const seen: SeenInfo = { ...EMPTY_SEEN, fps: strArr(s.fps, 6000), answers: strArr(s.answers, 300), coverage: {} };
  const { questions, source } = await generateQuestions({ round, count, seed: randomBytes(8).toString("hex"), useAI: body.ai === true, seen });
  return NextResponse.json({ source, questions });
}
