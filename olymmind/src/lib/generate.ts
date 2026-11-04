// Sinh đề mỗi lần chơi (chỉ chạy phía server).
//  1) Chọn "ô" câu hỏi theo khung chương trình: phân môn x chủ đề x lớp x độ khó, ưu tiên chủ đề người chơi ít gặp.
//  2) Nhờ Claude ra đúng các ô đó (kèm phong cách đề Olympia và danh sách đáp án cần tránh).
//  3) Một lượt gọi thứ hai cho Claude giải độc lập từng câu; chỉ câu nào cho cùng đáp án mới được gắn "đã đối chiếu".
//  4) Loại câu trùng với lịch sử, rồi planner ghép cùng câu từ kho dự phòng và bộ sinh thuật toán (Tăng tốc luôn do thuật toán sinh,
//     vì đáp án tính ra được nên đúng chắc chắn).
import { BANK } from "./bank";
import { CURRICULUM, LEVEL_TEXT, STYLE_GUIDE, gradeBandText, type Topic } from "./curriculum";
import { compact, isCorrect, normalize } from "./judge";
import { assemblePlan, levelPlan, makeCtx, pickShorts, toQuestion, type Cand, type Ctx, type SeenInfo } from "./planner";
import { pick, shuffle, int } from "./rng";
import { CATEGORY_LABEL, CATEGORY_ORDER, type CategoryKey, type CnvPuzzle, type MatchPlan, type Question, type RoundKey } from "./types";

export type Ask = (system: string, user: string, maxTokens: number) => Promise<string>;

/** Hàm gọi Claude, hoặc null nếu chưa cấu hình GEMINI_API_KEY / ANTHROPIC_API_KEY. */
export function defaultAsk(): Ask | null {
  const gKey = process.env.GEMINI_API_KEY;
  const aKey = process.env.ANTHROPIC_API_KEY;
  if (gKey && process.env.AI_PROVIDER !== "anthropic") {
    return async (system, user, maxTokens) => {
      const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
      const budget = Number(process.env.AI_TIMEOUT_MS) || 60_000;
      const deadline = Date.now() + budget - 5_000;
      // Google đôi lúc báo 503/429 (quá tải) hoặc treo kết nối: mỗi lần gọi có timeout riêng,
      // thử lại nhiều lần với thời gian chờ tăng dần.
      let res: Response | null = null;
      let lastErr = "";
      for (let attempt = 0; attempt < 10 && Date.now() < deadline; attempt++) {
        const left = deadline - Date.now();
        try {
          res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-goog-api-key": gKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ role: "user", parts: [{ text: user }] }],
              generationConfig: { maxOutputTokens: maxTokens, temperature: 0.9 },
            }),
            signal: AbortSignal.timeout(Math.max(5_000, Math.min(55_000, left))),
          });
        } catch (e) {
          res = null;
          lastErr = `${model}: ${e instanceof Error ? e.message : e}`;
          console.error(`[gemini] lần ${attempt + 1} lỗi mạng/timeout (${lastErr})`);
          await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1500));
          continue;
        }
        if (res.ok || ![429, 500, 503].includes(res.status)) break;
        lastErr = `${model} ${res.status}`;
        const body = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 400);
        console.error(`[gemini] lần ${attempt + 1}: ${lastErr} ${body}`);
        await new Promise((r) => setTimeout(r, Math.min(20_000, 4000 * (attempt + 1)) + Math.random() * 2500));
      }
      if (!res) throw new Error(`Gemini không phản hồi (${lastErr || "hết thời gian"})`);
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${((await res.text()) ?? "").slice(0, 200)}`);
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return (data.candidates?.[0]?.content?.parts ?? []).map((x) => x.text ?? "").join("").trim();
    };
  }
  if (!aKey) return null;
  return async (system, user, maxTokens) => {
    const mod = await import("@anthropic-ai/sdk");
    const Anthropic = (mod as any).default ?? (mod as any).Anthropic;
    const client = new Anthropic({ apiKey: aKey });
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    return (res.content as { type: string; text?: string }[]).map((b) => (b.type === "text" ? b.text ?? "" : "")).join("").trim();
  };
}

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("AI quá thời gian")), ms))]);

function extractJson(text: string, open: "[" | "{"): unknown {
  const close = open === "[" ? "]" : "}";
  const a = text.indexOf(open);
  const b = text.lastIndexOf(close);
  if (a < 0 || b <= a) throw new Error("AI không trả về JSON hợp lệ");
  return JSON.parse(text.slice(a, b + 1));
}

const str = (v: unknown, min = 1, max = 400): string | null => (typeof v === "string" && v.trim().length >= min && v.length <= max ? v.trim() : null);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length < 80).slice(0, 8) : []);

// ------------------------------------------------------------------ chọn ô câu hỏi
export interface Slot {
  category: CategoryKey;
  topic: Topic;
  grade: number;
  level: number;
}

export function makeSlots(ctx: Ctx, levels: number[]): Slot[] {
  const cats: CategoryKey[] = [];
  while (cats.length < levels.length) cats.push(...shuffle(CATEGORY_ORDER, ctx.rnd));
  return levels.map((level, i) => {
    const category = cats[i];
    const list = CURRICULUM[category] ?? [];
    // trọng số: chủ đề ít gặp được ưu tiên; chủ đề ngoài SGK vẫn có phần vì Olympia hay hỏi
    const weights = list.map((t) => 1 / (1 + (ctx.coverage[t.id] ?? 0)));
    let r = ctx.rnd() * weights.reduce((a, b) => a + b, 0);
    let k = 0;
    for (; k < list.length - 1; k++) {
      r -= weights[k];
      if (r <= 0) break;
    }
    const topic = list[k];
    const [g0, g1] = topic.grades;
    // thí sinh 17-18 tuổi: đa số câu ngoài SGK, phần trong SGK chỉ lấy ở mức THPT và hỏi sâu
    const hi = Math.max(10, g1);
    const grade = g1 === 0 || ctx.rnd() < 0.55 ? 0 : Math.max(10, g0) + Math.floor(ctx.rnd() * (hi - Math.max(10, g0) + 1));
    return { category, topic, grade, level };
  });
}

const slotLine = (s: Slot, i: number) =>
  `#${i + 1} | phân môn: ${CATEGORY_LABEL[s.category]} | chủ đề: ${s.topic.label} (gợi ý hướng hỏi: ${s.topic.hint}) | ${gradeBandText(s.grade)} | độ khó ${s.level}/5 = ${LEVEL_TEXT[s.level]}`;

