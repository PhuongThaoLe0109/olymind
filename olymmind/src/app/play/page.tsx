"use client";
import { motion } from "framer-motion";
import { Lock, RotateCcw, Star, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ScoreBadge, VictoryOverlay } from "@/components/Celebration";
import { SoundToggle } from "@/components/SoundToggle";
import { TimerBar } from "@/components/TimerBar";
import { audio, sfx } from "@/lib/sfx";
import { useGame } from "@/hooks/useGame";
import { addMistake, loadSessions } from "@/lib/storage";
import type { Session } from "@/lib/types";
import { CATEGORY_LABEL, ROUND_LABEL, ROUND_ORDER, ROUND_RULE_TEXT, type PublicCnv, type RoomState } from "@/lib/types";

type G = ReturnType<typeof useGame>;

export default function PlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayInner />
    </Suspense>
  );
}

function PlayInner() {
  const g = useGame();
  const { state } = g;
  const [rounds, setRounds] = useState<number[]>([0, 1, 2, 3]);
  const [useAI, setUseAI] = useState(false);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [difficulty, setDifficulty] = useState<-1 | 0 | 1>(0);
  const [unfinished, setUnfinished] = useState<Session[]>([]);
  const resumeId = useSearchParams().get("resume");
  const redoId = useSearchParams().get("redo");
  const started = useRef(false);

  useEffect(() => {
    setUnfinished(loadSessions().filter((s) => s.status === "in-progress").slice(0, 3));
    const has = () => !!(globalThis as { __olymGenerate?: unknown }).__olymGenerate;
    if (has()) { setAiReady(true); setUseAI(true); return; }
    let tries = 0;
    const poll = setInterval(() => { if (has()) { setAiReady(true); setUseAI(true); clearInterval(poll); } else if (++tries > 24) clearInterval(poll); }, 500);
    fetch("/api/plan").then((r) => r.json()).then((j) => { if (j.ai) { setAiReady(true); setUseAI(true); } else setAiReady((v) => v ?? false); }).catch(() => setAiReady((v) => v ?? false));
    return () => clearInterval(poll);
  }, [state === null]);

  // Mở từ trang lịch sử: ?resume=<id> hoặc ?redo=<id>
  useEffect(() => {
    if (started.current) return;
    if (resumeId) { started.current = true; void g.resume(resumeId); }
    else if (redoId) { started.current = true; void g.redo(redoId); }
  }, [resumeId, redoId]);
  const lastQuestion = useRef<string | null>(null);
  const lastReveal = useRef<unknown>(null);
  const lastIntro = useRef<string | null>(null);
  const lastSummary = useRef<string | null>(null);
  const lastSec = useRef<number>(-1);
  const [victory, setVictory] = useState<string | null>(null);

  // Nhạc nền: chạy khi đang chơi, căng hơn trong lúc đếm giờ
  const active = state !== null;
  const mood = state?.phase === "question" ? "tense" : "calm";
  useEffect(() => {
    if (!active) { audio.stopMusic(); return; }
    const kick = () => { audio.unlock(); if (audio.musicOn) audio.startMusic(); };
    kick();
    window.addEventListener("pointerdown", kick, { once: true });
    window.addEventListener("keydown", kick, { once: true });
    return () => { window.removeEventListener("pointerdown", kick); window.removeEventListener("keydown", kick); };
  }, [active]);
  useEffect(() => { audio.setMood(mood); }, [mood]);
  useEffect(() => () => audio.stopMusic(), []);

  // Hiệu ứng âm thanh theo diễn biến
  useEffect(() => {
    if (!state) return;
    if (state.phase === "intro" && state.intro && lastIntro.current !== state.intro.title) {
      lastIntro.current = state.intro.title;
      sfx("start");
    }
    if (state.phase === "reveal" && state.reveal && lastReveal.current !== state.reveal) {
      lastReveal.current = state.reveal;
      sfx(state.reveal.correctPlayerIds.includes(g.playerId) ? "correct" : "wrong");
    }
    if (state.phase === "finished" && state.summary && lastSummary.current !== state.summary.id) {
      lastSummary.current = state.summary.id;
      const qs = state.summary.questions;
      const right = qs.filter((q) => q.correctPlayerIds.includes(g.playerId)).length;
      if (qs.length >= 4 && right === qs.length) setVictory(state.summary.id);
      else sfx(right === 0 ? "lose" : "finish");
    }
  }, [state, g.playerId]);

  // Đếm giờ: tích tắc 5 giây cuối
  const secLeft = g.remainingMs === null ? -1 : Math.ceil(g.remainingMs / 1000);
  useEffect(() => {
    if (state?.phase !== "question" || secLeft < 1 || secLeft > 5 || lastSec.current === secLeft) return;
    lastSec.current = secLeft;
    sfx(secLeft <= 3 ? "tickFast" : "tick");
  }, [secLeft, state?.phase]);

  // Câu chưa đúng tự vào sổ tay để ôn lại
  useEffect(() => {
    if (state?.phase !== "reveal" || !state.reveal || !state.question) return;
    const q = state.question;
    if (lastQuestion.current === q.id) return;
    lastQuestion.current = q.id;
    if (!state.reveal.correctPlayerIds.includes(g.playerId)) {
      addMistake({
        content: q.content,
        answer: state.reveal.answer,
        explanation: state.reveal.explanation,
        trivia: state.reveal.trivia,
        category: q.category,
      });
    }
  }, [state, g.playerId]);

  // Chưa bắt đầu: chọn vòng ôn
  if (!state) {
    const toggle = (i: number) => setRounds((r) => (r.includes(i) ? r.filter((x) => x !== i) : [...r, i].sort()));
    return (
      <div className="card mx-auto max-w-2xl space-y-4">
        <h1 className="text-3xl font-extrabold">Ôn luyện Đường lên đỉnh Olympia</h1>
        <p className="text-paper/70">Chọn các vòng muốn ôn. Chơi một mình, không cần phòng hay đối thủ. Mỗi ván đều là đề mới, không lặp lại câu bạn đã làm.</p>
        {unfinished.length > 0 && (
          <ul className="space-y-2">
            {unfinished.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 border-l-[3px] border-gold bg-gold/10 px-4 py-3 text-sm">
                <span>
                  Ván dở dang · {u.progress.results.length} câu đã xong · {u.progress.score} đ
                  <span className="block text-paper/60">{new Date(u.updatedAt).toLocaleString("vi-VN")}</span>
                </span>
                <button className="btn btn-gold !py-1.5" onClick={() => g.resume(u.id)}>Làm tiếp</button>
              </li>
            ))}
          </ul>
        )}
        <ul className="space-y-2">
          {ROUND_ORDER.map((k, i) => (
            <li key={k}>
              <label className={`flex cursor-pointer items-start gap-3 border-l-[3px] px-4 py-3 ${rounds.includes(i) ? "border-gold bg-gold/10" : "border-white/20 bg-white/5"}`}>
                <input type="checkbox" className="mt-1.5 h-4 w-4 accent-[#F2BE48]" checked={rounds.includes(i)} onChange={() => toggle(i)} />
                <span>
                  <b className="text-gold-light">Vòng {i + 1}: {ROUND_LABEL[k]}</b>
                  <span className="block text-sm text-paper/70">{ROUND_RULE_TEXT[k]}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <label className={`flex items-center gap-2 text-sm ${aiReady ? "" : "opacity-60"}`}>
          <input type="checkbox" className="accent-[#F2BE48]" checked={useAI && !!aiReady} disabled={!aiReady} onChange={(e) => setUseAI(e.target.checked)} />
          {aiReady
            ? "Sinh đề mới bằng AI mỗi ván (có đối chiếu đáp án bằng lượt giải thứ hai)"
            : "Chưa có API key trên máy chủ: dùng kho câu hỏi khó có sẵn và bộ sinh thuật toán (ít lần chơi sẽ hết câu mới)"}
        </label>
        <div className="flex items-center gap-2 text-sm">
          <span>Độ khó:</span>
          {([[-1, "Vừa"], [0, "Chuẩn"], [1, "Khó"]] as const).map(([v, t]) => (
            <button key={v} className={`chip ${difficulty === v ? "!bg-gold/30" : ""}`} onClick={() => setDifficulty(v)}>{t}</button>
          ))}
        </div>
        {g.preparing && <p className="text-center text-sm text-gold-light">Đang sinh bộ đề mới…</p>}
        <button className="btn btn-gold w-full" disabled={!rounds.length || g.preparing} onClick={() => { audio.unlock(); sfx("click"); g.begin({ rounds, useAI: useAI && !!aiReady, difficulty }); }}>
          Bắt đầu ván mới
        </button>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/solo" className="underline">Luyện nhanh 60 giây</Link>
          <Link href="/history" className="underline">Lịch sử</Link>
          <Link href="/subjects" className="underline">Phân môn đã làm qua</Link>
          <Link href="/mistakes" className="underline">Sổ tay câu sai</Link>
          <Link href="/knowledge" className="underline">Kho kiến thức</Link>
        </div>
      </div>
    );
  }

  const me = g.player!;
  const idx = state.roundIndex;
  const list = g.lastOptions?.rounds ?? [0, 1, 2, 3];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 gap-1 text-sm font-semibold">
          {list.map((i) => (
            <span
              key={i}
              className={`flex-1 border-b-2 px-2 py-1.5 text-center ${state.phase === "finished" || (state.round && i < idx) ? "border-green-400 text-green-300" : state.round && i === idx ? "border-gold text-gold-light" : "border-white/15 text-paper/50"}`}
            >
              {ROUND_LABEL[ROUND_ORDER[i]]}
            </span>
          ))}
        </div>
        <ScoreBadge score={me.score} className="text-3xl font-extrabold text-gold-light" />
        <SoundToggle />
        <button className="btn btn-ghost !py-1.5" onClick={g.stop} aria-label="Thoát">
          <X size={16} /> Thoát
        </button>
      </div>

      {state.phase === "preparing" && <p className="card text-center">Đang chuẩn bị bộ câu hỏi…</p>}
      {state.notice && <p className="text-center text-sm font-semibold text-bell">{state.notice}</p>}

      {state.phase === "intro" && state.intro && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card space-y-3 py-12 text-center">
          <h2 className="text-4xl font-extrabold">{state.intro.title}</h2>
          <p className="mx-auto max-w-xl text-paper/80">{state.intro.subtitle}</p>
          <button className="btn btn-ghost mx-auto" onClick={g.next}>Bắt đầu ngay</button>
        </motion.div>
      )}

      {state.cnv && !["lobby", "preparing", "intro", "finished"].includes(state.phase) && <CnvPanel state={state} cnv={state.cnv} g={g} />}

      {state.phase === "pick" && (
        <div className="card space-y-3">
          <TimerBar remainingMs={g.remainingMs} totalMs={g.totalMs} />
          <PickPanel g={g} />
        </div>
      )}

      {state.question && (state.phase === "question" || state.phase === "reveal") && state.round !== "vuot-chuong-ngai-vat" && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold">
              Câu {state.questionNumber}
              {state.questionCount ? `/${state.questionCount}` : ""}
            </span>
            {state.round && <span className="chip">{ROUND_LABEL[state.round]}</span>}
            <span className="chip">{CATEGORY_LABEL[state.question.category]}</span>
            {state.question.star && (
              <span className="chip !bg-gold/30">
                <Star size={12} className="mr-1 inline" />
                Ngôi sao hy vọng
              </span>
            )}
            {!state.question.verified && <span className="chip !text-bell">AI sinh · chưa kiểm chứng</span>}
            <span className="ml-auto font-bold text-gold">{pointsLabel(state)}</span>
          </div>

          <p className="text-2xl font-semibold leading-snug">{state.question.content}</p>
          {state.question.media && <img src={state.question.media} alt="Hình của câu hỏi" className="mx-auto max-h-64 bg-white" />}
          {state.question.items && (
            <ol className="grid gap-2 sm:grid-cols-2">
              {state.question.items.map((it, i) => (
                <li key={i} className="border-l-[3px] border-gold bg-white/10 px-3 py-2 font-semibold">
                  <span className="mr-2 text-gold">{String.fromCharCode(65 + i)}.</span>
                  {it}
                </li>
              ))}
            </ol>
          )}

          {state.phase === "question" && (
            <>
              <TimerBar remainingMs={g.remainingMs} totalMs={g.totalMs} />
              {tvNote(state) && <p className="text-center text-sm text-paper/70">{tvNote(state)}</p>}
              <AnswerBox state={state} g={g} />
            </>
          )}
        </div>
      )}

      {state.phase === "reveal" && state.reveal && <RevealCard state={state} g={g} />}
      {state.phase === "finished" && state.summary && <Finished state={state} g={g} />}
      {victory && <VictoryOverlay title="Tuyệt đỉnh! Bạn đã trả lời đúng tất cả" subtitle="Cúp vinh quang và vòng nguyệt quế dành cho bạn. Một ván không sai câu nào." onClose={() => setVictory(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------- tiện ích
function tvNote(s: RoomState) {
  if (s.round !== "khoi-dong") return "";
  return "Bạn có 20 giây để gõ. Thi thật trên truyền hình chỉ có 5 giây mỗi câu.";
}

function pointsLabel(s: RoomState) {
  if (!s.question) return "";
  if (s.round === "tang-toc") return "40 · 30 · 20 · 10 đ (nhanh được nhiều điểm)";
  if (s.round === "ve-dich") return `${s.question.points}${s.question.star ? "×2" : ""} đ`;
  return "10 đ";
}

function AnswerBox({ state, g }: { state: RoomState; g: G }) {
  const [text, setText] = useState("");
  useEffect(() => setText(""), [state.question?.id]);
  const me = g.player!;
  if (state.stage === "race" && me.answered) return <p className="text-center text-sm">Đã nộp. Đang chấm…</p>;
  const isSeq = state.question?.type === "sequence";
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) g.submitAnswer(text);
      }}
    >
      <input
        className="input"
        autoFocus
        placeholder={isSeq ? "Gõ thứ tự, ví dụ ABDC" : "Gõ đáp án rồi Enter"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="btn btn-gold" disabled={!text.trim()}>Trả lời</button>
      {state.stage !== "race" && (
        <button type="button" className="btn btn-ghost" onClick={g.skipAnswer}>Bỏ qua</button>
      )}
    </form>
  );
}

