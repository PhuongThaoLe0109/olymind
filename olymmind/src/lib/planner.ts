// Dựng bộ đề cho một lượt chơi từ ngân hàng + bộ sinh thuật toán (+ câu AI nếu có), luôn loại các câu người chơi đã gặp.
import { BANK } from "./bank";
import { CNV_BANK } from "./cnvbank";
import { fingerprint, compact } from "./judge";
import { genImage, genLogic, genMental, genOrder, type GenQ } from "./procedural";
import { seeded, shuffle, type Rnd } from "./rng";
import { SAMPLE_BANK, SAMPLE_CNV } from "./samples";
import type { CategoryKey, CnvPuzzle, MatchPlan, Question, QuestionType, RoundKey } from "./types";

/** Những gì cần biết về người chơi để không ra lại câu cũ và rải đều chủ đề. */
export interface SeenInfo {
  /** Dấu vân tay các câu đã gặp hoặc đang nằm trong phiên chưa xong. */
  fps: string[];
  /** Đáp án (đã compact) của các câu gần đây, để tránh ra cùng đáp án. */
  answers: string[];
  /** Số câu đã gặp theo mã chủ đề. */
  coverage: Record<string, number>;
}
export const EMPTY_SEEN: SeenInfo = { fps: [], answers: [], coverage: {} };

/** Ứng viên câu hỏi, từ ngân hàng, bộ sinh hoặc AI. */
export interface Cand {
  category: CategoryKey;
  topic: string;
  grade: number;
  level: number;
  content: string;
  answer: string;
  acceptedAnswers: string[];
  explanation: string;
  trivia: string;
  items?: string[];
  media?: string;
  source: "ai" | "sample";
  crosschecked?: boolean;
  /** Câu tính nhẩm do bộ sinh tạo (giới hạn tỉ lệ để không lấn kiến thức). */
  mental?: boolean;
  fp?: string;
}

export const fpOf = (c: { content: string; answer: string; fp?: string }): string => (c.fp ??= fingerprint(c.content, c.answer));

const fromGen = (g: GenQ, mental = false): Cand => ({
  category: g.category, topic: g.topic, grade: g.grade, level: g.level, content: g.content, answer: g.answer,
  acceptedAnswers: g.acceptedAnswers, explanation: g.explanation, trivia: g.trivia, items: g.items, media: g.media, source: "sample", mental,
});

import POOL from "../../data/pool.json";

// ------------------------------------------------------------------ ngân hàng dự phòng đã chuẩn hóa
const OFFLINE_SHORTS: Cand[] = [
  ...BANK.map<Cand>((b) => ({ ...b, source: "sample" })),
  ...SAMPLE_BANK.filter((q) => q.kind === "short").map<Cand>((q) => ({
    category: q.category, topic: "", grade: 0, level: 2, content: q.content, answer: q.answer, acceptedAnswers: q.acceptedAnswers ?? [],
    explanation: q.explanation, trivia: q.trivia, source: "sample",
  })),
];
// Câu do bộ thu thập (scripts/harvest.ts) sinh ra theo lịch và đã được đối chiếu; câu bị gạt bỏ (status "rejected") không dùng.
for (const it of POOL.items) {
  if (it.status === "rejected") continue;
  OFFLINE_SHORTS.push({
    category: it.category as CategoryKey, topic: it.topic, grade: it.grade, level: it.level, content: it.content, answer: it.answer,
    acceptedAnswers: it.acceptedAnswers ?? [], explanation: it.explanation, trivia: it.trivia ?? "", source: "ai", crosschecked: true, fp: it.fp,
  });
}
OFFLINE_SHORTS.forEach((c) => fpOf(c));
export const OFFLINE_BANK: readonly Cand[] = OFFLINE_SHORTS;
export const OFFLINE_CNV: readonly CnvPuzzle[] = [...SAMPLE_CNV, ...CNV_BANK];

