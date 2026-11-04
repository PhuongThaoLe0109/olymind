// Kiểu dùng chung cho client và server (không import code runtime vào đây).

export type RoundKey = "khoi-dong" | "vuot-chuong-ngai-vat" | "tang-toc" | "ve-dich";
export const ROUND_ORDER: RoundKey[] = ["khoi-dong", "vuot-chuong-ngai-vat", "tang-toc", "ve-dich"];

export const ROUND_LABEL: Record<RoundKey, string> = {
  "khoi-dong": "Khởi động",
  "vuot-chuong-ngai-vat": "Vượt chướng ngại vật",
  "tang-toc": "Tăng tốc",
  "ve-dich": "Về đích",
};

export const ROUND_RULE_TEXT: Record<RoundKey, string> = {
  "khoi-dong": "6 câu riêng, sau đó 12 câu chung. Đúng +10, sai ở phần chung −5.",
  "vuot-chuong-ngai-vat": "Mở dần 4 hàng ngang, đoán từ khóa càng sớm càng nhiều điểm. Đoán sai bị loại.",
  "tang-toc": "4 câu tư duy. Trả lời đúng càng nhanh điểm càng cao: 40, 30, 20, 10.",
  "ve-dich": "Chọn gói 3 câu 20/30 điểm và dùng Ngôi sao hy vọng.",
};

/** Phân môn. "hoa-sinh" là khóa cũ (trước khi tách Hóa và Sinh), chỉ còn để đọc dữ liệu đã lưu. */
export type CategoryKey =
  | "toan" | "ly" | "hoa" | "sinh" | "su" | "dia" | "van" | "anh"
  | "gdcd" | "tin" | "nghe-thuat" | "the-thao" | "chung" | "hoa-sinh";

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  toan: "Toán học",
  ly: "Vật lý",
  hoa: "Hóa học",
  sinh: "Sinh học",
  su: "Lịch sử",
  dia: "Địa lý",
  van: "Ngữ văn",
  anh: "Tiếng Anh",
  gdcd: "GDCD - Pháp luật - Kinh tế",
  tin: "Tin học - Công nghệ",
  "nghe-thuat": "Âm nhạc - Mỹ thuật - Điện ảnh",
  "the-thao": "Thể thao",
  chung: "Hiểu biết chung",
  "hoa-sinh": "Hóa - Sinh (dữ liệu cũ)",
};

/** Các phân môn dùng khi sinh đề (không gồm khóa cũ). */
export const CATEGORY_ORDER: CategoryKey[] = [
  "toan", "ly", "hoa", "sinh", "su", "dia", "van", "anh", "gdcd", "tin", "nghe-thuat", "the-thao", "chung",
];

export type QuestionType = "text" | "image" | "sequence";

export interface Question {
  id: string;
  round: RoundKey;
  category: CategoryKey;
  type: QuestionType;
  content: string;
  /** Ảnh (data URI hoặc URL) cho câu hình ảnh. */
  media?: string;
  /** Các mục A, B, C, D cho câu sắp xếp. Đáp án là chuỗi thứ tự, ví dụ "ABDC". */
  items?: string[];
  answer: string;
  acceptedAnswers: string[];
  explanation: string;
  trivia: string;
  timeLimit: number; // giây (gợi ý hiển thị)
  points: number;
  /** Câu AI sinh luôn là false cho tới khi con người duyệt. */
  verified: boolean;
  source: "ai" | "sample";
  /** Câu AI đã được một lượt AI thứ hai giải độc lập và cho cùng đáp án. */
  crosschecked?: boolean;
  /** Dấu vân tay nội dung + đáp án, dùng để không bao giờ ra lại câu đã gặp. */
  fp?: string;
  /** Lớp 1–12 (kiến thức nằm ở lớp nào trong chương trình, 0 hoặc bỏ trống nếu ngoài chương trình). */
  grade?: number;
  /** Mã chủ đề trong khung chương trình (curriculum.ts). */
  topic?: string;
  /** Độ khó 1 (dễ) đến 5 (rất khó). */
  level?: number;
}

