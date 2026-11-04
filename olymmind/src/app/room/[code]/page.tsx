"use client";
import { motion } from "framer-motion";
import { Bell, Check, Crown, Link2, Lock, Star, Trophy, WifiOff, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TimerBar } from "@/components/TimerBar";
import { useBuzzer } from "@/hooks/useBuzzer";
import { addMistake, loadElo, saveElo, saveMatch } from "@/lib/storage";
import { CATEGORY_LABEL, ROUND_LABEL, type PublicCnv, type PublicPlayer, type RoomState } from "@/lib/types";

type G = ReturnType<typeof useBuzzer>;

export default function RoomPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const g = useBuzzer(code);
  const { state, me } = g;
  const [name, setName] = useState("");
  const savedMatch = useRef<string | null>(null);
  const lastQuestion = useRef<string | null>(null);

  // Lưu trận + cập nhật Elo cá nhân khi kết thúc
  useEffect(() => {
    if (state?.summary && me && savedMatch.current !== state.summary.id) {
      savedMatch.current = state.summary.id;
      saveMatch(state.summary);
      const mine = state.summary.players.find((p) => p.id === me.id);
      if (mine) saveElo(mine.eloAfter);
    }
  }, [state?.summary, me]);

  // Ghi câu sai vào sổ tay: lúc reveal, nếu người này từng được hỏi mà không đúng
  useEffect(() => {
    if (state?.phase !== "reveal" || !state.reveal || !state.question || !me) return;
    const q = state.question;
    if (lastQuestion.current === q.id) return;
    lastQuestion.current = q.id;
    const involved =
      state.round === "tang-toc" ||
      state.round === "vuot-chuong-ngai-vat" ||
      state.activePlayerId === me.id ||
      state.reveal.awards.some((a) => a.playerId === me.id);
    if (involved && !state.reveal.correctPlayerIds.includes(me.id)) {
      addMistake({
        content: q.content,
        answer: state.reveal.answer,
        explanation: state.reveal.explanation,
        trivia: state.reveal.trivia,
        category: q.category,
      });
    }
  }, [state, me]);

  // Phím Cách = bấm chuông
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (canBuzz(state, me?.id)) {
        e.preventDefault();
        g.buzz();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, me, g]);

  if (g.status === "need-name" || g.status === "error") {
    return (
      <div className="card mx-auto mt-10 max-w-sm space-y-3">
        <h1 className="text-xl font-bold">
          Vào phòng <span className="text-gold">{code}</span>
        </h1>
        <input className="input" placeholder="Tên thí sinh" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-gold w-full" disabled={!name.trim()} onClick={() => g.join(name.trim())}>
          Vào phòng
        </button>
        {g.error && <p className="text-sm font-semibold text-bell">{g.error}</p>}
        <Link href="/" className="block text-center text-sm underline">
          Về trang chủ
        </Link>
      </div>
    );
  }
  if (!state || g.status !== "joined" || !me) return <p className="mt-16 text-center">Đang kết nối phòng…</p>;

  const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? "?";
  const active = state.players.find((p) => p.id === state.activePlayerId);
  const winner = state.players.find((p) => p.id === state.buzzWinnerId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="chip">Phòng {state.code}</span>
        <span className="chip">Elo {loadElo()}</span>
        {state.matchNo > 1 && <span className="chip">Ván {state.matchNo}</span>}
        {state.questionsSource === "ai" && <span className="chip">Đề do AI sinh</span>}
        <span className="ml-auto flex items-center gap-1 text-navy/60 dark:text-paper/60">
          {g.connected ? `${g.ping ?? "–"} ms` : (<><WifiOff size={14} /> Mất kết nối</>)}
        </span>
      </div>

      <Scoreboard state={state} meId={me.id} />

      {state.notice && <p className="text-center text-sm font-semibold text-bell">{state.notice}</p>}

      {state.phase === "lobby" && (
        <div className="card space-y-4 text-center">
          <p className="text-sm text-navy/60 dark:text-paper/60">Chia sẻ mã phòng để mời bạn bè (tối đa 4 thí sinh)</p>
          <div className="text-5xl font-extrabold tracking-[0.3em] text-gold">{state.code}</div>
          <button className="btn btn-ghost mx-auto" onClick={() => navigator.clipboard?.writeText(`${location.origin}/room/${state.code}`)}>
            <Link2 size={16} /> Sao chép liên kết
          </button>
          {g.isHost ? (
            <div>
              <button className="btn btn-gold" onClick={g.startGame}>
                {state.matchNo > 1 ? "Bắt đầu ván mới" : "Bắt đầu"} ({state.players.length} thí sinh)
              </button>
              <p className="mt-2 text-xs text-navy/60 dark:text-paper/60">
                Trận gồm 4 vòng: Khởi động, Vượt chướng ngại vật, Tăng tốc, Về đích.
              </p>
            </div>
          ) : (
            <p>Đang chờ chủ phòng bắt đầu…</p>
          )}
        </div>
      )}

      {state.phase === "preparing" && <p className="card text-center">Đang chuẩn bị bộ câu hỏi…</p>}

      {state.phase === "intro" && state.intro && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card space-y-2 py-10 text-center">
          <h2 className="text-3xl font-extrabold text-gold">{state.intro.title}</h2>
          <p className="mx-auto max-w-xl text-navy/70 dark:text-paper/70">{state.intro.subtitle}</p>
          {g.isHost && (
            <button className="btn btn-ghost mx-auto mt-3" onClick={g.nextQuestion}>
              Bỏ qua
            </button>
          )}
        </motion.div>
      )}

      {/* Vượt chướng ngại vật */}
      {state.cnv && state.phase !== "lobby" && state.phase !== "preparing" && state.phase !== "intro" && state.phase !== "finished" && (
        <CnvPanel state={state} cnv={state.cnv} g={g} />
      )}

      {/* Chọn gói Về đích */}
      {state.phase === "pick" && (
        <div className="card space-y-3">
          <TimerBar remainingMs={g.remainingMs} totalMs={g.totalMs} />
          {state.activePlayerId === me.id ? <PickPanel g={g} /> : <p className="text-center">{active?.name} đang chọn gói câu hỏi…</p>}
        </div>
      )}

      {/* Câu hỏi các vòng khác */}
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
            {!state.question.verified && <span className="chip !bg-bell/15 !text-bell">AI sinh · chưa kiểm chứng</span>}
            <span className="ml-auto font-bold text-gold">{pointsLabel(state)}</span>
          </div>

          {active && state.round !== "tang-toc" && <p className="text-sm text-navy/60 dark:text-paper/60">Lượt của {active.name}</p>}

          <p className="text-2xl font-semibold leading-snug">{state.question.content}</p>
          {state.question.media && <img src={state.question.media} alt="Hình của câu hỏi" className="mx-auto max-h-64 rounded-xl bg-white" />}
          {state.question.items && (
            <ol className="grid gap-2 sm:grid-cols-2">
              {state.question.items.map((it, i) => (
                <li key={i} className="rounded-lg bg-gold/10 px-3 py-2 font-semibold">
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
              <Interaction state={state} g={g} meId={me.id} />
              {winner && state.stage !== "solo" && (
                <p className="text-center text-sm">
                  <Bell className="mr-1 inline text-bell" size={16} />
                  {winner.id === me.id ? "Bạn" : winner.name} giành quyền trả lời
                  {state.buzzRanking.length > 1 && (
                    <span className="block text-xs text-navy/60 dark:text-paper/60">
                      {state.buzzRanking.map((r) => `${nameOf(r.playerId)} +${r.deltaMs}ms`).join(" · ")}
                    </span>
                  )}
                </p>
              )}
              {state.lastAnswer && state.stage === "solo" && (
                <p className="text-center text-sm">
                  Câu trước: {state.lastAnswer.correct ? "đúng" : `sai (đáp án ${state.lastAnswer.answer})`}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {state.phase === "reveal" && state.reveal && <RevealCard state={state} g={g} />}

      {state.phase === "finished" && state.summary && <Finished state={state} g={g} meId={me.id} />}
    </div>
  );
}

// ---------------------------------------------------------------- tiện ích
function tvNote(s: RoomState) {
  if (s.round !== "khoi-dong") return "";
  if (s.stage === "solo") return "Bạn có 20 giây để gõ. Thi thật trên truyền hình chỉ có 5 giây.";
  if (s.stage === "general") return "Thi thật: sau 3 giây không ai bấm chuông, MC công bố đáp án. Bản web cho 12 giây.";
  if (s.stage === "general-answer") return "Bạn có 15 giây để gõ. Thi thật trên truyền hình là 5 giây.";
  return "";
}

function canBuzz(state: RoomState | null, meId?: string) {
  if (!state || !meId || state.phase !== "question" || state.buzzWinnerId) return false;
  const me = state.players.find((p) => p.id === meId);
  if (!me || me.lockedOut) return false;
  return state.stage === "general" || state.stage === "steal" || state.stage === "tiebreak";
}

function pointsLabel(s: RoomState) {
  if (!s.question) return "";
  if (s.round === "tang-toc") return "40·30·20·10 đ";
  if (s.round === "ve-dich") return `${s.question.points}${s.question.star ? "×2" : ""} đ`;
  if (s.round === "khoi-dong") return "10 đ";
  return "";
}

function Interaction({ state, g, meId }: { state: RoomState; g: G; meId: string }) {
  const me = state.players.find((p) => p.id === meId)!;
  const [text, setText] = useState("");
  const key = `${state.question?.id}|${state.stage}|${state.buzzWinnerId}`;
  useEffect(() => setText(""), [key]);

  const canAnswer =
    (state.stage === "solo" && state.activePlayerId === meId) ||
    (state.stage === "answer" && state.activePlayerId === meId) ||
    (["general-answer", "steal-answer", "tiebreak-answer"].includes(state.stage ?? "") && state.buzzWinnerId === meId) ||
    (state.stage === "race" && !me.answered);

  if (canBuzz(state, meId) || (["general", "steal", "tiebreak"].includes(state.stage ?? "") && !state.buzzWinnerId)) {
    const enabled = canBuzz(state, meId);
    return (
      <div className="flex flex-col items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={g.buzz}
          disabled={!enabled}
          className="flex h-36 w-36 items-center justify-center rounded-full bg-bell text-white shadow-bell transition enabled:animate-pulse-bell disabled:opacity-40"
          aria-label="Bấm chuông"
        >
          <Bell size={56} />
        </motion.button>
        <p className="text-sm text-navy/60 dark:text-paper/60">
          {enabled ? "Nhấn chuông hoặc phím Cách" : me.lockedOut ? "Bạn không được bấm chuông ở câu này" : ""}
        </p>
      </div>
    );
  }

  if (canAnswer) {
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
        <button className="btn btn-gold" disabled={!text.trim()}>
          Trả lời
        </button>
        {(state.stage === "solo" || state.stage === "answer") && (
          <button type="button" className="btn btn-ghost" onClick={g.skipAnswer}>
            Bỏ qua
          </button>
        )}
      </form>
    );
  }
  if (state.stage === "race" && me.answered) return <p className="text-center text-sm">Đã nộp. Chờ mọi người…</p>;
  return <p className="text-center text-sm text-navy/60 dark:text-paper/60">Đang chờ đối thủ…</p>;
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
  const nameOf = (id: string) => state.players.find((p) => p.id === id)?.name ?? "?";
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
                <b>{nameOf(x.playerId)}</b> trả lời: {x.text} <span className={ok ? "font-bold text-green-400" : "font-bold text-red-300"}>{ok ? "✓ đúng" : "✗ sai"}</span>
              </li>
            );
          })}
        </ul>
      )}
      <p>{r.explanation}</p>
      {r.trivia && <p className="text-sm italic text-navy/70 dark:text-paper/70">Bạn có biết? {r.trivia}</p>}
      <ul className="text-sm">
        {r.awards.length === 0 && <li>Không ai thay đổi điểm ở câu này.</li>}
        {r.awards.map((a, i) => (
          <li key={i} className="font-semibold">
            {nameOf(a.playerId)}: {a.delta >= 0 ? "+" : ""}
            {a.delta}
          </li>
        ))}
      </ul>
      {g.isHost && (
        <button className="btn btn-gold !py-1.5" onClick={g.nextQuestion}>
          Tiếp tục
        </button>
      )}
    </div>
  );
}