const SYSTEM =
  "Bạn là biên tập viên ra đề cho chương trình 'Đường lên đỉnh Olympia', thí sinh là học sinh lớp 12 (17-18 tuổi), kiến thức hỏi phần lớn nằm ngoài sách giáo khoa. " +
  "NGUYÊN TẮC BẮT BUỘC: chỉ đưa ra câu hỏi mà bạn chắc chắn gần như tuyệt đối về đáp án; không chắc thì đổi sang dữ kiện khác. " +
  "Tuyệt đối không bịa số liệu, năm tháng, tên riêng. Mỗi câu chỉ có một đáp án rõ ràng, không đổi theo thời gian. " +
  "Nội dung tiếng Việt chuẩn mực (câu hỏi phân môn Tiếng Anh viết bằng tiếng Anh). Câu hỏi không được chứa sẵn đáp án. " +
  "Cách ra đề như người làm chương trình: chọn MỘT dữ kiện hẹp, có thật, kiểm chứng được; viết câu hỏi 1-2 vế, người giỏi trả lời được trong 10-20 giây; đáp án ngắn, duy nhất; tránh câu mơ hồ, câu \"kể tên bất kỳ\", câu phụ thuộc thời điểm. Với phân môn tự nhiên, ưu tiên câu có một bước suy luận. Câu ngoài sách giáo khoa phải là kiến thức phổ thông của người đọc nhiều (sách khoa học phổ thông, lịch sử, văn hóa, địa lý, nghệ thuật). " +
  "Chỉ trả về JSON hợp lệ, không kèm lời dẫn hay markdown.";

