"use client";
// Lưu cục bộ (localStorage) cho lịch sử trận đấu và sổ tay câu sai.
// Schema Prisma đã sẵn các bảng tương ứng để chuyển sang database khi có tài khoản.
import type { CategoryKey, MatchSummary } from "./types";

const MATCHES_KEY = "olymmind:matches";
const MISTAKES_KEY = "olymmind:mistakes";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* bỏ qua khi hết dung lượng */
  }
}

// ------------------------------------------------------------ lịch sử trận
export function loadMatches(): MatchSummary[] {
  return read<MatchSummary[]>(MATCHES_KEY, []).sort((a, b) => b.finishedAt - a.finishedAt);
}
export function loadMatch(id: string): MatchSummary | null {
  return loadMatches().find((m) => m.id === id) ?? null;
}
export function saveMatch(m: MatchSummary) {
  const all = read<MatchSummary[]>(MATCHES_KEY, []);
  if (all.some((x) => x.id === m.id)) return;
  write(MATCHES_KEY, [m, ...all].slice(0, 50));
}

// ------------------------------------------------------------ sổ tay câu sai
export interface Mistake {
  id: string;
  content: string;
  answer: string;
  explanation: string;
  trivia: string;
  category: CategoryKey;
  wrongCount: number;
  box: number; // 1–5 (hộp Leitner)
  nextReviewAt: number;
}

const BOX_DAYS = [0, 1, 2, 4, 8, 16];

export function loadMistakes(): Mistake[] {
  return read<Mistake[]>(MISTAKES_KEY, []);
}

export function addMistake(m: Pick<Mistake, "content" | "answer" | "explanation" | "trivia" | "category">) {
  const all = loadMistakes();
  const existing = all.find((x) => x.content === m.content);
  if (existing) {
    existing.wrongCount += 1;
    existing.box = 1;
    existing.nextReviewAt = Date.now();
  } else {
    all.push({ ...m, id: crypto.randomUUID(), wrongCount: 1, box: 1, nextReviewAt: Date.now() });
  }
  write(MISTAKES_KEY, all);
}

export function reviewMistake(id: string, remembered: boolean) {
  const all = loadMistakes();
  const m = all.find((x) => x.id === id);
  if (!m) return;
  m.box = remembered ? Math.min(5, m.box + 1) : 1;
  m.nextReviewAt = Date.now() + BOX_DAYS[m.box] * 86_400_000;
  write(MISTAKES_KEY, all);
}

export function removeMistake(id: string) {
  write(
    MISTAKES_KEY,
    loadMistakes().filter((x) => x.id !== id),
  );
}

// ================================================================ phiên chơi (làm tiếp, làm lại)
import type { Progress, QuestionResult, Session } from "./types";
import { compact, fingerprint } from "./judge";
import { planFingerprints, type SeenInfo } from "./planner";

const SESSIONS_KEY = "olymmind:sessions";
const QLOG_KEY = "olymmind:qlog";
const MAX_SESSIONS = 25;
const MAX_QLOG = 2500;

export function loadSessions(): Session[] {
  return read<Session[]>(SESSIONS_KEY, []).sort((a, b) => b.updatedAt - a.updatedAt);
}
export function loadSession(id: string): Session | null {
  return loadSessions().find((s) => s.id === id) ?? null;
}
export function saveSession(s: Session) {
  const all = read<Session[]>(SESSIONS_KEY, []).filter((x) => x.id !== s.id);
  all.unshift({ ...s, updatedAt: Date.now() });
  // Giữ phiên chưa xong trước, rồi tới phiên đã xong mới nhất
  const keep = [...all.filter((x) => x.status === "in-progress"), ...all.filter((x) => x.status === "finished")].slice(0, MAX_SESSIONS);
  write(SESSIONS_KEY, keep);
}
export function deleteSession(id: string) {
  write(SESSIONS_KEY, read<Session[]>(SESSIONS_KEY, []).filter((x) => x.id !== id));
}

// ================================================================ sổ câu đã gặp (theo dấu vân tay)
export interface QLogEntry {
  fp: string;
  content: string;
  answer: string;
  explanation: string;
  trivia: string;
  category: CategoryKey;
  topic?: string;
  grade?: number;
  level?: number;
  media?: string;
  items?: string[];
  attempts: number;
  correctCount: number;
  lastCorrect: boolean;
  lastUserAnswer?: string;
  firstAt: number;
  lastAt: number;
  sessionId?: string;
}

export function loadQLog(): QLogEntry[] {
  return read<QLogEntry[]>(QLOG_KEY, []);
}

/** Ghi các câu vừa làm xong vào sổ. Gọi nhiều lần cho cùng một câu thì chỉ tính một lần ở mỗi phiên. */
export function logResults(results: QuestionResult[], playerId: string, sessionId: string) {
  const log = loadQLog();
  const by = new Map(log.map((e) => [e.fp, e]));
  const now = Date.now();
  for (const r of results) {
    const fp = r.fp ?? fingerprint(r.content, r.answer);
    const ok = r.correctPlayerIds.includes(playerId);
    const e = by.get(fp);
    if (e) {
      if (e.sessionId === sessionId) {
        // đã ghi trong phiên này: cập nhật kết quả, không cộng lượt
        e.lastCorrect = ok;
        e.lastUserAnswer = r.userAnswer;
        continue;
      }
      e.attempts += 1;
      if (ok) e.correctCount += 1;
      e.lastCorrect = ok;
      e.lastUserAnswer = r.userAnswer;
      e.lastAt = now;
      e.sessionId = sessionId;
    } else {
      const n: QLogEntry = {
        fp, content: r.content, answer: r.answer, explanation: r.explanation, trivia: r.trivia, category: r.category,
        topic: r.topic, grade: r.grade, level: r.level, media: r.media, items: r.items,
        attempts: 1, correctCount: ok ? 1 : 0, lastCorrect: ok, lastUserAnswer: r.userAnswer, firstAt: now, lastAt: now, sessionId,
      };
      log.push(n);
      by.set(fp, n);
    }
  }
  log.sort((a, b) => b.lastAt - a.lastAt);
  write(QLOG_KEY, log.slice(0, MAX_QLOG));
}

/** Dữ liệu gửi cho bộ sinh đề để không ra lại câu cũ. */
export function buildSeen(): SeenInfo {
  const log = loadQLog();
  const fps = new Set(log.map((e) => e.fp));
  for (const s of read<Session[]>(SESSIONS_KEY, [])) if (s.status === "in-progress") for (const f of planFingerprints(s.plan)) fps.add(f);
  const answers = log
    .slice(0, 80)
    .map((e) => compact(e.answer))
    .filter((a) => a.length >= 3 && !/^\d+$/.test(a));
  const coverage: Record<string, number> = {};
  for (const e of log) if (e.topic) coverage[e.topic] = (coverage[e.topic] ?? 0) + 1;
  return { fps: [...fps].slice(0, 4000), answers, coverage };
}

export type { Progress };
