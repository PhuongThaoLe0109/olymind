// Bộ luật thi đấu, bám theo Đường lên đỉnh Olympia các mùa 24–26.
// Mọi con số nằm ở đây để đổi luật (hoặc đổi mùa) mà không đụng vào engine.
//
// Nhãn nguồn:
//  [N] có trong nguồn tra được (xem README, mục "Luật tham chiếu")
//  [?] chưa kiểm chứng được trong nguồn, lấy theo hiểu biết chung về chương trình
//  [W] điều chỉnh cho bản web (gõ phím chậm hơn nói)

export interface Rules {
  khoiDong: {
    soloQuestions: number; // [N] mỗi thí sinh 6 câu riêng
    soloAnswerMs: number; // [N] TV: 5 giây; [W] web dài hơn vì phải gõ
    generalQuestions: number; // [N] mùa 24: 12 câu chung bấm chuông
    generalNoBuzzMs: number; // [N] TV: 3 giây không ai bấm thì MC công bố đáp án; [W] dài hơn để đọc
    generalAnswerMs: number; // [N] TV: 5 giây sau khi bấm chuông; [W]
    /** Số giây hiển thị cho người chơi (không co theo tốc độ demo) và số giây thi thật trên truyền hình. */
    shown: { soloS: number; noBuzzS: number; answerS: number; tvSoloS: number; tvNoBuzzS: number; tvAnswerS: number };
    correct: number; // [N] +10
    generalWrong: number; // [N] bấm chuông sai hoặc quá giờ: -5
  };
  cnv: {
    rows: number; // 4 hàng ngang + ô trung tâm
    rowMs: number; // [?] 15 giây mỗi hàng
    rowPoints: number; // [?] mỗi hàng ngang đúng +10
    keywordPoints: number[]; // [N] đoán từ khóa khi đang ở hàng 1..4: 60, 50, 40, 30
    centerPoints: number; // [N] đoán sau khi ô trung tâm lộ: 20
    centerMs: number; // [?]
    wrongLocksPlayer: boolean; // [N] đoán sai từ khóa bị loại khỏi phần còn lại của vòng
  };
  tangToc: {
    timesMs: number[]; // [N] mùa 26: 20s, 20s, 30s, 30s (các mùa trước: 10/20/30/40s)
    points: number[]; // [N] đúng nhanh nhất 40, rồi 30, 20, 10
  };
  veDich: {
    values: number[]; // [N] mùa 24–26 chỉ còn câu 20 và 30 điểm
    perPack: number; // [N] mỗi gói 3 câu
    pickMs: number; // chọn gói và ngôi sao
    answerMs: number; // [?] 20 giây cho câu 20đ/30đ (mùa 23 là 15s/30s)
    stealWindowMs: number; // [W] cửa sổ bấm chuông cướp điểm
    stealAnswerMs: number; // [W]
    stealWrongRatio: number; // [?] cướp sai bị trừ một nửa giá trị câu
    starMultiplier: number; // [N] Ngôi sao hy vọng: đúng thì nhân đôi
    starWrongLosesBase: boolean; // [?] sai thì mất đúng số điểm câu đó
    stealTakesFromOwner: boolean; // [N] điểm cướp được lấy từ quỹ điểm của chủ gói
    orderByScoreDesc: boolean; // [N] người điểm cao nhất chơi trước, bằng điểm thì theo ghế
  };
  tiebreak: {
    answerMs: number; // [N] hòa điểm ở đầu bảng: câu hỏi phụ, ai bấm chuông trước trả lời
    windowMs: number;
  };
  scoreFloor: number; // [N] điểm không âm
  introMs: number;
  revealMs: number;
  soloRevealMs: number;
  buzzWindowMs: number; // gom các lần bấm trong cửa sổ này rồi so thời điểm đã bù RTT
  maxRttCompMs: number;
}

export const RULES_WEB: Rules = {
  khoiDong: {
    soloQuestions: 6,
    soloAnswerMs: 20_000,
    generalQuestions: 12,
    generalNoBuzzMs: 12_000,
    generalAnswerMs: 15_000,
    shown: { soloS: 20, noBuzzS: 12, answerS: 15, tvSoloS: 5, tvNoBuzzS: 3, tvAnswerS: 5 },
    correct: 10,
    generalWrong: -5,
  },
  cnv: {
    rows: 4,
    rowMs: 15_000,
    rowPoints: 10,
    keywordPoints: [60, 50, 40, 30],
    centerPoints: 20,
    centerMs: 20_000,
    wrongLocksPlayer: true,
  },
  tangToc: {
    timesMs: [20_000, 20_000, 30_000, 30_000],
    points: [40, 30, 20, 10],
  },
  veDich: {
    values: [20, 30],
    perPack: 3,
    pickMs: 20_000,
    answerMs: 20_000,
    stealWindowMs: 6_000,
    stealAnswerMs: 10_000,
    stealWrongRatio: 0.5,
    starMultiplier: 2,
    starWrongLosesBase: true,
    stealTakesFromOwner: true,
    orderByScoreDesc: true,
  },
  tiebreak: { answerMs: 10_000, windowMs: 10_000 },
  scoreFloor: 0,
  introMs: 4_000,
  soloRevealMs: 9_000, // [W] đáp án + giải thích sau mỗi câu Khởi động riêng
  revealMs: 14_000, // [W] đủ thời gian đọc đáp án và giải thích; chủ phòng bấm Tiếp tục để qua sớm
  buzzWindowMs: 80,
  maxRttCompMs: 150,
};

/** Rút ngắn mọi mốc thời gian (dùng cho test và demo). */
/** `keepReading`: giữ nguyên thời gian đọc (màn chờ, đáp án) khi co các thời gian trả lời. */
export function scaleRules(r: Rules, k: number, keepReading = false): Rules {
  const s = (n: number) => Math.max(5, Math.round(n * k));
  return {
    ...r,
    khoiDong: {
      ...r.khoiDong,
      soloAnswerMs: s(r.khoiDong.soloAnswerMs),
      generalNoBuzzMs: s(r.khoiDong.generalNoBuzzMs),
      generalAnswerMs: s(r.khoiDong.generalAnswerMs),
    },
    cnv: { ...r.cnv, rowMs: s(r.cnv.rowMs), centerMs: s(r.cnv.centerMs) },
    tangToc: { ...r.tangToc, timesMs: r.tangToc.timesMs.map(s) },
    veDich: {
      ...r.veDich,
      pickMs: s(r.veDich.pickMs),
      answerMs: s(r.veDich.answerMs),
      stealWindowMs: s(r.veDich.stealWindowMs),
      stealAnswerMs: s(r.veDich.stealAnswerMs),
    },
    tiebreak: { answerMs: s(r.tiebreak.answerMs), windowMs: s(r.tiebreak.windowMs) },
    introMs: keepReading ? r.introMs : s(r.introMs),
    revealMs: keepReading ? r.revealMs : s(r.revealMs),
    soloRevealMs: keepReading ? r.soloRevealMs : s(r.soloRevealMs),
    buzzWindowMs: r.buzzWindowMs,
  };
}
