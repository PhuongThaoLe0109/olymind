// Engine thi đấu Olympia: máy trạng thái cho 4 vòng, không phụ thuộc Socket.io.
// Chạy được cả trên Node (qua adapter socket.ts) lẫn trong trình duyệt (bản demo, test mô phỏng).
//
// Chống gian lận / chống trễ khi bấm chuông:
//  - Không tin thời gian client. Server đo RTT từng người bằng ping/ack (trung vị 5 mẫu).
//  - Thời điểm bấm hiệu chỉnh = thời điểm gói tin tới server − RTT/2 (tối đa 150 ms).
//  - Gom các lần bấm trong cửa sổ 80 ms rồi chọn người có thời điểm hiệu chỉnh nhỏ nhất.
import { computeElo } from "../lib/elo";
import { isCorrect } from "../lib/judge";
import { RULES_WEB, type Rules } from "../lib/rules";
import {
  ROUND_LABEL,
  ROUND_ORDER,
  ROUND_RULE_TEXT,
  type Ack,
  type BuzzRank,
  type CnvPuzzle,
  type LastAnswer,
  type MatchEvent,
  type MatchPlan,
  type MatchSummary,
  type PackState,
  type Phase,
  type PublicCnv,
  type PublicPlayer,
  type PublicQuestion,
  type Question,
  type QuestionResult,
  type RevealInfo,
  type RoomState,
  type RoundKey,
  type ScorePoint,
  type Stage,
} from "../lib/types";

export type HubEvent = "room:state" | "game:start_timer" | "buzzer:awarded" | "score:update";
export interface Hub {
  emit(code: string, event: HubEvent, payload: unknown): void;
}

export interface EngineDeps {
  hub: Hub;
  makePlan: (o: { seed: string; useAI: boolean; playerCount: number }) => Promise<MatchPlan>;
  rules?: Rules;
  onFinish?: (summary: MatchSummary, anyConnected: boolean) => void;
}

const MAX_PLAYERS = 4;

type Step =
  | "lobby"
  | "preparing"
  | "intro"
  | "kd-solo"
  | "kd-general"
  | "kd-general-answer"
  | "cnv-row"
  | "cnv-center"
  | "tt"
  | "vd-pick"
  | "vd-answer"
  | "vd-steal"
  | "vd-steal-answer"
  | "tie"
  | "tie-answer"
  | "reveal"
  | "finished";

interface P {
  id: string;
  name: string;
  seat: number;
  elo: number;
  score: number;
  connected: boolean;
  rtt: number[];
  lockedOut: boolean;
  answeredAt: number | null;
  answerCorrect: boolean;
  cnvLocked: boolean;
}

interface CnvRt {
  puzzle: CnvPuzzle;
  letters: string[];
  wordLengths: number[];
  cells: (string | null)[];
  asked: number;
  resolved: boolean[];
  tilesOpen: number;
  centerOpen: boolean;
  solved: boolean;
  ended: boolean;
}

interface Room {
  code: string;
  hostId: string;
  step: Step;
  players: Map<string, P>;
  order: string[];
  plan: MatchPlan | null;
  useAI: boolean;
  source: "ai" | "sample";
  matchNo: number;
  roundIdx: number;
  turn: number;
  qi: number;
  question: Question | null;
  star: boolean;
  deadline: number | null;
  timer: ReturnType<typeof setTimeout> | null;
  next: (() => void) | null;
  intro: { title: string; subtitle: string } | null;
  activeId: string | null;
  pack: PackState | null;
  vdOrder: string[];
  vdAwards: { playerId: string; delta: number }[];
  pending: { playerId: string; adjusted: number }[];
  buzzWindow: ReturnType<typeof setTimeout> | null;
  buzzWinnerId: string | null;
  buzzRanking: BuzzRank[];
  cnv: CnvRt | null;
  reveal: RevealInfo | null;
  lastAnswer: LastAnswer | null;
  tieIds: string[];
  tieIdx: number;
  tieWinnerId: string | null;
  events: MatchEvent[];
  timeline: ScorePoint[];
  results: QuestionResult[];
  summary: MatchSummary | null;
  startedAt: number;
  lastActive: number;
  notice: string | null;
  givens: { playerId: string; text: string }[];
}

// ---------------------------------------------------------------- tiện ích
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randInt(n: number): number {
  const a = new Uint32Array(1);
  globalThis.crypto.getRandomValues(a);
  return a[0] % n;
}
function newId(): string {
  const a = new Uint8Array(12);
  globalThis.crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}
function cleanName(name: unknown): string {
  return typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, 20) : "";
}
const now = () => Date.now();
const hr = () => performance.now();
const letters = (s: string) => Array.from(s.replace(/\s+/g, ""));

