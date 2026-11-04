import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { defaultAsk, generatePlan } from "@/lib/generate";
import { EMPTY_SEEN, type SeenInfo } from "@/lib/planner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Giới hạn theo IP để bảo vệ API key: 4 lần/phút.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 4;
}

/** GET: máy chủ có sinh đề bằng AI được không (đã cấu hình API key chưa). */
export async function GET() {
  return NextResponse.json({ ai: defaultAsk() !== null });
}

const strArr = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length < 40).slice(0, max) : [];

/** POST: bộ đề một người chơi, luôn mới. Thân yêu cầu: { ai, difficulty, seen: { fps, answers, coverage } }. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "Bạn thao tác hơi nhanh, thử lại sau ít phút." }, { status: 429 });
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* thân rỗng */
  }
  const s = (body.seen ?? {}) as Record<string, unknown>;
  const coverage: Record<string, number> = {};
  if (s.coverage && typeof s.coverage === "object") {
    for (const [k, v] of Object.entries(s.coverage as Record<string, unknown>).slice(0, 400)) if (typeof v === "number") coverage[k.slice(0, 40)] = v;
  }
  const seen: SeenInfo = { ...EMPTY_SEEN, fps: strArr(s.fps, 6000), answers: strArr(s.answers, 300), coverage };
  const d = Number(body.difficulty);
  const shift = d === -1 || d === 1 ? d : 0;
  const plan = await generatePlan({ seed: randomBytes(8).toString("hex"), useAI: body.ai === true, seen, shift });
  return NextResponse.json(plan);
}
