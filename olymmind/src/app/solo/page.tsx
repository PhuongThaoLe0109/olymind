"use client";
import { Timer } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { TimerBar } from "@/components/TimerBar";
import { isCorrect } from "@/lib/judge";
import { addMistake, buildSeen, logResults } from "@/lib/storage";
import { buildOfflinePlan } from "@/lib/planner";
import { freshSeed } from "@/lib/rng";
import { sfx } from "@/lib/sfx";
import { CATEGORY_LABEL, type Question } from "@/lib/types";

type Phase = "idle" | "loading" | "playing" | "done";
type Flash = { kind: "ok" | "wrong" | "skip"; answer: string } | null;

const POINTS = 10;

export default function SoloPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [duration, setDuration] = useState(60);
  const [useAI, setUseAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState<Flash>(null);
  const [remaining, setRemaining] = useState(0);
  const [missed, setMissed] = useState<Question[]>([]);
  const endAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = async () => {
    setPhase("loading");
    setError(null);
    try {
      const count = duration === 90 ? 30 : 24;
      const seen = buildSeen();
      let qs: Question[] = [];
      try {
        const res = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ round: "khoi-dong", count, ai: useAI, seen }) });
        const data = await res.json();
        if (res.ok) qs = data.questions as Question[];
      } catch {
        /* dùng bộ đề tại chỗ */
      }
      if (qs.length < count) {
        // Không có máy chủ: ghép từ kho có sẵn, vẫn tránh câu đã làm
        const used = new Set<string>(seen.fps);
        const pool: Question[] = [];
        for (let k = 0; k < 4 && pool.length < count; k++) {
          const plan = buildOfflinePlan(freshSeed(), { ...seen, fps: [...used] }, 0);
          for (const q of [...plan.khoiDongGeneral, ...plan.khoiDongSolo.flat(), ...plan.veDich.flat()]) {
            if (!pool.some((x) => x.content === q.content)) pool.push(q);
          }
          for (const q of pool) if (q.fp) used.add(q.fp);
        }
        qs = pool.slice(0, count);
      }
      if (!qs.length) throw new Error("Không tải được đề.");
      setQuestions(qs);
      setIdx(0);
      setScore(0);
      setMissed([]);
      setInput("");
      setFlash(null);
      endAt.current = Date.now() + duration * 1000;
      setRemaining(duration * 1000);
      setPhase("playing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra.");
      setPhase("idle");
    }
  };

  // Đồng hồ tổng
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      const left = endAt.current - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) setPhase("done");
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "playing" && !flash) inputRef.current?.focus();
  }, [phase, flash, idx]);

  const q = questions[idx];

  const finishQuestion = useCallback(
    (kind: "ok" | "wrong" | "skip") => {
      if (!q) return;
      logResults(
        [{ content: q.content, answer: q.answer, explanation: q.explanation, trivia: q.trivia, category: q.category, round: "khoi-dong", type: q.type, ownerId: null, correctPlayerIds: kind === "ok" ? ["me"] : [], fp: q.fp, topic: q.topic, grade: q.grade, level: q.level, userAnswer: input }],
        "me",
        `solo-${endAt.current}`,
      );
      sfx(kind === "ok" ? "correct" : "wrong");
      if (kind === "ok") setScore((s) => s + POINTS);
      else {
        setMissed((m) => [...m, q]);
        addMistake({ content: q.content, answer: q.answer, explanation: q.explanation, trivia: q.trivia, category: q.category });
      }
      setFlash({ kind, answer: q.answer });
      setTimeout(
        () => {
          setFlash(null);
          setInput("");
          setIdx((i) => i + 1);
        },
        kind === "ok" ? 450 : 1100,
      );
    },
    [q, input],
  );

  // Hết câu hỏi trước khi hết giờ
  useEffect(() => {
    if (phase === "playing" && questions.length && idx >= questions.length) setPhase("done");
  }, [phase, idx, questions.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q || flash) return;
    finishQuestion(isCorrect(input, q.answer, q.acceptedAnswers) ? "ok" : "wrong");
  };

  if (phase === "idle" || phase === "loading") {
    return (
      <div className="card mx-auto mt-8 max-w-md space-y-4">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Timer className="text-gold" /> Luyện Khởi động
        </h1>
        <p className="text-sm text-navy/70 dark:text-paper/70">
          Trả lời liên tục trong thời gian quy định. Mỗi câu đúng được {POINTS} điểm, hệ thống tự chuyển câu. Câu sai hoặc bỏ qua được lưu vào Sổ tay.
        </p>
        <div className="flex gap-2">
          {[60, 90].map((d) => (
            <button key={d} className={`btn flex-1 ${duration === d ? "btn-gold" : "btn-ghost"}`} onClick={() => setDuration(d)}>
              {d} giây
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} />
          Sinh đề mới bằng AI (cần API key, có thể mất vài giây)
        </label>
        <button className="btn btn-gold w-full" onClick={start} disabled={phase === "loading"}>
          {phase === "loading" ? "Đang chuẩn bị đề…" : "Bắt đầu"}
        </button>
        {error && <p className="text-sm font-semibold text-bell">{error}</p>}
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="card mx-auto mt-8 max-w-md space-y-4">
        <h1 className="text-xl font-bold">Hết giờ!</h1>
        <p className="text-4xl font-extrabold text-gold">{score} điểm</p>
        <p className="text-sm">Đúng {score / POINTS} câu, sai hoặc bỏ qua {missed.length} câu.</p>
        {missed.length > 0 && (
          <ul className="space-y-2 text-sm">
            {missed.map((m) => (
              <li key={m.id} className="rounded-lg bg-gold/10 p-3">
                <div className="font-semibold">{m.content}</div>
                <div>
                  Đáp án: <strong>{m.answer}</strong> — {m.explanation}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3">
          <button className="btn btn-gold flex-1" onClick={start}>
            Chơi lại
          </button>
          <Link href="/mistakes" className="btn btn-ghost flex-1">
            Mở sổ tay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-6 max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xl font-extrabold text-gold tabular-nums">{score} đ</span>
        {q && <span className="chip">{CATEGORY_LABEL[q.category]}</span>}
        <span className="text-sm">Câu {Math.min(idx + 1, questions.length)}</span>
      </div>
      <TimerBar remainingMs={remaining} totalMs={duration * 1000} />
      <div
        className={`card space-y-4 transition ${flash?.kind === "ok" ? "!border-green-500" : ""} ${flash && flash.kind !== "ok" ? "!border-bell" : ""}`}
      >
        <p className="text-2xl font-semibold leading-snug">{q?.content}</p>
        {flash ? (
          <p className="font-bold">
            {flash.kind === "ok" ? "Chính xác! +10" : <>Đáp án: <span className="text-gold">{flash.answer}</span></>}
          </p>
        ) : (
          <form onSubmit={submit} className="flex gap-2">
            <input ref={inputRef} className="input" placeholder="Gõ đáp án rồi Enter" value={input} onChange={(e) => setInput(e.target.value)} />
            <button type="button" className="btn btn-ghost" onClick={() => finishQuestion("skip")}>
              Bỏ qua
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
