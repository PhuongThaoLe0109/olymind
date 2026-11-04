// Mô phỏng một người chơi (bot) đi hết 4 vòng, rồi một lượt chỉ luyện vòng Tăng tốc.
import { createEngine, type Hub } from "../src/lib/engine";
import { RULES_WEB, scaleRules } from "../src/lib/rules";
import { buildOfflinePlan } from "../src/lib/planner";
import { freshSeed } from "../src/lib/rng";
import type { MatchSummary, RoomState } from "../src/lib/types";

const fail = (m: string): never => { console.error("FAIL:", m); process.exit(1); };

async function play(rounds: number[] | undefined, label: string) {
  let summary: MatchSummary | null = null;
  const subs: ((s: RoomState) => void)[] = [];
  const hub: Hub = { emit: (_c, ev, p) => { if (ev === "room:state") subs.forEach((f) => f(p as RoomState)); } };
  const eng = createEngine({ hub, makePlan: async () => buildOfflinePlan(freshSeed()), rules: scaleRules(RULES_WEB, 0.05), onFinish: (s) => (summary = s) });
  const c = await eng.createRoom({ name: "Bot", useAI: false });
  if (!c.ok) return fail("create");
  const code = c.code, me = c.playerId;
  eng.setConnected(code, me, true);
  const seen = new Set<string>();
  const rounds_seen = new Set<string>();
  subs.push((s) => {
    if (s.round) rounds_seen.add(s.round);
    if (s.question && (s as any).question.answer !== undefined) fail("lộ đáp án trong trạng thái công khai");
    const k = `${s.phase}|${s.stage}|${s.roundIndex}|${s.question?.id}|${s.activePlayerId}|${s.deadline}|${s.cnv?.currentRow}|${s.pack?.index}`;
    if (seen.has(k)) return; seen.add(k);
    const pk = eng.debugPeek(code)!;
    const ans = () => (Math.random() < 0.7 ? pk.answer ?? "" : "zzz");
    setTimeout(() => {
      switch (s.stage) {
        case "solo": case "answer": eng.submitAnswer(code, me, ans()); break;
        case "row": case "race": eng.submitAnswer(code, me, ans()); break;
        case "center": eng.cnvGuess(code, me, pk.keyword ?? ""); break;
      }
      if (s.phase === "pick") eng.pick(code, me, [20, 30, 20], 1);
    }, 3);
  });
  await eng.start(code, me, rounds ? { rounds } : undefined);
  const t0 = Date.now();
  while (!summary && Date.now() - t0 < 60000) await new Promise((r) => setTimeout(r, 50));
  if (!summary) return fail(`${label}: không kết thúc, ${JSON.stringify(eng.debugPeek(code))}`);
  const s = summary as MatchSummary;
  console.log(`OK ${label}: ${Date.now() - t0} ms, điểm ${s.players[0].score}, vòng: ${[...rounds_seen].join(",")}, câu: ${s.questions.length}, sự kiện: ${s.events.length}`);
  if (s.players[0].score < 0) fail("điểm âm");
  if (s.players[0].eloAfter !== s.players[0].eloBefore) fail("Elo đổi khi chơi một mình");
  return s;
}

(async () => {
  const full = await play(undefined, "đủ 4 vòng");
  if (!full || full.questions.length < 28) fail("thiếu câu ở bản đủ 4 vòng");
  await play([2], "chỉ Tăng tốc");
  await play([1, 3], "Vượt chướng ngại vật + Về đích");
  process.exit(0);
})();