/** Phần câu hỏi được phép gửi cho thí sinh trước khi lộ đáp án. */
export type PublicQuestion = Omit<Question, "answer" | "acceptedAnswers" | "explanation" | "trivia"> & {
  star?: boolean;
};

// ---------------------------------------------------------------- Vượt chướng ngại vật
export interface CnvRow {
  category?: CategoryKey;
  clue: string;
  answer: string;
  acceptedAnswers: string[];
  /** Vị trí các chữ của từ khóa được mở khi hàng này được giải (đếm từ 0, bỏ qua dấu cách). */
  reveals: number[];
  explanation: string;
}

export interface CnvPuzzle {
  /** Hiểu biết chung của cả ô chữ; từng hàng có thể có phân môn riêng. */
  category?: CategoryKey;
  keyword: string; // ví dụ "Biển Đông"
  rows: CnvRow[]; // 4 hàng ngang
  center: { clue: string }; // gợi ý ở ô trung tâm
  imageSvg?: string; // hình ẩn dưới 5 mảnh che
  explanation: string;
  source: "ai" | "sample";
}

export interface PublicCnv {
  wordLengths: number[]; // độ dài từng từ của từ khóa, ví dụ [4, 4]
  cells: (string | null)[]; // chữ đã mở, null nếu chưa
  rows: {
    length: number;
    clue: string | null;
    answer: string | null;
    status: "hidden" | "asked" | "done";
  }[];
  currentRow: number; // -1 nếu chưa bắt đầu; rows.length nghĩa là đang ở ô trung tâm
  centerClue: string | null;
  tilesOpen: number; // số mảnh hình đã mở (0..5)
  imageSvg: string | null;
  solved: boolean;
  keyword: string | null; // chỉ có khi vòng đã kết thúc
}

// ---------------------------------------------------------------- Kế hoạch trận đấu
export interface MatchPlan {
  khoiDongSolo: Question[][]; // theo thứ tự ghế
  khoiDongGeneral: Question[];
  cnv: CnvPuzzle;
  tangToc: Question[];
  veDich: Question[][]; // theo thứ tự ghế
  tiebreak: Question[];
  source: "ai" | "sample";
  /** Ghi chú cho người chơi, ví dụ ngân hàng offline đã hết câu mới. */
  notice?: string | null;
}

// ---------------------------------------------------------------- Trạng thái phòng
export interface PublicPlayer {
  id: string;
  name: string;
  seat: number;
  elo: number;
  score: number;
  connected: boolean;
  lockedOut: boolean; // không được bấm chuông ở câu hiện tại
  answered: boolean; // đã nộp đáp án ở câu hiện tại
  cnvLocked: boolean; // đoán sai từ khóa, bị loại khỏi phần còn lại của vòng
  rtt: number | null; // ms, server đo
}

export type Phase = "lobby" | "preparing" | "intro" | "question" | "pick" | "reveal" | "finished";

export type Stage =
  | "solo"
  | "general"
  | "general-answer"
  | "row"
  | "center"
  | "race"
  | "answer"
  | "steal"
  | "steal-answer"
  | "tiebreak"
  | "tiebreak-answer";

export interface RevealInfo {
  answer: string;
  explanation: string;
  trivia: string;
  correctPlayerIds: string[];
  awards: { playerId: string; delta: number }[];
  note: string | null;
  /** Câu trả lời mỗi người đã nộp ở câu này, để hiện cho cả phòng cùng xem. */
  given?: { playerId: string; text: string }[];
}

export interface BuzzRank {
  playerId: string;
  deltaMs: number; // chênh lệch so với người bấm đầu tiên (đã bù RTT)
}

export interface LastAnswer {
  playerId: string;
  correct: boolean;
  answer: string; // đáp án đúng, để hiện ngay sau mỗi câu Khởi động
  delta: number;
}

