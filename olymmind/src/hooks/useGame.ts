"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createEngine, type Engine } from "@/lib/engine";
import { buildOfflinePlan } from "@/lib/planner";
import { freshSeed } from "@/lib/rng";
import { buildSeen, loadSession, logResults, saveSession } from "@/lib/storage";
import type { MatchPlan, Progress, RoomState, Session } from "@/lib/types";

export interface GameOptions {
  /** Chỉ số các vòng muốn ôn (0 Khởi động, 1 Vượt chướng ngại vật, 2 Tăng tốc, 3 Về đích). */
  rounds: number[];
  useAI: boolean;
  /** -1 dễ hơn, 0 chuẩn, 1 khó hơn. */
  difficulty?: -1 | 0 | 1;
}

const EMPTY_PROGRESS: Progress = { cursor: null, score: 0, results: [], events: [], timeline: [], elapsedMs: 0 };
const newId = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Chế độ ôn một mình: engine chạy ngay trong trình duyệt. Sau mỗi câu, phiên được lưu để làm tiếp,
 * và các câu đã làm được ghi vào sổ để lần sau không ra lại.
 * Khi bật AI mới gọi /api/plan; lỗi hay thiếu key thì dùng kho có sẵn + bộ sinh thuật toán.
 */
export function useGame() {
  const [state, setState] = useState<RoomState | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const eng = useRef<Engine | null>(null);
  const ids = useRef<{ code: string; me: string }>({ code: "", me: "" });
  const last = useRef<GameOptions | null>(null);
  const session = useRef<Session | null>(null);
  const savedKey = useRef("");

  const stop = useCallback(() => {
    if (eng.current && ids.current.code) eng.current.destroy(ids.current.code);
    eng.current = null;
    session.current = null;
    setState(null);
  }, []);

  useEffect(() => () => {
    if (eng.current && ids.current.code) eng.current.destroy(ids.current.code);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // Lưu sau mỗi câu (lúc hiện đáp án) và lúc kết thúc
  useEffect(() => {
    const s = session.current;
    const e = eng.current;
    if (!state || !s || !e || !ids.current.code) return;
    if (state.phase !== "reveal" && state.phase !== "finished") return;
    const prog = e.getProgress(ids.current.code);
    if (!prog) return;
    const key = `${s.id}|${prog.results.length}|${state.phase}`;
    if (savedKey.current === key) return;
    savedKey.current = key;
    const finished = state.phase === "finished" && !!state.summary;
    s.progress = prog;
    s.status = finished ? "finished" : "in-progress";
    if (finished) s.summary = state.summary;
    saveSession(s);
    logResults(prog.results, ids.current.me, s.id);
  }, [state]);

  const launch = useCallback(async (s: Session, resume: boolean) => {
    if (eng.current && ids.current.code) eng.current.destroy(ids.current.code);
    session.current = s;
    savedKey.current = "";
    last.current = { rounds: s.rounds, useAI: s.useAI };
    const e = createEngine({ hub: { emit: (_c, ev, p) => ev === "room:state" && setState(p as RoomState) }, makePlan: async () => s.plan });
    const c = await e.createRoom({ name: "Bạn", useAI: s.useAI });
    if (!c.ok) return;
    eng.current = e;
    ids.current = { code: c.code, me: c.playerId };
    if ((globalThis as { __OLYM_DEBUG?: boolean }).__OLYM_DEBUG) (globalThis as Record<string, unknown>).__olymPeek = () => e.debugPeek(c.code);
    e.setConnected(c.code, c.playerId, true);
    await e.start(c.code, c.playerId, { rounds: s.rounds, plan: s.plan, resume: resume && s.progress.cursor ? s.progress : undefined });
  }, []);

  /** Bộ đề mới, luôn tránh những câu đã gặp. */
  const begin = useCallback(async (opts: GameOptions) => {
    stop();
    last.current = opts;
    const seen = buildSeen();
    const shift = opts.difficulty ?? 0;
    let plan: MatchPlan | null = null;
    // Bản artifact gắn sẵn bộ sinh đề chạy ngay trong trang (hỏi Claude trực tiếp, không cần API key).
    const local = (globalThis as { __olymGenerate?: (o: { seen: ReturnType<typeof buildSeen>; shift: number }) => Promise<MatchPlan> }).__olymGenerate;
    if (opts.useAI && local) {
      setPreparing(true);
      try {
        plan = await local({ seen, shift });
      } catch {
        /* dùng kho có sẵn */
      }
    } else if (opts.useAI) {
      setPreparing(true);
      try {
        const r = await fetch("/api/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ai: true, difficulty: shift, seen }),
        });
        if (r.ok) plan = (await r.json()) as MatchPlan;
      } catch {
        /* dùng kho có sẵn */
      }
    }
    if (!plan) {
      plan = buildOfflinePlan(freshSeed(), seen, shift);
      if (opts.useAI && !plan.notice) plan.notice = "Không gọi được AI nên đề được ghép từ kho có sẵn và bộ sinh thuật toán.";
    }
    setPreparing(false);
    const s: Session = {
      id: newId(), createdAt: Date.now(), updatedAt: Date.now(), status: "in-progress",
      rounds: opts.rounds, useAI: opts.useAI, plan, progress: EMPTY_PROGRESS, summary: null, attempt: 1,
    };
    await launch(s, false);
  }, [stop, launch]);

  /** Làm tiếp một phiên dở dang, bắt đầu từ câu kế sau câu cuối đã xong. */
  const resume = useCallback(async (id: string) => {
    const s = loadSession(id);
    if (!s || s.status !== "in-progress") return false;
    stop();
    await launch(s, true);
    return true;
  }, [stop, launch]);

  /** Làm lại đúng bộ đề của một phiên (kể cả đã xong), tính là lượt mới. */
  const redo = useCallback(async (id: string) => {
    const old = loadSession(id);
    if (!old) return false;
    stop();
    const s: Session = {
      id: newId(), createdAt: Date.now(), updatedAt: Date.now(), status: "in-progress",
      rounds: old.rounds, useAI: old.useAI, plan: old.plan, progress: EMPTY_PROGRESS, summary: null,
      attempt: old.attempt + 1, parentId: old.parentId ?? old.id,
    };
    await launch(s, false);
    return true;
  }, [stop, launch]);

  const { code, me } = ids.current;
  const call = <A extends unknown[]>(fn: (e: Engine, ...a: A) => void) => (...a: A) => {
    if (eng.current) fn(eng.current, ...a);
  };

  // Tổng thời gian của bước hiện tại = thời gian còn lại lớn nhất thấy được cho deadline này
  const remainingMs = state?.deadline ? Math.max(0, state.deadline - now) : null;
  const totalRef = useRef<{ d: number | null; max: number }>({ d: null, max: 1 });
  const dl = state?.deadline ?? null;
  if (totalRef.current.d !== dl) totalRef.current = { d: dl, max: remainingMs ?? 1 };
  if ((remainingMs ?? 0) > totalRef.current.max) totalRef.current.max = remainingMs!;

  return {
    state,
    playerId: me,
    player: state?.players.find((p) => p.id === me) ?? null,
    remainingMs,
    totalMs: Math.max(totalRef.current.max, 1),
    begin,
    resume,
    redo,
    stop,
    preparing,
    sessionId: session.current?.id ?? null,
    submitAnswer: call((e, t: string) => e.submitAnswer(code, me, t)),
    skipAnswer: call((e) => e.skipAnswer(code, me)),
    pick: call((e, v: number[], star: number | null) => e.pick(code, me, v, star)),
    guessKeyword: call((e, t: string) => e.cnvGuess(code, me, t)),
    next: call((e) => e.skip(code, me)),
    /** Chơi lại đúng bộ đề vừa rồi. */
    again: () => {
      if (session.current) void redo(session.current.id);
    },
    /** Bộ đề mới với cùng lựa chọn. */
    fresh: () => {
      if (last.current) void begin(last.current);
    },
    lastOptions: last.current,
  };
}