function PickPanel({ g }: { g: G }) {
  const [vals, setVals] = useState<number[]>([20, 20, 20]);
  const [star, setStar] = useState<number | null>(null);
  return (
    <div className="space-y-3">
      <p className="font-bold">Chọn gói 3 câu và Ngôi sao hy vọng (nhân đôi nếu đúng, mất điểm nếu sai)</p>
      {vals.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-16 text-sm font-semibold">Câu {i + 1}</span>
          {[20, 30].map((x) => (
            <button
              key={x}
              className={`btn ${v === x ? "btn-gold" : "btn-ghost"} !py-1.5`}
              onClick={() => setVals((a) => a.map((y, j) => (j === i ? x : y)))}
            >
              {x} đ
            </button>
          ))}
          <button className={`btn ${star === i ? "btn-gold" : "btn-ghost"} !py-1.5`} onClick={() => setStar(star === i ? null : i)} aria-label="Ngôi sao hy vọng">
            <Star size={16} />
          </button>
        </div>
      ))}
      <button className="btn btn-gold" onClick={() => g.pick(vals, star)}>
        Xác nhận
      </button>
    </div>
  );
}

function CnvPanel({ state, cnv, g }: { state: RoomState; cnv: PublicCnv; g: G }) {
  const me = state.players.find((p) => p.id === g.playerId)!;
  const [guess, setGuess] = useState("");
  const [row, setRow] = useState("");
  const rowIdx = state.stage === "row" ? cnv.currentRow : -1;
  useEffect(() => setRow(""), [rowIdx, state.stage]);
  let ci = 0;
  const live = state.phase === "question" || state.phase === "reveal";
  return (
    <div className="card space-y-4">
      {live && <TimerBar remainingMs={state.phase === "question" ? g.remainingMs : null} totalMs={g.totalMs} />}
      <div className="flex flex-wrap justify-center gap-4">
        {cnv.wordLengths.map((len, w) => (
          <div key={w} className="flex gap-1">
            {Array.from({ length: len }, () => cnv.cells[ci++]).map((c, i) => (
              <span key={i} className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-gold/60 text-xl font-extrabold uppercase">
                {c ?? ""}
              </span>
            ))}
          </div>
        ))}
      </div>
      {cnv.imageSvg && (
        <div className="relative mx-auto h-48 w-72 overflow-hidden rounded-xl bg-white">
          <img src={`data:image/svg+xml;utf8,${encodeURIComponent(cnv.imageSvg)}`} alt="Hình bí ẩn" className="h-full w-full object-contain" />
          {/* 5 mảnh che; mở dần theo tilesOpen */}
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className={`absolute bg-navy transition-opacity duration-500 ${i < cnv.tilesOpen ? "opacity-0" : "opacity-100"}`}
              style={tilePos(i)}
            />
          ))}
        </div>
      )}
      <ul className="space-y-1 text-sm">
        {cnv.rows.map((r, i) => (
          <li key={i} className={`rounded-lg px-3 py-2 ${r.status === "asked" ? "bg-gold/20 font-semibold" : "bg-navy/5 dark:bg-white/5"}`}>
            <span className="mr-2 font-bold text-gold">Hàng {i + 1} ({r.length} chữ)</span>
            {r.clue ?? "Chưa mở"}
            {r.answer && <span className="ml-2 font-bold">→ {r.answer}</span>}
          </li>
        ))}
        {cnv.centerClue && (
          <li className="rounded-lg bg-gold/20 px-3 py-2 font-semibold">
            <span className="mr-2 font-bold text-gold">Ô trung tâm</span>
            {cnv.centerClue}
          </li>
        )}
      </ul>
      {state.stage === "row" && !me.cnvLocked && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (row.trim()) g.submitAnswer(row);
          }}
        >
          <input className="input" placeholder={`Đáp án hàng ${cnv.currentRow + 1}`} value={row} onChange={(e) => setRow(e.target.value)} disabled={me.answered} />
          <button className="btn btn-gold" disabled={me.answered || !row.trim()}>
            {me.answered ? "Đã nộp" : "Nộp"}
          </button>
        </form>
      )}
      {!cnv.solved && cnv.keyword === null && state.phase !== "intro" &&
        (me.cnvLocked ? (
          <p className="flex items-center justify-center gap-1 text-sm font-semibold text-bell">
            <Lock size={14} /> Bạn đã đoán sai từ khóa nên bị loại khỏi phần còn lại của vòng
          </p>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (guess.trim()) {
                g.guessKeyword(guess);
                setGuess("");
              }
            }}
          >
            <input className="input" placeholder="Đoán từ khóa (sai là bị loại)" value={guess} onChange={(e) => setGuess(e.target.value)} />
            <button className="btn btn-gold" disabled={!guess.trim()}>
              Đoán
            </button>
          </form>
        ))}
    </div>
  );
}