function medianRtt(p: P): number | null {
  if (!p.rtt.length) return null;
  const s = [...p.rtt].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

const STAGE: Partial<Record<Step, Stage>> = {
  "kd-solo": "solo",
  "kd-general": "general",
  "kd-general-answer": "general-answer",
  "cnv-row": "row",
  "cnv-center": "center",
  tt: "race",
  "vd-answer": "answer",
  "vd-steal": "steal",
  "vd-steal-answer": "steal-answer",
  tie: "tiebreak",
  "tie-answer": "tiebreak-answer",
};

function phaseOf(step: Step): Phase {
  if (step === "lobby" || step === "preparing" || step === "intro" || step === "reveal" || step === "finished") return step;
  if (step === "vd-pick") return "pick";
  return "question";
}

// ---------------------------------------------------------------- engine
export function createEngine(deps: EngineDeps) {
  const R = deps.rules ?? RULES_WEB;
  const hub = deps.hub;
  const rooms = new Map<string, Room>();

  const key = (room: Room): RoundKey => ROUND_ORDER[room.roundIdx];
  const nameOf = (room: Room, id: string | null) => (id ? room.players.get(id)?.name ?? "?" : "?");
  const seatIndex = (room: Room, id: string) => room.order.indexOf(id);
  const connected = (room: Room) => [...room.players.values()].filter((p) => p.connected);

  // ------------------------------------------------------------ trạng thái công khai
  function publicQuestion(room: Room): PublicQuestion | null {
    const q = room.question;
    if (!q) return null;
    const { id, round, category, type, content, media, items, timeLimit, points, verified, source } = q;
    return { id, round, category, type, content, media, items, timeLimit, points, verified, source, star: room.star || undefined };
  }

  function publicCnv(room: Room): PublicCnv | null {
    const c = room.cnv;
    if (!c) return null;
    return {
      wordLengths: c.wordLengths,
      cells: c.cells,
      rows: c.puzzle.rows.map((r, i) => ({
        length: letters(r.answer).length,
        clue: i < c.asked ? r.clue : null,
        answer: c.resolved[i] ? r.answer : null,
        status: c.resolved[i] ? "done" : i < c.asked ? "asked" : "hidden",
      })),
      currentRow: c.centerOpen ? c.puzzle.rows.length : c.asked - 1,
      centerClue: c.centerOpen ? c.puzzle.center.clue : null,
      tilesOpen: c.tilesOpen,
      imageSvg: c.puzzle.imageSvg ?? null,
      solved: c.solved,
      keyword: c.ended ? c.puzzle.keyword : null,
    };
  }

  function publicPlayer(p: P): PublicPlayer {
    return {
      id: p.id,
      name: p.name,
      seat: p.seat,
      elo: p.elo,
      score: p.score,
      connected: p.connected,
      lockedOut: p.lockedOut,
      answered: p.answeredAt !== null,
      cnvLocked: p.cnvLocked,
      rtt: medianRtt(p) === null ? null : Math.round(medianRtt(p)!),
    };
  }

  function questionProgress(room: Room): [number, number] {
    switch (room.step) {
      case "kd-solo":
        return [room.qi + 1, R.khoiDong.soloQuestions];
      case "kd-general":
      case "kd-general-answer":
        return [room.qi + 1, R.khoiDong.generalQuestions];
      case "tt":
        return [room.qi + 1, room.plan?.tangToc.length ?? 4];
      case "vd-answer":
      case "vd-steal":
      case "vd-steal-answer":
        return [(room.pack?.index ?? 0) + 1, R.veDich.perPack];
      case "tie":
      case "tie-answer":
        return [room.tieIdx + 1, room.plan?.tiebreak.length ?? 1];
      case "reveal":
        if (room.roundIdx === 0) return [room.qi + 1, room.activeId ? R.khoiDong.soloQuestions : R.khoiDong.generalQuestions];
        if (room.roundIdx === 2) return [room.qi + 1, room.plan?.tangToc.length ?? 4];
        if (room.roundIdx === 3 && room.pack) return [room.pack.index + 1, R.veDich.perPack];
        return [room.qi + 1, 0];
      default:
        return [room.qi + 1, 0];
    }
  }

  function snapshot(room: Room): RoomState {
    const [qn, qc] = questionProgress(room);
    const showQ = room.question !== null && room.step !== "intro" && room.step !== "lobby" && room.step !== "finished";
    return {
      code: room.code,
      hostId: room.hostId,
      phase: phaseOf(room.step),
      stage: STAGE[room.step] ?? null,
      players: [...room.players.values()].sort((a, b) => a.seat - b.seat).map(publicPlayer),
      round: room.step === "lobby" || room.step === "preparing" || room.step === "finished" ? null : key(room),
      roundIndex: room.roundIdx,
      activePlayerId: room.activeId,
      intro: room.step === "intro" ? room.intro : null,
      question: showQ ? publicQuestion(room) : null,
      questionNumber: qn,
      questionCount: qc,
      pack: room.pack,
      cnv: key(room) === "vuot-chuong-ngai-vat" && room.step !== "lobby" && room.step !== "preparing" ? publicCnv(room) : null,
      deadline: room.deadline,
      serverTime: now(),
      buzzWinnerId: room.buzzWinnerId,
      buzzRanking: room.buzzRanking,
      lastAnswer: room.lastAnswer,
      reveal: room.step === "reveal" ? room.reveal : null,
      summary: room.step === "finished" ? room.summary : null,
      questionsSource: room.source,
      notice: room.notice,
      matchNo: room.matchNo,
    };
  }

  const broadcast = (room: Room) => {
    room.lastActive = now();
    hub.emit(room.code, "room:state", snapshot(room));
  };

  const scoresOf = (room: Room) => Object.fromEntries([...room.players.values()].map((p) => [p.id, p.score]));

  // ------------------------------------------------------------ hạ tầng: timer, log, điểm
  function clearTimer(room: Room) {
    if (room.timer) clearTimeout(room.timer);
    room.timer = null;
    room.deadline = null;
  }
  function schedule(room: Room, ms: number, fn: () => void) {
    if (room.timer) clearTimeout(room.timer);
    room.deadline = now() + ms;
    room.timer = setTimeout(() => {
      room.timer = null;
      fn();
    }, ms);
  }
  function startTimer(room: Room, ms: number, fn: () => void) {
    schedule(room, ms, fn);
    hub.emit(room.code, "game:start_timer", { deadline: room.deadline!, serverTime: now() });
  }
  function clearBuzz(room: Room) {
    if (room.buzzWindow) clearTimeout(room.buzzWindow);
    room.buzzWindow = null;
    room.pending = [];
    room.buzzWinnerId = null;
    room.buzzRanking = [];
  }
  function log(room: Room, e: Omit<MatchEvent, "t">) {
    room.events.push({ t: now() - room.startedAt, ...e });
  }
  /** Cộng/trừ điểm có sàn; trả về mức thay đổi thực tế. */
  function award(room: Room, id: string, delta: number): number {
    const p = room.players.get(id);
    if (!p) return 0;
    const before = p.score;
    p.score = Math.max(R.scoreFloor, before + delta);
    return p.score - before;
  }
  function checkpoint(room: Room, label: string) {
    room.timeline.push({ index: room.timeline.length, label, scores: scoresOf(room) });
    log(room, { type: "score", scores: scoresOf(room), text: label });
    hub.emit(room.code, "score:update", scoresOf(room));
  }
  function record(room: Room, r: Omit<QuestionResult, "round">) {
    room.results.push({ ...r, round: key(room) });
  }
  function resetAnswers(room: Room) {
    for (const p of room.players.values()) {
      p.answeredAt = null;
      p.answerCorrect = false;
    }
  }
  function resetLocks(room: Room) {
    for (const p of room.players.values()) p.lockedOut = false;
  }

  // ------------------------------------------------------------ màn chờ và công bố đáp án
  function runNext(room: Room) {
    const n = room.next;
    room.next = null;
    if (n) n();
  }

  function intro(room: Room, title: string, subtitle: string, next: () => void) {
    clearTimer(room);
    clearBuzz(room);
    room.step = "intro";
    room.intro = { title, subtitle };
    room.question = null;
    room.star = false;
    room.lastAnswer = null;
    room.next = next;
    schedule(room, R.introMs, () => runNext(room));
    broadcast(room);
  }

  function reveal(room: Room, info: RevealInfo, next: () => void, ms: number = R.revealMs) {
    clearTimer(room);
    clearBuzz(room);
    room.step = "reveal";
    room.reveal = { ...info, given: room.givens.splice(0) };
    room.next = next;
    log(room, { type: "reveal", text: info.answer });
    checkpoint(room, `${ROUND_LABEL[key(room)]}`);
    schedule(room, ms, () => runNext(room));
    broadcast(room);
  }

  const emptyReveal = (q: Question, note: string | null, awards: RevealInfo["awards"] = []): RevealInfo => ({
    answer: q.answer,
    explanation: q.explanation,
    trivia: q.trivia,
    correctPlayerIds: [],
    awards,
    note,
  });

  // ------------------------------------------------------------ bấm chuông dùng chung
  function press(room: Room, p: P, eligible: boolean, onWinner: (id: string) => void) {
    if (!eligible) return;
    if (room.pending.some((b) => b.playerId === p.id)) return;
    const arrival = hr();
    const comp = Math.min((medianRtt(p) ?? 0) / 2, R.maxRttCompMs);
    room.pending.push({ playerId: p.id, adjusted: arrival - comp });
    if (!room.buzzWindow) {
      room.buzzWindow = setTimeout(() => {
        room.buzzWindow = null;
        const sorted = [...room.pending].sort((a, b) => a.adjusted - b.adjusted);
        if (!sorted.length) return;
        room.buzzWinnerId = sorted[0].playerId;
        room.buzzRanking = sorted.map((b) => ({ playerId: b.playerId, deltaMs: Math.round(b.adjusted - sorted[0].adjusted) }));
        room.pending = [];
        log(room, { type: "buzz", playerId: room.buzzWinnerId });
        hub.emit(room.code, "buzzer:awarded", { playerId: room.buzzWinnerId, ranking: room.buzzRanking });
        onWinner(room.buzzWinnerId);
      }, R.buzzWindowMs);
    }
  }

  // ------------------------------------------------------------ vòng 1: Khởi động
  function startRound(room: Room, idx: number) {
    if (idx >= ROUND_ORDER.length) return finish(room);
    room.roundIdx = idx;
    room.turn = 0;
    room.qi = 0;
    room.pack = null;
    room.activeId = null;
    room.cnv = null;
    const k = ROUND_ORDER[idx];
    log(room, { type: "round", text: ROUND_LABEL[k] });
    const start = {
      "khoi-dong": () => kdStartTurn(room, 0),
      "vuot-chuong-ngai-vat": () => cnvStart(room),
      "tang-toc": () => ttAsk(room),
      "ve-dich": () => vdStart(room),
    }[k];
    intro(room, `Vòng ${idx + 1}: ${ROUND_LABEL[k]}`, ROUND_RULE_TEXT[k], start);
  }

  function kdStartTurn(room: Room, turn: number) {
    if (turn >= room.order.length) return kdStartGeneral(room);
    room.turn = turn;
    room.qi = 0;
    room.activeId = room.order[turn];
    log(room, { type: "turn", playerId: room.activeId });
    intro(
      room,
      `Khởi động riêng: ${nameOf(room, room.activeId)}`,
      `${R.khoiDong.soloQuestions} câu, mỗi câu ${R.khoiDong.shown.soloS} giây để gõ (thi thật trên truyền hình chỉ có ${R.khoiDong.shown.tvSoloS} giây). Đúng +${R.khoiDong.correct}, sai không bị trừ.`,
      () => kdAskSolo(room),
    );
  }

  function endSoloTurn(room: Room) {
    clearTimer(room);
    const who = nameOf(room, room.activeId);
    room.question = null;
    checkpoint(room, `Khởi động · ${who}`);
    kdStartTurn(room, room.turn + 1);
  }

  function kdAskSolo(room: Room) {
    const q = room.plan?.khoiDongSolo[seatIndex(room, room.activeId!)]?.[room.qi];
    if (!q || room.qi >= R.khoiDong.soloQuestions) return endSoloTurn(room);
    room.question = q;
    room.step = "kd-solo";
    log(room, { type: "question", playerId: room.activeId!, text: q.content });
    startTimer(room, R.khoiDong.soloAnswerMs, () => kdSoloResult(room, false));
    broadcast(room);
  }

  function kdSoloResult(room: Room, correct: boolean) {
    const q = room.question;
    const owner = room.activeId;
    if (!q || !owner || room.step !== "kd-solo") return;
    clearTimer(room);
    const applied = award(room, owner, correct ? R.khoiDong.correct : 0);
    room.lastAnswer = { playerId: owner, correct, answer: q.answer, delta: applied };
    log(room, { type: "answer", playerId: owner, correct, delta: applied });
    record(room, {
      content: q.content, category: q.category, type: q.type, answer: q.answer, explanation: q.explanation, trivia: q.trivia,
      ownerId: owner, correctPlayerIds: correct ? [owner] : [],
    });
    const timedOut = !room.givens.some((g) => g.playerId === owner);
    reveal(
      room,
      {
        answer: q.answer, explanation: q.explanation, trivia: q.trivia,
        correctPlayerIds: correct ? [owner] : [], awards: [{ playerId: owner, delta: applied }],
        note: correct ? null : timedOut ? "Hết giờ hoặc bỏ qua" : "Trả lời chưa đúng",
      },
      () => {
        room.qi += 1;
        kdAskSolo(room);
      },
      R.soloRevealMs,
    );
  }

  function kdStartGeneral(room: Room) {
    room.activeId = null;
    room.qi = 0;
    intro(
      room,
      "Khởi động chung",
      `${R.khoiDong.generalQuestions} câu bấm chuông. Sau khi bấm có ${R.khoiDong.shown.answerS} giây để gõ (thi thật: ${R.khoiDong.shown.tvAnswerS} giây). Đúng +${R.khoiDong.correct}, sai hoặc quá giờ ${R.khoiDong.generalWrong}, điểm không âm.`,
      () => kdAskGeneral(room),
    );
  }

  function kdAskGeneral(room: Room) {
    const q = room.plan?.khoiDongGeneral[room.qi];
    if (!q || room.qi >= R.khoiDong.generalQuestions) {
      room.question = null;
      return startRound(room, room.roundIdx + 1);
    }
    clearBuzz(room);
    resetLocks(room);
    room.question = q;
    room.step = "kd-general";
    log(room, { type: "question", text: q.content });
    startTimer(room, R.khoiDong.generalNoBuzzMs, () => {
      record(room, {
        content: q.content, category: q.category, type: q.type, answer: q.answer, explanation: q.explanation, trivia: q.trivia,
        ownerId: null, correctPlayerIds: [],
      });
      reveal(room, emptyReveal(q, "Không ai bấm chuông"), () => {
        room.qi += 1;
        kdAskGeneral(room);
      });
    });
    broadcast(room);
  }

  function kdGeneralWinner(room: Room, winner: string) {
    room.step = "kd-general-answer";
    startTimer(room, R.khoiDong.generalAnswerMs, () => kdGeneralResult(room, winner, false));
    broadcast(room);
  }

  function kdGeneralResult(room: Room, winner: string, correct: boolean) {
    const q = room.question;
    if (!q || room.step !== "kd-general-answer") return;
    const applied = award(room, winner, correct ? R.khoiDong.correct : R.khoiDong.generalWrong);
    log(room, { type: "answer", playerId: winner, correct, delta: applied });
    record(room, {
      content: q.content, category: q.category, type: q.type, answer: q.answer, explanation: q.explanation, trivia: q.trivia,
      ownerId: null, correctPlayerIds: correct ? [winner] : [],
    });
    reveal(
      room,
      {
        answer: q.answer, explanation: q.explanation, trivia: q.trivia,
        correctPlayerIds: correct ? [winner] : [],
        awards: [{ playerId: winner, delta: applied }],
        note: correct ? null : "Trả lời sai hoặc quá giờ, câu hỏi kết thúc",
      },
      () => {
        room.qi += 1;
        kdAskGeneral(room);
      },
    );
  }

  // ------------------------------------------------------------ vòng 2: Vượt chướng ngại vật
  function cnvStart(room: Room) {
    const puzzle = room.plan!.cnv;
    const ls = letters(puzzle.keyword);
    room.cnv = {
      puzzle,
      letters: ls,
      wordLengths: puzzle.keyword.split(/\s+/).filter(Boolean).map((w) => Array.from(w).length),
      cells: ls.map(() => null),
      asked: 0,
      resolved: puzzle.rows.map(() => false),
      tilesOpen: 0,
      centerOpen: false,
      solved: false,
      ended: false,
    };
    for (const p of room.players.values()) p.cnvLocked = false;
    cnvAskRow(room, 0);
  }

  function cnvActive(room: Room) {
    return connected(room).filter((p) => !p.cnvLocked);
  }

  function cnvAskRow(room: Room, r: number) {
    const c = room.cnv!;
    if (r >= c.puzzle.rows.length) return cnvCenter(room);
    c.asked = r + 1;
    room.qi = r;
    resetAnswers(room);
    room.step = "cnv-row";
    room.question = null;
    log(room, { type: "question", text: c.puzzle.rows[r].clue });
    startTimer(room, R.cnv.rowMs, () => cnvResolveRow(room));
    broadcast(room);
  }

  function cnvResolveRow(room: Room) {
    const c = room.cnv!;
    if (room.step !== "cnv-row") return;
    const r = room.qi;
    const row = c.puzzle.rows[r];
    clearTimer(room);
    const right = [...room.players.values()].filter((p) => p.answeredAt !== null && p.answerCorrect);
    const awards = right.map((p) => ({ playerId: p.id, delta: award(room, p.id, R.cnv.rowPoints) }));
    c.resolved[r] = true;
    for (const i of row.reveals) if (i < c.letters.length) c.cells[i] = c.letters[i];
    c.tilesOpen = Math.min(4, c.tilesOpen + 1);
    room.results.push({
      content: row.clue, category: "chung", round: key(room), type: "text", answer: row.answer, explanation: row.explanation, trivia: "",
      ownerId: null, correctPlayerIds: right.map((p) => p.id),
    });
    reveal(
      room,
      {
        answer: row.answer, explanation: row.explanation, trivia: "",
        correctPlayerIds: right.map((p) => p.id), awards,
        note: row.reveals.length ? `Mở ${row.reveals.length} chữ của từ khóa` : null,
      },
      () => cnvAskRow(room, r + 1),
    );
  }

  function cnvCenter(room: Room) {
    const c = room.cnv!;
    c.centerOpen = true;
    c.tilesOpen = 5;
    room.qi = c.puzzle.rows.length;
    room.step = "cnv-center";
    room.question = null;
    log(room, { type: "question", text: c.puzzle.center.clue });
    startTimer(room, R.cnv.centerMs, () => cnvEnd(room, null, 0));
    broadcast(room);
  }

  function cnvEnd(room: Room, solver: string | null, applied: number) {
    const c = room.cnv!;
    clearTimer(room);
    c.ended = true;
    c.solved = solver !== null;
    c.tilesOpen = 5;
    c.cells = [...c.letters];
    c.resolved = c.resolved.map(() => true);
    room.results.push({
      content: `Từ khóa vòng Vượt chướng ngại vật (${c.letters.length} chữ cái)`, category: "chung", round: key(room), type: "text",
      answer: c.puzzle.keyword, explanation: c.puzzle.explanation, trivia: "", ownerId: null, correctPlayerIds: solver ? [solver] : [],
    });
    reveal(
      room,
      {
        answer: c.puzzle.keyword, explanation: c.puzzle.explanation, trivia: "",
        correctPlayerIds: solver ? [solver] : [],
        awards: solver ? [{ playerId: solver, delta: applied }] : [],
        note: solver ? `${nameOf(room, solver)} tìm ra từ khóa` : "Không ai tìm ra từ khóa",
      },
      () => startRound(room, room.roundIdx + 1),
    );
  }

  function cnvGuess(room: Room, p: P, text: string) {
    const c = room.cnv;
    if (!c || c.ended || key(room) !== "vuot-chuong-ngai-vat") return;
    if (!(room.step === "cnv-row" || room.step === "cnv-center" || room.step === "reveal")) return;
    if (p.cnvLocked || !text.trim()) return;
    if (isCorrect(text, c.puzzle.keyword)) {
      const pts = c.centerOpen ? R.cnv.centerPoints : R.cnv.keywordPoints[Math.min(c.asked, R.cnv.keywordPoints.length) - 1] ?? R.cnv.centerPoints;
      const applied = award(room, p.id, pts);
      log(room, { type: "cnv", playerId: p.id, correct: true, delta: applied });
      cnvEnd(room, p.id, applied);
    } else {
      log(room, { type: "cnv", playerId: p.id, correct: false });
      if (R.cnv.wrongLocksPlayer) p.cnvLocked = true;
      if (!cnvActive(room).length) return cnvEnd(room, null, 0);
      broadcast(room);
    }
  }

  // ------------------------------------------------------------ vòng 3: Tăng tốc
  function ttAsk(room: Room) {
    const q = room.plan?.tangToc[room.qi];
    if (!q) {
      room.question = null;
      return startRound(room, room.roundIdx + 1);
    }
    resetAnswers(room);
    room.question = q;
    room.step = "tt";
    log(room, { type: "question", text: q.content });
    startTimer(room, R.tangToc.timesMs[room.qi] ?? q.timeLimit * 1000, () => ttResolve(room));
    broadcast(room);
  }

  function ttResolve(room: Room) {
    const q = room.question;
    if (!q || room.step !== "tt") return;
    clearTimer(room);
    const right = [...room.players.values()]
      .filter((p) => p.answeredAt !== null && p.answerCorrect)
      .sort((a, b) => a.answeredAt! - b.answeredAt!);
    const awards = right.map((p, i) => ({ playerId: p.id, delta: award(room, p.id, R.tangToc.points[i] ?? R.tangToc.points[R.tangToc.points.length - 1]) }));
    record(room, {
      content: q.content, category: q.category, type: q.type, answer: q.answer, explanation: q.explanation, trivia: q.trivia,
      ownerId: null, correctPlayerIds: right.map((p) => p.id),
    });
    reveal(
      room,
      { answer: q.answer, explanation: q.explanation, trivia: q.trivia, correctPlayerIds: right.map((p) => p.id), awards, note: right.length ? null : "Không ai trả lời đúng" },
      () => {
        room.qi += 1;
        ttAsk(room);
      },
    );
  }

  // ------------------------------------------------------------ vòng 4: Về đích
  function vdStart(room: Room) {
    room.vdOrder = [...room.order].sort((a, b) => {
      const pa = room.players.get(a)!;
      const pb = room.players.get(b)!;
      return R.veDich.orderByScoreDesc ? pb.score - pa.score || pa.seat - pb.seat : pa.seat - pb.seat;
    });
    vdStartTurn(room, 0);
  }

  function vdStartTurn(room: Room, turn: number) {
    if (turn >= room.vdOrder.length) return vdEnd(room);
    room.turn = turn;
    room.activeId = room.vdOrder[turn];
    room.pack = null;
    log(room, { type: "turn", playerId: room.activeId });
    intro(
      room,
      `Về đích: ${nameOf(room, room.activeId)}`,
      `Chọn gói ${R.veDich.perPack} câu (${R.veDich.values.join(" hoặc ")} điểm) và có thể dùng Ngôi sao hy vọng.`,
      () => vdPick(room),
    );
  }

  function vdPick(room: Room) {
    room.step = "vd-pick";
    room.question = null;
    room.star = false;
    startTimer(room, R.veDich.pickMs, () => vdSetPack(room, Array(R.veDich.perPack).fill(R.veDich.values[0]), null));
    broadcast(room);
  }

  function vdSetPack(room: Room, values: number[], star: number | null) {
    if (room.step !== "vd-pick" || !room.activeId) return;
    clearTimer(room);
    room.pack = { playerId: room.activeId, values, star, index: 0 };
    log(room, { type: "pick", playerId: room.activeId, text: values.join("-") });
    if (star !== null) log(room, { type: "star", playerId: room.activeId, text: String(star + 1) });
    vdAsk(room, 0);
  }

  function vdAsk(room: Room, qi: number) {
    const pack = room.pack!;
    const owner = room.activeId!;
    if (qi >= R.veDich.perPack) {
      room.question = null;
      room.star = false;
      checkpoint(room, `Về đích · ${nameOf(room, owner)}`);
      return vdStartTurn(room, room.turn + 1);
    }
    const base = room.plan?.veDich[seatIndex(room, owner)]?.[qi];
    if (!base) return vdAsk(room, qi + 1);
    pack.index = qi;
    room.question = { ...base, points: pack.values[qi] };
    room.star = pack.star === qi;
    room.vdAwards = [];
    clearBuzz(room);
    resetLocks(room);
    room.players.get(owner)!.lockedOut = true; // chủ gói không tự cướp điểm của mình
    room.step = "vd-answer";
    log(room, { type: "question", playerId: owner, text: room.question.content });
    startTimer(room, R.veDich.answerMs, () => vdOwnerFail(room));
    broadcast(room);
  }

  function vdFinishQuestion(room: Room, correctIds: string[], note: string | null) {
    const q = room.question!;
    const owner = room.activeId!;
    const qi = room.pack!.index;
    record(room, {
      content: q.content, category: q.category, type: q.type, answer: q.answer, explanation: q.explanation, trivia: q.trivia,
      ownerId: owner, correctPlayerIds: correctIds,
    });
    reveal(
      room,
      { answer: q.answer, explanation: q.explanation, trivia: q.trivia, correctPlayerIds: correctIds, awards: room.vdAwards, note },
      () => vdAsk(room, qi + 1),
    );
  }

  function vdOwnerCorrect(room: Room) {
    const q = room.question!;
    const owner = room.activeId!;
    clearTimer(room);
    const value = q.points * (room.star ? R.veDich.starMultiplier : 1);
    room.vdAwards.push({ playerId: owner, delta: award(room, owner, value) });
    log(room, { type: "answer", playerId: owner, correct: true, delta: value });
    vdFinishQuestion(room, [owner], room.star ? "Ngôi sao hy vọng nhân đôi điểm" : null);
  }

  function vdOwnerFail(room: Room) {
    const q = room.question!;
    const owner = room.activeId!;
    if (room.step !== "vd-answer") return;
    clearTimer(room);
    log(room, { type: "answer", playerId: owner, correct: false });
    if (room.star && R.veDich.starWrongLosesBase) {
      room.vdAwards.push({ playerId: owner, delta: award(room, owner, -q.points) });
    }
    vdOpenSteal(room);
  }

  function vdStealCandidates(room: Room) {
    return connected(room).filter((p) => p.id !== room.activeId && !p.lockedOut);
  }

  function vdOpenSteal(room: Room) {
    if (!vdStealCandidates(room).length) return vdFinishQuestion(room, [], "Không có ai để cướp điểm");
    clearBuzz(room);
    room.step = "vd-steal";
    startTimer(room, R.veDich.stealWindowMs, () => vdFinishQuestion(room, [], "Không ai cướp được điểm"));
    broadcast(room);
  }

  function vdStealWinner(room: Room, winner: string) {
    room.step = "vd-steal-answer";
    startTimer(room, R.veDich.stealAnswerMs, () => vdStealResult(room, winner, false));
    broadcast(room);
  }

  function vdStealResult(room: Room, winner: string, correct: boolean) {
    const q = room.question!;
    const owner = room.activeId!;
    if (room.step !== "vd-steal-answer") return;
    clearTimer(room);
    if (correct) {
      const gain = q.points;
      room.vdAwards.push({ playerId: winner, delta: award(room, winner, gain) });
      // Điểm bị cướp lấy từ chủ gói; nếu chủ gói đã mất điểm vì Ngôi sao thì không trừ lần hai.
      if (R.veDich.stealTakesFromOwner && !(room.star && R.veDich.starWrongLosesBase)) {
        room.vdAwards.push({ playerId: owner, delta: award(room, owner, -gain) });
      }
      log(room, { type: "steal", playerId: winner, correct: true, delta: gain });
      return vdFinishQuestion(room, [winner], `${nameOf(room, winner)} cướp điểm thành công`);
    }
    const loss = -Math.floor(q.points * R.veDich.stealWrongRatio);
    room.vdAwards.push({ playerId: winner, delta: award(room, winner, loss) });
    room.players.get(winner)!.lockedOut = true;
    log(room, { type: "steal", playerId: winner, correct: false, delta: loss });
    vdOpenSteal(room);
  }

  function vdEnd(room: Room) {
    room.question = null;
    room.activeId = null;
    room.pack = null;
    const list = [...room.players.values()];
    const top = Math.max(...list.map((p) => p.score));
    const tied = list.filter((p) => p.score === top);
    if (list.length >= 2 && tied.length >= 2 && (room.plan?.tiebreak.length ?? 0) > 0) return tieStart(room, tied.map((p) => p.id));
    finish(room);
  }

  // ------------------------------------------------------------ câu hỏi phụ khi hòa đầu bảng
  function tieStart(room: Room, ids: string[]) {
    room.tieIds = ids;
    room.tieIdx = 0;
    room.tieWinnerId = null;
    log(room, { type: "tiebreak", text: ids.map((i) => nameOf(room, i)).join(", ") });
    intro(room, "Câu hỏi phụ", `Hòa điểm đầu bảng: ${ids.map((i) => nameOf(room, i)).join(", ")}. Ai bấm chuông trước và đúng sẽ thắng.`, () => tieAsk(room));
  }

  function tieAsk(room: Room) {
    const q = room.plan?.tiebreak[room.tieIdx];
    if (!q) {
      room.question = null;
      return finish(room);
    }
    clearBuzz(room);
    for (const p of room.players.values()) p.lockedOut = !room.tieIds.includes(p.id);
    room.question = { ...q, points: 0 };
    room.step = "tie";
    log(room, { type: "question", text: q.content });
    startTimer(room, R.tiebreak.windowMs, () => tieNobody(room));
    broadcast(room);
  }

  function tieNobody(room: Room) {
    const q = room.question!;
    reveal(room, emptyReveal(q, "Không ai bấm chuông"), () => {
      room.tieIdx += 1;
      tieAsk(room);
    });
  }

  function tieWinner(room: Room, winner: string) {
    room.step = "tie-answer";
    startTimer(room, R.tiebreak.answerMs, () => tieResult(room, winner, false));
    broadcast(room);
  }

  function tieResult(room: Room, winner: string, correct: boolean) {
    const q = room.question!;
    if (room.step !== "tie-answer") return;
    clearTimer(room);
    log(room, { type: "answer", playerId: winner, correct });
    if (correct) {
      room.tieWinnerId = winner;
      record(room, { content: q.content, category: q.category, type: q.type, answer: q.answer, explanation: q.explanation, trivia: q.trivia, ownerId: null, correctPlayerIds: [winner] });
      return reveal(
        room,
        { answer: q.answer, explanation: q.explanation, trivia: q.trivia, correctPlayerIds: [winner], awards: [], note: `${nameOf(room, winner)} thắng câu hỏi phụ` },
        () => finish(room),
      );
    }
    room.players.get(winner)!.lockedOut = true;
    const more = connected(room).filter((p) => room.tieIds.includes(p.id) && !p.lockedOut);
    if (more.length) {
      clearBuzz(room);
      room.step = "tie";
      startTimer(room, R.tiebreak.windowMs, () => tieNobody(room));
      return broadcast(room);
    }
    tieNobody(room);
  }

  // ------------------------------------------------------------ kết thúc
  function finish(room: Room) {
    clearTimer(room);
    clearBuzz(room);
    room.step = "finished";
    room.question = null;
    room.activeId = null;
    const list = [...room.players.values()];
    const ranked = [...list].sort((a, b) => {
      const sa = a.score + (a.id === room.tieWinnerId ? 0.5 : 0);
      const sb = b.score + (b.id === room.tieWinnerId ? 0.5 : 0);
      return sb - sa || a.seat - b.seat;
    });
    const delta = computeElo(list.map((p) => ({ id: p.id, rating: p.elo, score: p.score + (p.id === room.tieWinnerId ? 0.5 : 0) })));
    const top = ranked[0];
    const unique = top && list.filter((p) => p.score === top.score).length === 1;
    room.summary = {
      id: newId(),
      code: room.code,
      matchNo: room.matchNo,
      finishedAt: now(),
      players: ranked.map((p) => ({ id: p.id, name: p.name, score: p.score, eloBefore: p.elo, eloAfter: p.elo + (delta[p.id] ?? 0) })),
      winnerId: room.tieWinnerId ?? (unique ? top.id : null),
      timeline: room.timeline,
      questions: room.results,
      events: room.events,
      source: room.source,
    };
    for (const p of list) p.elo += delta[p.id] ?? 0;
    broadcast(room);
    deps.onFinish?.(room.summary, connected(room).length > 0);
  }

  // ------------------------------------------------------------ API công khai
  function newPlayer(room: Room, name: string, elo: unknown): P {
    const e = typeof elo === "number" && Number.isFinite(elo) ? Math.min(2400, Math.max(600, Math.round(elo))) : 1000;
    const p: P = {
      id: newId(), name, seat: room.players.size, elo: e, score: 0, connected: false, rtt: [],
      lockedOut: false, answeredAt: null, answerCorrect: false, cnvLocked: false,
    };
    room.players.set(p.id, p);
    return p;
  }

  function get(code: string): Room | undefined {
    return rooms.get((code ?? "").trim().toUpperCase());
  }

  return {
    async createRoom(p: { name: string; useAI: boolean; elo?: number }): Promise<Ack<{ code: string; playerId: string }>> {
      const name = cleanName(p?.name);
      if (!name) return { ok: false, error: "Vui lòng nhập tên." };
      let code = "";
      do {
        code = Array.from({ length: 5 }, () => CODE_ALPHABET[randInt(CODE_ALPHABET.length)]).join("");
      } while (rooms.has(code));
      const room: Room = {
        code, hostId: "", step: "lobby", players: new Map(), order: [], plan: null, useAI: !!p.useAI, source: "sample", matchNo: 1,
        roundIdx: 0, turn: 0, qi: 0, question: null, star: false, deadline: null, timer: null, next: null, intro: null, activeId: null,
        pack: null, vdOrder: [], vdAwards: [], pending: [], buzzWindow: null, buzzWinnerId: null, buzzRanking: [], cnv: null,
        reveal: null, lastAnswer: null, tieIds: [], tieIdx: 0, tieWinnerId: null, events: [], timeline: [], results: [], summary: null,
        startedAt: now(), lastActive: now(), notice: null, givens: [],
      };
      const player = newPlayer(room, name, p.elo);
      room.hostId = player.id;
      rooms.set(code, room);
      return { ok: true, code, playerId: player.id };
    },

    joinRoom(p: { code: string; name: string; playerId?: string; elo?: number }): Ack<{ code: string; playerId: string }> {
      const room = get(p?.code);
      if (!room) return { ok: false, error: "Không tìm thấy phòng." };
      if (p.playerId && room.players.has(p.playerId)) return { ok: true, code: room.code, playerId: p.playerId };
      const name = cleanName(p?.name);
      if (!name) return { ok: false, error: "Vui lòng nhập tên." };
      if (room.step !== "lobby" || room.plan) return { ok: false, error: "Trận đấu đã bắt đầu." };
      if (room.players.size >= MAX_PLAYERS) return { ok: false, error: "Phòng đã đủ 4 thí sinh." };
      if ([...room.players.values()].some((x) => x.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: "Tên này đã có trong phòng." };
      const player = newPlayer(room, name, p.elo);
      broadcast(room);
      return { ok: true, code: room.code, playerId: player.id };
    },

    /** Gọi khi socket gắn vào người chơi (hoặc rớt). */
    setConnected(code: string, playerId: string, isConnected: boolean) {
      const room = get(code);
      const p = room?.players.get(playerId);
      if (!room || !p) return;
      p.connected = isConnected;
      if (!isConnected) {
        if (room.hostId === playerId) {
          const nh = connected(room)[0];
          if (nh) room.hostId = nh.id;
        }
        const step = room.step;
        if (step === "kd-solo" && room.activeId === playerId) return endSoloTurn(room);
        if (step === "vd-pick" && room.activeId === playerId) return vdSetPack(room, Array(R.veDich.perPack).fill(R.veDich.values[0]), null);
        if (step === "vd-answer" && room.activeId === playerId) return vdOwnerFail(room);
        if (step === "kd-general-answer" && room.buzzWinnerId === playerId) return kdGeneralResult(room, playerId, false);
        if (step === "vd-steal-answer" && room.buzzWinnerId === playerId) return vdStealResult(room, playerId, false);
        if (step === "tie-answer" && room.buzzWinnerId === playerId) return tieResult(room, playerId, false);
        if (step === "tt") {
          const c = connected(room);
          if (c.length && c.every((x) => x.answeredAt !== null)) return ttResolve(room);
        }
        if (step === "cnv-row") {
          const c = cnvActive(room);
          if (c.length && c.every((x) => x.answeredAt !== null)) return cnvResolveRow(room);
        }
      }
      broadcast(room);
    },

    recordRtt(code: string, playerId: string, ms: number) {
      const p = get(code)?.players.get(playerId);
      if (!p || !(ms >= 0 && ms < 2000)) return;
      p.rtt.push(ms);
      if (p.rtt.length > 5) p.rtt.shift();
    },

    getState(code: string): RoomState | null {
      const room = get(code);
      return room ? snapshot(room) : null;
    },

    async start(code: string, playerId: string) {
      const room = get(code);
      if (!room || room.hostId !== playerId || room.step !== "lobby") return;
      room.order = [...room.players.values()].sort((a, b) => a.seat - b.seat).map((p) => p.id);
      room.notice = null;
      if (!room.plan) {
        room.step = "preparing";
        broadcast(room);
        try {
          room.plan = await deps.makePlan({ seed: newId(), useAI: room.useAI, playerCount: room.order.length });
          room.source = room.plan.source;
        } catch (err) {
          console.error("[engine] makePlan lỗi:", err);
          room.step = "lobby";
          room.notice = "Không tạo được đề, thử lại nhé.";
          broadcast(room);
          return;
        }
      }
      room.startedAt = now();
      room.roundIdx = -1 as number;
      startRound(room, 0);
    },

    skip(code: string, playerId: string) {
      const room = get(code);
      if (!room || room.hostId !== playerId) return;
      if (room.step === "intro" || room.step === "reveal") {
        clearTimer(room);
        runNext(room);
      }
    },

    rematch(code: string, playerId: string) {
      const room = get(code);
      if (!room || room.hostId !== playerId || room.step !== "finished") return;
      clearTimer(room);
      for (const p of room.players.values()) {
        p.score = 0;
        p.lockedOut = false;
        p.answeredAt = null;
        p.answerCorrect = false;
        p.cnvLocked = false;
      }
      room.matchNo += 1;
      room.step = "lobby";
      room.roundIdx = 0;
      room.cnv = null;
      room.pack = null;
      room.summary = null;
      room.reveal = null;
      room.lastAnswer = null;
      room.events = [];
      room.timeline = [];
      room.results = [];
      room.tieWinnerId = null;
      room.givens = [];
      room.notice = "Ván mới: giữ nguyên bộ câu hỏi cũ.";
      broadcast(room);
    },

    submitAnswer(code: string, playerId: string, text: string) {
      const room = get(code);
      const p = room?.players.get(playerId);
      if (!room || !p || typeof text !== "string") return;
      const t = text.slice(0, 200);
      const q = room.question;
      const give = () => room.givens.push({ playerId, text: t });
      switch (room.step) {
        case "kd-solo":
          if (room.activeId === playerId && q) { give(); kdSoloResult(room, isCorrect(t, q.answer, q.acceptedAnswers)); }
          return;
        case "kd-general-answer":
          if (room.buzzWinnerId === playerId && q) { give(); kdGeneralResult(room, playerId, isCorrect(t, q.answer, q.acceptedAnswers)); }
          return;
        case "cnv-row": {
          const c = room.cnv!;
          if (p.cnvLocked || p.answeredAt !== null) return;
          const row = c.puzzle.rows[room.qi];
          give();
          p.answeredAt = hr();
          p.answerCorrect = isCorrect(t, row.answer, row.acceptedAnswers);
          const act = cnvActive(room);
          if (act.length && act.every((x) => x.answeredAt !== null)) cnvResolveRow(room);
          else broadcast(room);
          return;
        }
        case "tt": {
          if (!q || p.answeredAt !== null) return;
          give();
          p.answeredAt = hr() - Math.min((medianRtt(p) ?? 0) / 2, R.maxRttCompMs);
          p.answerCorrect = isCorrect(t, q.answer, q.acceptedAnswers);
          const c = connected(room);
          if (c.length && c.every((x) => x.answeredAt !== null)) ttResolve(room);
          else broadcast(room);
          return;
        }
        case "vd-answer":
          if (room.activeId === playerId && q) {
            give();
            if (isCorrect(t, q.answer, q.acceptedAnswers)) vdOwnerCorrect(room);
            else vdOwnerFail(room);
          }
          return;
        case "vd-steal-answer":
          if (room.buzzWinnerId === playerId && q) { give(); vdStealResult(room, playerId, isCorrect(t, q.answer, q.acceptedAnswers)); }
          return;
        case "tie-answer":
          if (room.buzzWinnerId === playerId && q) { give(); tieResult(room, playerId, isCorrect(t, q.answer, q.acceptedAnswers)); }
          return;
        default:
          return;
      }
    },

    /** Người chơi bỏ qua câu (Khởi động riêng) hoặc bỏ cuộc lượt trả lời hiện tại. */
    skipAnswer(code: string, playerId: string) {
      const room = get(code);
      if (!room) return;
      if (room.step === "kd-solo" && room.activeId === playerId) kdSoloResult(room, false);
      else if (room.step === "vd-answer" && room.activeId === playerId) vdOwnerFail(room);
    },

    press(code: string, playerId: string) {
      const room = get(code);
      const p = room?.players.get(playerId);
      if (!room || !p) return;
      if (room.step === "kd-general") press(room, p, !p.lockedOut && p.connected, (id) => kdGeneralWinner(room, id));
      else if (room.step === "vd-steal") press(room, p, p.id !== room.activeId && !p.lockedOut && p.connected, (id) => vdStealWinner(room, id));
      else if (room.step === "tie") press(room, p, room.tieIds.includes(p.id) && !p.lockedOut && p.connected, (id) => tieWinner(room, id));
    },

    pick(code: string, playerId: string, values: number[], star: number | null) {
      const room = get(code);
      if (!room || room.step !== "vd-pick" || room.activeId !== playerId) return;
      if (!Array.isArray(values) || values.length !== R.veDich.perPack || !values.every((v) => R.veDich.values.includes(v))) return;
      if (star !== null && !(Number.isInteger(star) && star >= 0 && star < R.veDich.perPack)) return;
      vdSetPack(room, values, star);
    },

    cnvGuess(code: string, playerId: string, text: string) {
      const room = get(code);
      const p = room?.players.get(playerId);
      if (!room || !p || typeof text !== "string") return;
      cnvGuess(room, p, text.slice(0, 80));
    },

    /** Chỉ dành cho test và bot trong bản demo: lộ đáp án của bước hiện tại. */
    debugPeek(code: string): { step: string; answer?: string; keyword?: string; owner?: string | null; star?: boolean } | null {
      const room = get(code);
      if (!room) return null;
      let answer = room.question?.answer;
      if (room.step === "cnv-row" && room.cnv) answer = room.cnv.puzzle.rows[room.qi].answer;
      return { step: room.step, answer, keyword: room.cnv?.puzzle.keyword, owner: room.activeId, star: room.star };
    },

    sweep(maxIdleMs: number) {
      for (const [code, room] of rooms) {
        if (!connected(room).length && now() - room.lastActive > maxIdleMs) {
          clearTimer(room);
          clearBuzz(room);
          rooms.delete(code);
        }
      }
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;