export interface PackState {
  playerId: string;
  values: number[];
  star: number | null;
  index: number; // câu thứ mấy trong gói (0..2)
}

export interface RoomState {
  code: string;
  hostId: string;
  phase: Phase;
  stage: Stage | null;
  players: PublicPlayer[];
  round: RoundKey | null;
  roundIndex: number;
  activePlayerId: string | null;
  intro: { title: string; subtitle: string } | null;
  question: PublicQuestion | null;
  questionNumber: number; // thứ tự trong lượt/vòng, bắt đầu từ 1
  questionCount: number;
  pack: PackState | null;
  cnv: PublicCnv | null;
  deadline: number | null; // epoch ms theo đồng hồ SERVER
  serverTime: number;
  buzzWinnerId: string | null;
  buzzRanking: BuzzRank[];
  lastAnswer: LastAnswer | null;
  reveal: RevealInfo | null;
  summary: MatchSummary | null;
  questionsSource: "ai" | "sample";
  notice: string | null;
  matchNo: number;
}

// ---------------------------------------------------------------- Lịch sử, Replay
export interface MatchEvent {
  t: number; // ms kể từ lúc bắt đầu trận
  type: "round" | "turn" | "question" | "answer" | "buzz" | "pick" | "star" | "steal" | "cnv" | "reveal" | "score" | "tiebreak";
  playerId?: string;
  text?: string;
  correct?: boolean;
  delta?: number;
  scores?: Record<string, number>;
}

export interface ScorePoint {
  index: number;
  label: string;
  scores: Record<string, number>;
}

export interface QuestionResult {
  qid?: string;
  fp?: string;
  topic?: string;
  grade?: number;
  level?: number;
  /** Điều người chơi đã gõ (bỏ trống nếu hết giờ hoặc bỏ qua). */
  userAnswer?: string;
  /** Điểm thay đổi nhờ câu này. */
  delta?: number;
  media?: string;
  items?: string[];
  content: string;
  category: CategoryKey;
  round: RoundKey;
  type: QuestionType;
  answer: string;
  explanation: string;
  trivia: string;
  ownerId: string | null;
  correctPlayerIds: string[];
}

export interface MatchSummary {
  id: string;
  code: string;
  matchNo: number;
  finishedAt: number;
  players: { id: string; name: string; score: number; eloBefore: number; eloAfter: number }[];
  winnerId: string | null;
  timeline: ScorePoint[];
  questions: QuestionResult[];
  events: MatchEvent[];
  source: "ai" | "sample";
}

// ---------------------------------------------------------------- Tiến độ, phiên chơi (lưu cục bộ)
/** Vị trí câu vừa xong; làm tiếp sẽ bắt đầu từ câu kế tiếp. */
export type Cursor =
  | { kind: "kd-solo"; qi: number }
  | { kind: "kd-general"; qi: number }
  | { kind: "cnv-row"; qi: number }
  | { kind: "round-done"; roundIdx: number }
  | { kind: "tt"; qi: number }
  | { kind: "ve-dich"; qi: number; pack: PackState };

export interface Progress {
  cursor: Cursor | null;
  score: number;
  results: QuestionResult[];
  events: MatchEvent[];
  timeline: ScorePoint[];
  /** Thời gian đã chơi (ms), cộng dồn qua các lần làm tiếp. */
  elapsedMs: number;
}

export interface Session {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: "in-progress" | "finished";
  rounds: number[];
  useAI: boolean;
  plan: MatchPlan;
  progress: Progress;
  summary: MatchSummary | null;
  /** Lần làm thứ mấy của bộ đề này (làm lại thì tăng). */
  attempt: number;
  /** Phiên gốc nếu đây là lượt làm lại. */
  parentId?: string;
}

export type Ack<T> = ({ ok: true } & T) | { ok: false; error: string };