function tilePos(i: number): React.CSSProperties {
  // 4 mảnh ở bốn góc + 1 mảnh trung tâm
  const q = [
    { left: 0, top: 0, width: "50%", height: "50%" },
    { left: "50%", top: 0, width: "50%", height: "50%" },
    { left: 0, top: "50%", width: "50%", height: "50%" },
    { left: "50%", top: "50%", width: "50%", height: "50%" },
    { left: "25%", top: "25%", width: "50%", height: "50%" },
  ];
  return { ...q[i], zIndex: i === 4 ? 2 : 1, border: "1px solid rgba(245,158,11,.5)" };
}

function RevealCard({ state, g }: { state: RoomState; g: G }) {
  const r = state.reveal!;
  const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? "Bạn";
  return (
    <div className="card space-y-3 !bg-gold/10">
      <p className="text-lg">
        Đáp án: <strong className="text-gold">{r.answer}</strong>
      </p>
      {r.note && <p className="font-semibold">{r.note}</p>}
      {r.given && r.given.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {r.given.map((x, i) => {
            const ok = r.correctPlayerIds.includes(x.playerId);
            return (
              <li key={i} className={`border-l-[3px] bg-white/10 px-3 py-1 ${ok ? "border-green-400" : "border-red-300"}`}>
                <b>{nameOf(x.playerId)}</b> trả lời: {x.text || "(bỏ trống)"} <span className={ok ? "font-bold text-green-400" : "font-bold text-red-300"}>{ok ? "✓ đúng" : "✗ sai"}</span>
              </li>
            );
          })}
        </ul>
      )}
      <p>{r.explanation}</p>
      {r.trivia && <p className="text-sm italic text-navy/70 dark:text-paper/70">Bạn có biết? {r.trivia}</p>}
      <ul className="text-sm">
        {r.awards.length === 0 && <li>Điểm không đổi ở câu này.</li>}
        {r.awards.map((a, i) => (
          <li key={i} className="font-semibold">
            Điểm: {a.delta >= 0 ? "+" : ""}
            {a.delta}
          </li>
        ))}
      </ul>
      <button className="btn btn-gold !py-1.5 self-start" onClick={g.next}>
        Tiếp tục
      </button>
    </div>
  );
}


function Finished({ state, g }: { state: RoomState; g: G }) {
  const s = state.summary!;
  const mine = s.players[0];
  const right = s.questions.filter((q) => q.correctPlayerIds.includes(g.playerId)).length;
  return (
    <div className="card space-y-4 text-center">
      <Trophy className="mx-auto text-gold" size={44} />
      <h2 className="text-3xl font-extrabold">Hoàn thành</h2>
      <p className="text-5xl font-extrabold tabular-nums text-gold-light">{mine.score} đ</p>
      <p className="text-paper/80">
        Đúng {right}/{s.questions.length} câu. Câu chưa đúng đã được thêm vào sổ tay để ôn lại.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button className="btn btn-gold" onClick={g.again}>
          <RotateCcw size={16} /> Làm lại bộ đề này
        </button>
        <button className="btn btn-ghost" onClick={g.fresh}>Bộ đề mới</button>
        <Link href={`/history/${s.id}`} className="btn btn-ghost">Xem lại chi tiết</Link>
        <Link href="/mistakes" className="btn btn-ghost">Sổ tay câu sai</Link>
        <button className="btn btn-ghost" onClick={g.stop}>Chọn vòng khác</button>
      </div>
    </div>
  );
}