function Finished({ state, g, meId }: { state: RoomState; g: G; meId: string }) {
  const s = state.summary!;
  return (
    <div className="card space-y-4 text-center">
      <Trophy className="mx-auto text-gold" size={44} />
      <h2 className="text-2xl font-extrabold">Kết thúc trận đấu</h2>
      <ol className="mx-auto max-w-sm space-y-1 text-left">
        {s.players.map((p, i) => (
          <li key={p.id} className="flex justify-between rounded-lg bg-gold/10 px-3 py-2 font-semibold">
            <span>
              {i + 1}. {p.name}
              {p.id === meId && " (bạn)"}
            </span>
            <span>
              {p.score} đ · Elo {p.eloAfter} ({p.eloAfter - p.eloBefore >= 0 ? "+" : ""}
              {p.eloAfter - p.eloBefore})
            </span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap justify-center gap-3">
        {g.isHost && (
          <button className="btn btn-gold" onClick={g.rematch}>
            Đấu lại
          </button>
        )}
        <Link href={`/history/${s.id}`} className="btn btn-ghost">
          Xem lại trận đấu
        </Link>
        <Link href="/" className="btn btn-ghost">
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}

function Scoreboard({ state, meId }: { state: RoomState; meId: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[...state.players].sort((a, b) => a.seat - b.seat).map((p) => (
        <PlayerCard key={p.id} p={p} isMe={p.id === meId} isHost={p.id === state.hostId} state={state} />
      ))}
    </div>
  );
}

function PlayerCard({ p, isMe, isHost, state }: { p: PublicPlayer; isMe: boolean; isHost: boolean; state: RoomState }) {
  const buzzing = state.buzzWinnerId === p.id && state.phase === "question";
  const turn = state.activePlayerId === p.id;
  return (
    <div
      className={`card !p-3 transition ${isMe ? "ring-2 ring-gold" : ""} ${buzzing ? "!border-bell shadow-bell" : ""} ${turn ? "!border-gold" : ""} ${p.connected ? "" : "opacity-50"}`}
    >
      <div className="flex items-center gap-1 truncate text-sm font-semibold">
        {isHost && <Crown size={14} className="shrink-0 text-gold" />}
        <span className="truncate">{p.name}</span>
        {p.answered && state.phase === "question" && <Check size={14} className="ml-auto text-green-500" />}
        {(p.lockedOut || p.cnvLocked) && state.phase === "question" && <X size={14} className="ml-auto text-bell" />}
      </div>
      <div className="text-2xl font-extrabold tabular-nums">{p.score}</div>
      <div className="text-xs text-navy/50 dark:text-paper/50">Elo {p.elo}</div>
    </div>
  );
}