// ------------------------------------------------------------------ ngữ cảnh chọn câu
export interface Ctx {
  rnd: Rnd;
  seen: Set<string>;
  recentAnswers: Set<string>;
  coverage: Record<string, number>;
  used: Set<string>;
  usedAnswers: Set<string>;
  exhausted: boolean;
}
export function makeCtx(seed: string, info: SeenInfo): Ctx {
  return {
    rnd: seeded(seed), seen: new Set(info.fps), recentAnswers: new Set(info.answers), coverage: info.coverage ?? {},
    used: new Set(), usedAnswers: new Set(), exhausted: false,
  };
}

const isNumeric = (s: string) => /^[\d.,\s-]+$/.test(s.trim());
function answerBlocked(c: Cand, ctx: Ctx): boolean {
  const a = compact(c.answer);
  if (a.length < 3 || isNumeric(c.answer)) return false;
  return ctx.recentAnswers.has(a) || ctx.usedAnswers.has(a);
}

/** Chọn lần lượt cho từng mức độ khó mong muốn, ưu tiên: đúng độ khó, khác phân môn, chủ đề ít gặp, câu AI đã đối chiếu. */
export function pickShorts(ctx: Ctx, levels: number[], extra: Cand[], maxMentalShare = 0.2): Cand[] {
  const mental = Array.from({ length: 12 }, () => fromGen(genMental(ctx.rnd), true));
  const all = [...extra, ...OFFLINE_SHORTS, ...mental];
  const out: Cand[] = [];
  const catCount = new Map<string, number>();
  let mentalCount = 0;
  for (const L of levels) {
    let cands = all.filter((c) => c.level >= 3 && !ctx.used.has(fpOf(c)) && !ctx.seen.has(fpOf(c)) && !answerBlocked(c, ctx));
    if (!cands.length) cands = all.filter((c) => c.level >= 2 && !ctx.used.has(fpOf(c)) && !ctx.seen.has(fpOf(c)) && !answerBlocked(c, ctx));
    if (!cands.length) {
      ctx.exhausted = true;
      cands = all.filter((c) => !ctx.used.has(fpOf(c)));
    }
    if (!cands.length) break;
    const mentalCap = Math.max(1, Math.floor(levels.length * maxMentalShare));
    let best = cands[0], bestScore = -Infinity;
    for (const c of cands) {
      const s =
        -Math.abs(c.level - L) * 1.3 -
        (catCount.get(c.category) ?? 0) * 1.6 -
        (ctx.coverage[c.topic] ?? 0) * 0.12 +
        (c.source === "ai" ? (c.crosschecked ? 1.0 : 0.3) : 0) -
        (c.mental && mentalCount >= mentalCap ? 4 : 0) +
        ctx.rnd() * 1.2;
      if (s > bestScore) { best = c; bestScore = s; }
    }
    out.push(best);
    ctx.used.add(fpOf(best));
    ctx.usedAnswers.add(compact(best.answer));
    catCount.set(best.category, (catCount.get(best.category) ?? 0) + 1);
    if (best.mental) mentalCount++;
  }
  return out;
}

function pickGenerated(ctx: Ctx, make: (r: Rnd) => GenQ, target: number, tries = 24): Cand {
  const cands: Cand[] = [];
  for (let i = 0; i < tries; i++) {
    const c = fromGen(make(ctx.rnd));
    if (!ctx.used.has(fpOf(c))) cands.push(c);
  }
  const fresh = cands.filter((c) => !ctx.seen.has(fpOf(c)));
  const pool = fresh.length ? fresh : cands;
  if (!fresh.length) ctx.exhausted = true;
  pool.sort((a, b) => Math.abs(a.level - target) - Math.abs(b.level - target) || ctx.rnd() - 0.5);
  const best = pool[0];
  ctx.used.add(fpOf(best));
  return best;
}

// ------------------------------------------------------------------ dựng Question và MatchPlan
let counter = 0;
const typeOf = (c: Cand): QuestionType => (c.items ? "sequence" : c.media ? "image" : "text");