/** Chọn vài câu mẫu cùng chủ đề (rồi cùng phân môn) trong kho để Gemini/Claude bắt đúng giọng và độ khó. */
function exemplarsFor(slots: Slot[]): string {
  const used = new Set<string>();
  const lines: string[] = [];
  for (const s of slots) {
    const pool = BANK.filter((b) => b.level >= 3 && !used.has(b.content));
    const same = pool.filter((b) => b.topic === s.topic.id);
    const cat = pool.filter((b) => b.category === s.category && b.topic !== s.topic.id);
    const pick = [...same.sort(() => Math.random() - 0.5), ...cat.sort(() => Math.random() - 0.5)].slice(0, 2);
    for (const b of pick) {
      used.add(b.content);
      lines.push(`- [${CATEGORY_LABEL[b.category]} · khó ${b.level}/5] ${b.content} => ${b.answer}`);
    }
  }
  return lines.length
    ? `CÂU MẪU của biên tập viên (chỉ để học giọng văn, độ khó, độ hẹp của dữ kiện; TUYỆT ĐỐI không lặp lại nội dung hay đáp án của chúng):\n${lines.join("\n")}\n`
    : "";
}

async function askShorts(ask: Ask, slots: Slot[], avoid: string[], offset: number): Promise<Cand[]> {
  const text = await withTimeout(
    ask(
      SYSTEM,
      `Hãy ra ${slots.length} câu hỏi, MỖI MỤC dưới đây đúng một câu, bám sát phân môn, chủ đề, khối lớp và độ khó được giao:\n` +
        slots.map((s, i) => slotLine(s, i)).join("\n") +
        `\n\n${STYLE_GUIDE}\n${exemplarsFor(slots)}` +
        (avoid.length ? `Không dùng các đáp án sau vì người chơi vừa gặp: ${avoid.join("; ")}.\n` : "") +
        `Với mục độ khó 4-5: hỏi dữ kiện cụ thể, hẹp, hoặc cần suy luận một bước, không hỏi điều ai cũng biết.\n` +
        `Trả về MỘT mảng JSON gồm đúng ${slots.length} phần tử theo thứ tự các mục: ` +
        `[{"i": 1, "content": "câu hỏi", "answer": "đáp án chuẩn (1-4 từ hoặc một số)", "acceptedAnswers": ["cách viết khác"], "explanation": "giải thích 1-2 câu", "trivia": "thông tin mở rộng ngắn"}]`,
      4096,
    ),
    (Number(process.env.AI_TIMEOUT_MS) || 60_000),
  );
  const arr = extractJson(text, "[") as unknown[];
  const out: Cand[] = [];
  for (const raw of arr) {
    const o = raw as Record<string, unknown>;
    const idx = typeof o.i === "number" ? o.i - 1 : -1;
    const slot = slots[idx];
    const content = str(o.content, 8), answer = str(o.answer, 1, 80), explanation = str(o.explanation, 4, 600);
    if (!slot || !content || !answer || !explanation) continue;
    if (answer.split(/\s+/).length > 7) continue;
    // loại câu để lộ đáp án trong đề
    const ca = compact(answer);
    if (ca.length >= 4 && compact(content).includes(ca)) continue;
    out.push({
      category: slot.category, topic: slot.topic.id, grade: slot.grade, level: slot.level, content, answer,
      acceptedAnswers: strList(o.acceptedAnswers), explanation, trivia: str(o.trivia, 0, 400) ?? "", source: "ai",
    });
    void offset;
  }
  return out;
}

/** Cho Claude giải độc lập (không thấy đáp án). Trả về tập chỉ số câu khớp đáp án. */
async function crossCheck(ask: Ask, items: { content: string; answer: string; acceptedAnswers: string[] }[]): Promise<Set<number> | null> {
  if (!items.length) return new Set();
  try {
    const text = await withTimeout(
      ask(
        "Bạn là thí sinh rất giỏi, trả lời từng câu hỏi ngắn gọn, chính xác. Chỉ trả về JSON hợp lệ.",
        `Trả lời từng câu hỏi sau (đáp án 1-4 từ hoặc một số). Nếu bạn không chắc chắn trên 90% thì đặt "sure": false.\n` +
          JSON.stringify(items.map((it, i) => ({ i, q: it.content }))) +
          `\nTrả về mảng JSON: [{"i": 0, "answer": "...", "sure": true}]`,
        4096,
      ),
      (Number(process.env.AI_TIMEOUT_MS) || 60_000),
    );
    const arr = extractJson(text, "[") as { i?: number; answer?: unknown; sure?: unknown }[];
    const ok = new Set<number>();
    for (const r of arr) {
      if (typeof r.i !== "number" || typeof r.answer !== "string" || r.sure === false) continue;
      const it = items[r.i];
      if (!it) continue;
      if (isCorrect(r.answer, it.answer, it.acceptedAnswers) || isCorrect(it.answer, r.answer)) ok.add(r.i);
    }
    return ok;
  } catch (err) {
    console.error("[generate] đối chiếu lỗi:", err instanceof Error ? err.message : err);
    return null; // không đối chiếu được: giữ câu nhưng không gắn dấu
  }
}

