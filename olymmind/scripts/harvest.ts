// Thu thập câu hỏi: gọi AI sinh một lô câu mới theo chủ đề còn ít câu, đối chiếu độc lập, loại trùng, rồi ghi vào data/pool.json.
// Chạy tay:  GEMINI_API_KEY=... npx tsx scripts/harvest.ts      Chạy theo lịch: xem .github/workflows/harvest.yml
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BANK } from "../src/lib/bank";
import { aiShortCandidates, defaultAsk, type Ask } from "../src/lib/generate";
import { compact } from "../src/lib/judge";
import { fpOf, makeCtx } from "../src/lib/planner";

export interface PoolItem {
  fp: string; category: string; topic: string; grade: number; level: number; content: string; answer: string;
  acceptedAnswers: string[]; explanation: string; trivia: string; createdAt: number; status: "new" | "approved" | "rejected";
}
interface Pool { version: 1; items: PoolItem[] }

const FILE = resolve(import.meta.dirname ?? ".", "../data/pool.json");
const MAX_POOL = 6000;

export async function harvest(ask: Ask, opts: { count?: number; dailyMax?: number; file?: string; now?: number } = {}) {
  const file = opts.file ?? FILE;
  const count = opts.count ?? 28;
  const dailyMax = opts.dailyMax ?? 400;
  const now = opts.now ?? Date.now();
  const pool: Pool = JSON.parse(readFileSync(file, "utf8"));

  const last24h = pool.items.filter((i) => now - i.createdAt < 86_400_000).length;
  if (last24h >= dailyMax) return { added: 0, skipped: `đã đủ ${dailyMax} câu trong 24 giờ`, total: pool.items.length };
  if (pool.items.length >= MAX_POOL) return { added: 0, skipped: "kho đã đầy", total: pool.items.length };

  const coverage: Record<string, number> = {};
  const fps = new Set<string>();
  for (const b of BANK) { coverage[b.topic] = (coverage[b.topic] ?? 0) + 1; fps.add(fpOf({ content: b.content, answer: b.answer })); }
  for (const i of pool.items) { coverage[i.topic] = (coverage[i.topic] ?? 0) + 1; fps.add(i.fp); }
  const answers = pool.items.slice(-80).map((i) => compact(i.answer)).filter((a) => a.length >= 3 && !/^\d+$/.test(a));

  const ctx = makeCtx(`harvest-${now}-${Math.random()}`, { fps: [...fps], answers, coverage });
  const levels = Array.from({ length: count }, (_, i) => [3, 4, 4, 4, 5, 5, 4][i % 7]);
  const cands = await aiShortCandidates(ask, ctx, levels);

  const items: PoolItem[] = [];
  for (const c of cands) {
    if (!c.crosschecked) continue; // chỉ nhận câu đã được lượt giải độc lập đồng ý
    const fp = fpOf(c);
    if (fps.has(fp)) continue;
    fps.add(fp);
    items.push({
      fp, category: c.category, topic: c.topic, grade: c.grade, level: c.level, content: c.content, answer: c.answer,
      acceptedAnswers: c.acceptedAnswers, explanation: c.explanation, trivia: c.trivia, createdAt: now, status: "new",
    });
  }
  pool.items.push(...items);
  writeFileSync(file, JSON.stringify(pool, null, 1) + "\n");
  return { added: items.length, asked: cands.length, total: pool.items.length };
}

if (process.argv[1]?.endsWith("harvest.ts")) {
  const ask = defaultAsk();
  if (!ask) {
    console.error("Thiếu GEMINI_API_KEY (hoặc ANTHROPIC_API_KEY).");
    process.exit(1);
  }
  const count = Number(process.env.HARVEST_COUNT) || 28;
  const dailyMax = Number(process.env.HARVEST_DAILY_MAX) || 400;
  harvest(ask, { count, dailyMax }).then((r) => {
    console.log("harvest:", JSON.stringify(r));
    if ("asked" in r && r.asked === 0) {
      console.error("AI không trả về câu nào hợp lệ, xem lỗi phía trên (key, tên model, hạn mức).");
      process.exit(1);
    }
  }, (e) => { console.error(e); process.exit(1); });
}