export function toQuestion(c: Cand, round: RoundKey, timeLimit: number, points: number): Question {
  return {
    id: `q${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    round, category: c.category, type: typeOf(c), content: c.content, media: c.media, items: c.items,
    answer: c.answer, acceptedAnswers: c.acceptedAnswers, explanation: c.explanation, trivia: c.trivia,
    timeLimit, points, verified: c.source === "sample", source: c.source, crosschecked: c.crosschecked,
    fp: fpOf(c), grade: c.grade || undefined, topic: c.topic || undefined, level: c.level,
  };
}

/** Mức độ khó mong muốn từng câu. `shift` = -1 (vừa), 0 (khó), +1 (rất khó). */
export function levelPlan(shift: number) {
  const c = (xs: number[]) => xs.map((x) => Math.max(1, Math.min(5, x + shift)));
  return {
    solo: c([3, 3, 4, 4, 4, 4]),
    general: c([3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5]),
    veDich: c([4, 5, 5]),
    logic: [4, 4, 5].map((x) => Math.max(1, Math.min(5, x + shift))),
  };
}

export interface Extras {
  shorts?: Cand[];
  cnv?: CnvPuzzle[];
}

/** Ghép bộ đề một người chơi. Không cần mạng; câu AI (nếu có) được truyền qua `extras`. */
export function assemblePlan(ctx: Ctx, extras: Extras = {}, shift = 0): MatchPlan {
  const L = levelPlan(shift);
  const extra = extras.shorts ?? [];
  const solo = pickShorts(ctx, L.solo, extra);
  const general = pickShorts(ctx, L.general, extra);
  const vd = pickShorts(ctx, L.veDich, extra);

  const tt = [
    pickGenerated(ctx, genImage, 4 + shift),
    pickGenerated(ctx, genOrder, 4 + shift),
    pickGenerated(ctx, genLogic, L.logic[1]),
    pickGenerated(ctx, genLogic, L.logic[2]),
  ];
  const ttTimes = [20, 20, 30, 30];

  const cnvPool = [...(extras.cnv ?? []), ...OFFLINE_CNV];
  const cnvKey = (p: CnvPuzzle) => fingerprint(p.keyword, p.keyword);
  const freshCnv = cnvPool.filter((p) => !ctx.seen.has(cnvKey(p)));
  const cnv = (freshCnv.length ? shuffle(freshCnv, ctx.rnd).sort((a, b) => Number(b.source === "ai") - Number(a.source === "ai"))[0] : shuffle(cnvPool, ctx.rnd)[0]);
  if (!freshCnv.length) ctx.exhausted = true;

  const anyAI = [...solo, ...general, ...vd].some((c) => c.source === "ai") || cnv.source === "ai";
  return {
    khoiDongSolo: [solo.map((c) => toQuestion(c, "khoi-dong", 20, 10))],
    khoiDongGeneral: general.map((c) => toQuestion(c, "khoi-dong", 12, 10)),
    cnv,
    tangToc: tt.map((c, i) => toQuestion(c, "tang-toc", ttTimes[i], 40)),
    veDich: [vd.map((c) => toQuestion(c, "ve-dich", 20, 20))],
    tiebreak: [],
    source: anyAI ? "ai" : "sample",
    notice: ctx.exhausted ? "Bạn đã gặp gần hết kho câu có sẵn nên một số câu có thể lặp lại. Bật sinh đề bằng AI để luôn có câu mới." : null,
  };
}

/** Bộ đề không dùng AI (chạy được ngay trên trình duyệt). */
export function buildOfflinePlan(seed: string, seen: SeenInfo = EMPTY_SEEN, shift = 0): MatchPlan {
  return assemblePlan(makeCtx(seed, seen), {}, shift);
}

/** Tất cả dấu vân tay của một bộ đề (để đánh dấu "đã dành riêng" khi phiên chưa xong). */
export function planFingerprints(plan: MatchPlan): string[] {
  const qs = [...plan.khoiDongSolo.flat(), ...plan.khoiDongGeneral, ...plan.tangToc, ...plan.veDich.flat(), ...plan.tiebreak];
  const fps = qs.map((q) => q.fp ?? fingerprint(q.content, q.answer));
  fps.push(fingerprint(plan.cnv.keyword, plan.cnv.keyword));
  for (const r of plan.cnv.rows) fps.push(fingerprint(r.clue, r.answer));
  return fps;
}