/** Sinh `levels.length` + dư vài câu, đối chiếu, loại trùng; trả về các ứng viên AI. */
export async function aiShortCandidates(ask: Ask, ctx: Ctx, levels: number[]): Promise<Cand[]> {
  const extraLevels = [3, 4, 4, 5, 3, 4, 5].slice(0, Math.ceil(levels.length / 4));
  const slots = makeSlots(ctx, [...levels, ...extraLevels]);
  const avoid = [...ctx.recentAnswers].slice(-60);
  const chunks: Slot[][] = [];
  for (let i = 0; i < slots.length; i += 7) chunks.push(slots.slice(i, i + 7));
  const results: Cand[][] = [];
  // chỉ chạy tối đa 2 yêu cầu song song để Gemini ít bị quá tải
  for (let i = 0; i < chunks.length; i += 2) {
    results.push(...(await Promise.all(chunks.slice(i, i + 2).map((c, k) => askShorts(ask, c, avoid, (i + k) * 7).catch((err) => {
      console.error("[generate] AI ra đề lỗi:", err instanceof Error ? err.message : err);
      return [] as Cand[];
    })))));
  }
  let cands = results.flat();
  // loại trùng lịch sử và trùng nhau
  const seenNow = new Set<string>();
  const { fingerprint } = await import("./judge");
  cands = cands.filter((c) => {
    const fp = fingerprint(c.content, c.answer);
    if (ctx.seen.has(fp) || seenNow.has(fp) || normalize(c.content).length < 8) return false;
    seenNow.add(fp);
    return true;
  });
  const checked = await crossCheck(ask, cands);
  if (checked) {
    cands = cands.filter((_, i) => checked.has(i)).map((c) => ({ ...c, crosschecked: true }));
    // chỉ giữ câu đã đối chiếu; thiếu thì kho dự phòng bù vào
  }
  return cands;
}

// ------------------------------------------------------------------ Vượt chướng ngại vật bằng AI
async function aiCnv(ask: Ask, ctx: Ctx): Promise<CnvPuzzle | null> {
  const cats = shuffle(CATEGORY_ORDER, ctx.rnd).slice(0, 4);
  const hint = cats.map((c) => CATEGORY_LABEL[c]).join(", ");
  const text = await withTimeout(
    ask(
      SYSTEM,
      `Thiết kế 1 ô chữ cho vòng Vượt chướng ngại vật. Từ khóa (5-12 chữ cái, có thể gồm 2 từ, là cụm từ quen thuộc, nằm ở một chủ đề thú vị, tránh các từ khóa: ${["Biển Đông", "Olympia", "Thăng Long", "Quang hợp", "Hoàng Sa", "Trường Sa", "Nguyễn Trãi", "Vịnh Hạ Long"].join(", ")}). ` +
        `Có 4 hàng ngang; mỗi hàng là một câu hỏi có đáp án ngắn (1-4 từ), lấy từ các phân môn khác nhau (gợi ý: ${hint}), KHÔNG nhất thiết liên quan tới từ khóa. ` +
        `"reveals" là danh sách vị trí chữ cái của từ khóa (đếm từ 0, bỏ qua dấu cách) được mở khi hàng đó được giải; các hàng không mở trùng nhau và không mở hết mọi chữ. ` +
        `Thêm "centerClue": gợi ý ở ô trung tâm mô tả từ khóa, không nhắc thẳng từ khóa.\n${STYLE_GUIDE}\n` +
        `Trả về MỘT đối tượng JSON: {"keyword","centerClue","explanation","rows":[{"category":"toan|ly|hoa|sinh|su|dia|van|anh|gdcd|tin|nghe-thuat|the-thao|chung","clue","answer","acceptedAnswers":[],"reveals":[số],"explanation"} x4]}`,
      3000,
    ),
    (Number(process.env.AI_TIMEOUT_MS) || 60_000),
  );
  const v = extractJson(text, "{") as Record<string, any>;
  const keyword = str(v.keyword, 4, 40), centerClue = str(v.centerClue, 8), explanation = str(v.explanation, 4);
  if (!keyword || !centerClue || !explanation || !Array.isArray(v.rows) || v.rows.length !== 4) return null;
  const L = Array.from(keyword.replace(/\s+/g, "")).length;
  if (L < 5 || L > 12) return null;
  const seen = new Set<number>();
  const rows: CnvPuzzle["rows"] = [];
  for (const r of v.rows) {
    const clue = str(r.clue, 8), answer = str(r.answer, 1, 60), exp = str(r.explanation, 4);
    if (!clue || !answer || !exp || !Array.isArray(r.reveals)) return null;
    const reveals = r.reveals.filter((i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < L);
    for (const i of reveals) {
      if (seen.has(i)) return null;
      seen.add(i);
    }
    const category = (CATEGORY_ORDER as string[]).includes(r.category) ? (r.category as CategoryKey) : "chung";
    rows.push({ category, clue, answer, acceptedAnswers: strList(r.acceptedAnswers), reveals, explanation: exp });
  }
  if (seen.size >= L) return null;
  const checked = await crossCheck(ask, rows.map((r) => ({ content: r.clue, answer: r.answer, acceptedAnswers: r.acceptedAnswers })));
  if (!checked || checked.size < 4) return null; // ô chữ chỉ dùng khi cả 4 hàng đã được đối chiếu
  return { keyword, rows, center: { clue: centerClue }, explanation, source: "ai" };
}

// ------------------------------------------------------------------ bộ sinh
export async function generatePlan(opts: { seed: string; useAI: boolean; seen: SeenInfo; shift?: number; ask?: Ask | null }): Promise<MatchPlan> {
  const ctx = makeCtx(opts.seed, opts.seen);
  const shift = opts.shift ?? 0;
  const ask = opts.useAI ? (opts.ask === undefined ? defaultAsk() : opts.ask) : null;
  let notice: string | null = null;
  const extras: { shorts: Cand[]; cnv: CnvPuzzle[] } = { shorts: [], cnv: [] };
  if (opts.useAI && !ask) notice = "Chưa cấu hình GEMINI_API_KEY hoặc ANTHROPIC_API_KEY nên đề được ghép từ kho có sẵn và bộ sinh thuật toán.";
  if (ask) {
    const L = levelPlan(shift);
    const [shorts, puzzle] = await Promise.all([
      aiShortCandidates(ask, ctx, [...L.solo, ...L.general, ...L.veDich]).catch((err) => {
        console.error("[generate] AI lỗi:", err instanceof Error ? err.message : err);
        return [] as Cand[];
      }),
      aiCnv(ask, ctx).catch((err) => {
        console.error("[generate] AI ô chữ lỗi:", err instanceof Error ? err.message : err);
        return null;
      }),
    ]);
    extras.shorts = shorts;
    if (puzzle) extras.cnv.push(puzzle);
    if (!shorts.length) notice = "Không gọi được AI nên đề được ghép từ kho có sẵn và bộ sinh thuật toán.";
  }
  const plan = assemblePlan(ctx, extras, shift);
  if (notice && !plan.notice) plan.notice = notice;
  return plan;
}

/** Dùng cho chế độ luyện nhanh 60/90 giây (/api/generate). */
export async function generateQuestions(opts: {
  round: RoundKey;
  count: number;
  seed: string;
  useAI: boolean;
  seen: SeenInfo;
  ask?: Ask | null;
}): Promise<{ questions: Question[]; source: "ai" | "sample" }> {
  const ctx = makeCtx(opts.seed, opts.seen);
  const ask = opts.useAI ? (opts.ask === undefined ? defaultAsk() : opts.ask) : null;
  const levels = Array.from({ length: opts.count }, (_, i) => 2 + Math.min(3, Math.floor((i / opts.count) * 4)));
  let extra: Cand[] = [];
  if (ask) extra = await aiShortCandidates(ask, ctx, levels).catch(() => []);
  const picked = pickShorts(ctx, levels, extra);
  const questions = picked.map((c) => toQuestion(c, opts.round, opts.round === "ve-dich" ? 20 : 10, opts.round === "ve-dich" ? 20 : 10));
  return { questions, source: picked.some((c) => c.source === "ai") ? "ai" : "sample" };
}

export { pick, int };
