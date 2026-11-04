// Bộ sinh câu hỏi bằng thuật toán: đáp án luôn tính ra từ tham số nên đúng 100%, và có vô số biến thể (không bao giờ hết câu mới).
// Dùng cho vòng Tăng tốc (dãy số, toán đố, sắp xếp, hình ảnh) và một phần câu tính nhẩm của Khởi động/Về đích.
import { int, pick, sample, shuffle, type Rnd } from "./rng";
import type { CategoryKey } from "./types";

export interface GenQ {
  kind: "short" | "logic" | "sequence" | "image";
  category: CategoryKey;
  topic: string;
  grade: number;
  level: number;
  content: string;
  answer: string;
  acceptedAnswers: string[];
  explanation: string;
  trivia: string;
  items?: string[];
  media?: string;
}

const mk = (kind: GenQ["kind"], category: CategoryKey, topic: string, grade: number, level: number, content: string, answer: string | number, explanation: string, trivia = "", accepted: string[] = []): GenQ => ({
  kind, category, topic, grade, level, content, answer: String(answer), acceptedAnswers: accepted, explanation, trivia,
});
const fmt = (n: number) => String(n).replace(".", ",");
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

function modPow(base: number, exp: number, mod: number): number {
  let r = 1n, b = BigInt(base) % BigInt(mod), e = BigInt(exp);
  const m = BigInt(mod);
  while (e > 0n) {
    if (e & 1n) r = (r * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return Number(r);
}

// ======================================================================= Toán đố, tính nhanh (kind "logic")
type Gen = (r: Rnd) => GenQ;

const digitCount: Gen = (r) => {
  const n = int(r, 120, 999);
  const d = int(r, 0, 9);
  let c = 0;
  for (let i = 1; i <= n; i++) c += String(i).split("").filter((x) => x === String(d)).length;
  return mk("logic", "toan", "toan-mach-tinh", 5, 3, `Khi viết liên tiếp các số tự nhiên từ 1 đến ${n}, chữ số ${d} xuất hiện tất cả bao nhiêu lần?`, c, `Đếm lần lượt hàng đơn vị, hàng chục, hàng trăm của các số từ 1 đến ${n}: tổng cộng ${c} lần.`, "Bài đếm chữ số là dạng quen thuộc ở vòng Tăng tốc.");
};

const bottles: Gen = (r) => {
  const k = int(r, 3, 5);
  const n = int(r, 10, 40);
  let v = n, total = 0;
  while (v >= k) {
    const x = Math.floor(v / k);
    total += x;
    v = x + (v % k);
  }
  return mk("logic", "toan", "toan-mach-tinh", 6, 4, `Cứ ${k} vỏ chai nước đổi được 1 chai nước mới (chai mới uống xong lại có vỏ để đổi tiếp). Với ${n} vỏ chai, đổi được nhiều nhất bao nhiêu chai nước mới?`, total, `Đổi liên tục, mỗi vòng ${k} vỏ cho 1 chai, cộng dồn được ${total} chai.`, "Không mượn vỏ chai của người khác.");
};

const handshake: Gen = (r) => {
  const n = int(r, 8, 40);
  return mk("logic", "toan", "toan-to-hop-xs", 7, 3, `Trong một buổi họp có ${n} người, mỗi người bắt tay đúng một lần với từng người còn lại. Có tất cả bao nhiêu cái bắt tay?`, (n * (n - 1)) / 2, `Số cặp người là ${n}×${n - 1}/2 = ${(n * (n - 1)) / 2}.`);
};

const diagonals: Gen = (r) => {
  const n = int(r, 9, 30);
  return mk("logic", "toan", "toan-hinh-phang", 8, 3, `Một đa giác lồi ${n} cạnh có tất cả bao nhiêu đường chéo?`, (n * (n - 3)) / 2, `Công thức n(n − 3)/2 = ${n}×${n - 3}/2 = ${(n * (n - 3)) / 2}.`);
};

const trailingZeros: Gen = (r) => {
  const n = int(r, 26, 125);
  let f = 1n;
  for (let i = 2; i <= n; i++) f *= BigInt(i);
  const s = f.toString();
  const z = s.length - s.replace(/0+$/, "").length;
  return mk("logic", "toan", "toan-mach-tinh", 9, 5, `Tích 1 × 2 × 3 × ... × ${n} tận cùng bằng bao nhiêu chữ số 0 liên tiếp?`, z, `Số chữ số 0 bằng số thừa số 5: ⌊${n}/5⌋ + ⌊${n}/25⌋ + ⌊${n}/125⌋ = ${z}.`);
};

const clockAngle: Gen = (r) => {
  const h = int(r, 1, 11);
  const m = pick(r, [10, 20, 30, 40, 50, 14, 16, 24, 36, 44]);
  const a = Math.abs(30 * h - 5.5 * m) % 360;
  const ang = a > 180 ? 360 - a : a;
  return mk("logic", "toan", "toan-hinh-phang", 6, 4, `Lúc ${h} giờ ${m} phút, góc nhỏ (không lớn hơn 180°) tạo bởi kim giờ và kim phút của đồng hồ bằng bao nhiêu độ?`, fmt(ang), `Kim giờ ở ${30 * h + m / 2}°, kim phút ở ${6 * m}°, hiệu là ${fmt(ang)}°.`, "Mỗi phút kim phút đi 6°, kim giờ đi 0,5°.", [`${fmt(ang)} độ`]);
};

const gcdlcm: Gen = (r) => {
  const g = int(r, 3, 12), x = pick(r, [2, 3, 4, 5, 7]), y = pick(r, [3, 5, 6, 7, 8, 9].filter((v) => gcd(v, x) === 1));
  const a = g * x, b = g * y;
  if (r() < 0.5) return mk("logic", "toan", "toan-so-hoc", 6, 3, `Tìm bội chung nhỏ nhất (BCNN) của ${a} và ${b}.`, (a * b) / g, `ƯCLN(${a}, ${b}) = ${g} nên BCNN = ${a}×${b}/${g} = ${(a * b) / g}.`);
  return mk("logic", "toan", "toan-so-hoc", 6, 3, `Tìm ước chung lớn nhất (ƯCLN) của ${a} và ${b}.`, g, `${a} = ${g}×${x}, ${b} = ${g}×${y} với ${x} và ${y} nguyên tố cùng nhau nên ƯCLN = ${g}.`);
};

const sumSeries: Gen = (r) => {
  const n = int(r, 15, 80);
  if (r() < 0.5) return mk("logic", "toan", "toan-day-so", 5, 3, `Tính tổng 1 + 2 + 3 + ... + ${n}.`, (n * (n + 1)) / 2, `Công thức Gauss n(n + 1)/2 = ${(n * (n + 1)) / 2}.`);
  const k = int(r, 8, 30);
  return mk("logic", "toan", "toan-day-so", 6, 4, `Tính tổng của ${k} số lẻ đầu tiên: 1 + 3 + 5 + ...`, k * k, `Tổng k số lẻ đầu tiên bằng k² = ${k * k}.`);
};

const DAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const dayAccept = (i: number) => (i === 0 ? ["CN", "Chủ nhật"] : [`Thứ ${i + 1}`, DAYS[i].toLowerCase()]);
const weekday: Gen = (r) => {
  const i = int(r, 0, 6);
  const k = int(r, 20, 400);
  const j = (i + k) % 7;
  return mk("logic", "toan", "toan-mach-tinh", 6, 3, `Hôm nay là ${DAYS[i]}. Sau ${k} ngày nữa là thứ mấy?`, DAYS[j], `${k} chia 7 dư ${k % 7}, nên tiến thêm ${k % 7} ngày từ ${DAYS[i]} là ${DAYS[j]}.`, "", dayAccept(j));
};

const ageProblem: Gen = (r) => {
  const s = int(r, 5, 14), k = int(r, 3, 8), m = pick(r, [3, 4]);
  const f = m * (s + k) - k, d = f - s;
  return mk("logic", "toan", "toan-mach-tinh", 7, 4, `Cha hơn con ${d} tuổi. Sau ${k} năm nữa, tuổi cha gấp ${m} lần tuổi con. Hiện nay con bao nhiêu tuổi?`, s, `Hiệu tuổi không đổi = ${d}. Sau ${k} năm: tuổi con = ${d}/${m - 1} = ${s + k}, nên hiện nay con ${s} tuổi.`);
};

const pipes: Gen = (r) => {
  const [a, b, t] = pick(r, [[12, 12, 6], [6, 3, 2], [10, 15, 6], [20, 30, 12], [12, 6, 4], [24, 8, 6], [12, 4, 3], [20, 5, 4], [60, 30, 20], [15, 10, 6]] as const);
  return mk("logic", "toan", "toan-mach-tinh", 7, 3, `Vòi thứ nhất chảy một mình đầy bể trong ${a} giờ, vòi thứ hai chảy một mình đầy bể trong ${b} giờ. Mở cả hai vòi cùng lúc thì sau bao nhiêu giờ đầy bể?`, t, `Mỗi giờ hai vòi chảy được 1/${a} + 1/${b} = 1/${t} bể, nên cần ${t} giờ.`);
};

const chickenDog: Gen = (r) => {
  const dogs = int(r, 4, 20), chick = int(r, 5, 25);
  return mk("logic", "toan", "toan-mach-tinh", 5, 3, `Vừa gà vừa chó, có tất cả ${dogs + chick} con và ${2 * chick + 4 * dogs} chân. Hỏi có bao nhiêu con chó?`, dogs, `Giả sử tất cả là gà thì có ${2 * (dogs + chick)} chân; thiếu ${2 * dogs} chân, mỗi con chó hơn gà 2 chân nên có ${dogs} chó.`);
};

const discount: Gen = (r) => {
  const p = pick(r, [200, 400, 500, 800, 1000, 2000]) * 1000;
  const x = pick(r, [10, 20, 25, 30, 40, 50]), y = pick(r, [10, 20, 25, 50]);
  const end = (p * (100 - x) * (100 - y)) / 10000;
  return mk("logic", "toan", "toan-mach-tinh", 7, 3, `Một món hàng niêm yết ${p.toLocaleString("vi-VN")} đồng, được giảm ${x}% rồi giảm tiếp ${y}% trên giá đã giảm. Giá cuối cùng là bao nhiêu đồng?`, end, `${p} × ${100 - x}% × ${100 - y}% = ${end} đồng.`, "Hai lần giảm liên tiếp không bằng giảm cộng dồn.", [end.toLocaleString("vi-VN")]);
};

const lastDigit: Gen = (r) => {
  const a = pick(r, [2, 3, 7, 8, 9, 13, 17, 19]);
  const n = int(r, 20, 2030);
  const d = modPow(a, n, 10);
  return mk("logic", "toan", "toan-so-hoc", 8, 4, `Chữ số tận cùng của ${a}^${n} là chữ số nào?`, d, `Chữ số tận cùng lặp theo chu kỳ; tính ${a}^${n} mod 10 = ${d}.`);
};

const remainder: Gen = (r) => {
  const b = pick(r, [2, 3, 5]);
  const m = pick(r, [5, 7, 9, 11, 13]);
  const n = int(r, 30, 300);
  const d = modPow(b, n, m);
  return mk("logic", "toan", "toan-so-hoc", 9, 5, `Số dư của phép chia ${b}^${n} cho ${m} là bao nhiêu?`, d, `Dùng tính chất đồng dư và chu kỳ của lũy thừa: ${b}^${n} mod ${m} = ${d}.`);
};

const squaresGrid: Gen = (r) => {
  const n = int(r, 3, 8);
  if (r() < 0.5) {
    let s = 0;
    for (let k = 1; k <= n; k++) s += k * k;
    return mk("logic", "toan", "toan-mach-tinh", 6, 4, `Một bàn cờ ${n}×${n} ô vuông có tất cả bao nhiêu hình vuông (mọi kích thước, tạo bởi các đường lưới)?`, s, `Tổng 1² + 2² + ... + ${n}² = ${s}.`);
  }
  const t = (n * (n + 1)) / 2;
  return mk("logic", "toan", "toan-mach-tinh", 7, 5, `Một bàn cờ ${n}×${n} ô vuông có tất cả bao nhiêu hình chữ nhật (kể cả hình vuông, tạo bởi các đường lưới)?`, t * t, `Chọn 2 trong ${n + 1} đường dọc và 2 trong ${n + 1} đường ngang: (${n}×${n + 1}/2)² = ${t * t}.`);
};

const avgSpeed: Gen = (r) => {
  const [a, b, v] = pick(r, [[40, 60, 48], [30, 60, 40], [20, 30, 24], [60, 90, 72], [50, 75, 60], [24, 40, 30], [45, 90, 60], [12, 6, 8], [20, 60, 30], [36, 60, 45]] as const);
  return mk("logic", "toan", "toan-mach-tinh", 8, 4, `Một xe đi từ A đến B với vận tốc ${a} km/h rồi quay về A theo đường cũ với vận tốc ${b} km/h. Vận tốc trung bình cả đi lẫn về là bao nhiêu km/h?`, v, `Vận tốc trung bình = 2ab/(a + b) = 2×${a}×${b}/${a + b} = ${v} km/h (không phải trung bình cộng).`, "Bẫy quen thuộc: nhiều người trả lời trung bình cộng.");
};

const divisors: Gen = (r) => {
  const n = pick(r, [60, 72, 84, 90, 96, 100, 120, 126, 144, 180, 210, 240, 252, 360]);
  let c = 0;
  for (let i = 1; i <= n; i++) if (n % i === 0) c++;
  return mk("logic", "toan", "toan-so-hoc", 6, 3, `Số ${n} có tất cả bao nhiêu ước số nguyên dương?`, c, `Phân tích ra thừa số nguyên tố rồi nhân các (số mũ + 1): ${c} ước.`);
};

export const LOGIC_GENS: Gen[] = [digitCount, bottles, handshake, diagonals, trailingZeros, clockAngle, gcdlcm, sumSeries, weekday, ageProblem, pipes, chickenDog, discount, lastDigit, remainder, squaresGrid, avgSpeed, divisors];

// ======================================================================= Dãy số: "tìm số tiếp theo" (kind "logic")
const seqQ = (terms: number[], next: number, why: string, level: number, g = 6): GenQ =>
  mk("logic", "toan", "toan-day-so", g, level, `Tìm số tiếp theo của dãy: ${terms.join(", ")}, ...`, next, why);

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
const seqGens: Gen[] = [
  (r) => { const a = int(r, 3, 30), d = int(r, 4, 17); const t = Array.from({ length: 6 }, (_, i) => a + d * i); return seqQ(t.slice(0, 5), t[5], `Mỗi số bằng số liền trước cộng ${d}.`, 2, 4); },
  (r) => { const a = int(r, 2, 6), q = pick(r, [2, 3, 4]); const t = Array.from({ length: 6 }, (_, i) => a * q ** i); return seqQ(t.slice(0, 5), t[5], `Mỗi số bằng số liền trước nhân ${q}.`, 3, 6); },
  (r) => { const k = int(r, 1, 9); const f = (n: number) => n * n + k; const t = [1, 2, 3, 4, 5].map(f); return seqQ(t, f(6), `Số hạng thứ n bằng n² + ${k}.`, 3); },
  (r) => { const k = int(r, 2, 4); const f = (n: number) => n * (n + k); const t = [1, 2, 3, 4, 5].map(f); return seqQ(t, f(6), `Số hạng thứ n bằng n × (n + ${k}).`, 4); },
  (r) => { const k = int(r, 0, 3); const g = (n: number) => n ** 3 - k * n; const t = [2, 3, 4, 5, 6].map(g); return seqQ(t, g(7), k ? `Số hạng thứ n bằng n³ − ${k}n.` : "Đây là dãy lập phương: n³.", 5, 9); },
  (r) => { const s = int(r, 1, 9), d = int(r, 1, 4), e = int(r, 1, 3); let v = s, df = d; const t = [v]; for (let i = 0; i < 5; i++) { v += df; df += e; t.push(v); } return seqQ(t.slice(0, 5), t[5], `Hiệu hai số liên tiếp lần lượt là ${d}, ${d + e}, ${d + 2 * e}, ${d + 3 * e}, nên hiệu tiếp theo là ${d + 4 * e}.`, 4, 7); },
  (r) => { const a = int(r, 1, 5), b = int(r, 1, 6); const t = [a, b]; for (let i = 2; i < 7; i++) t.push(t[i - 1] + t[i - 2]); return seqQ(t.slice(0, 6), t[6], `Mỗi số bằng tổng của hai số đứng ngay trước nó.`, 3, 8); },
  (r) => { const a = int(r, 1, 5), da = int(r, 2, 4), b = int(r, 10, 30), db = int(r, 3, 7); const t = [a, b, a + da, b + db, a + 2 * da, b + 2 * db]; return seqQ(t, a + 3 * da, `Dãy xen kẽ hai quy luật: các số đứng ở vị trí lẻ tăng ${da} một lần (${a}, ${a + da}, ${a + 2 * da}, ...), các số ở vị trí chẵn tăng ${db} một lần. Số tiếp theo ở vị trí lẻ nên là ${a + 3 * da}.`, 4, 7); },
  (r) => { const i = int(r, 0, 8); const t = PRIMES.slice(i, i + 6); return seqQ(t.slice(0, 5), t[5], "Đây là dãy các số nguyên tố liên tiếp.", 3, 6); },
  (r) => { const a = int(r, 1, 4), k = pick(r, [1, 2, 3]); let v = a; const t = [v]; for (let i = 0; i < 5; i++) { v = 2 * v + k; t.push(v); } return seqQ(t.slice(0, 5), t[5], `Mỗi số bằng 2 lần số liền trước cộng ${k}.`, 4, 8); },
  (r) => { const k = int(r, 1, 3); const f = (n: number) => 2 ** n - k; const t = [2, 3, 4, 5, 6].map(f); return seqQ(t, f(7), `Số hạng thứ n bằng 2^n − ${k}.`, 4, 8); },
  (r) => { const a = int(r, 2, 4); const f = (n: number) => (n * (n + 1)) / 2 * a; const t = [1, 2, 3, 4, 5].map(f); return seqQ(t, f(6), `Mỗi số bằng ${a} lần số tam giác thứ n: ${a}×n(n+1)/2.`, 4, 7); },
];
export const SEQUENCE_NUMBER_GENS: Gen[] = seqGens;

// ======================================================================= Sắp xếp (kind "sequence")
const LETTERS = ["A", "B", "C", "D"];
function orderQ(category: CategoryKey, topic: string, grade: number, level: number, intro: string, pairs: { text: string; v: number; label?: string }[], explainJoin: (p: { text: string; v: number; label?: string }) => string, asc: boolean, r: Rnd): GenQ {
  const items = shuffle(pairs, r);
  const sorted = [...items].sort((a, b) => (asc ? a.v - b.v : b.v - a.v));
  const answer = sorted.map((s) => LETTERS[items.indexOf(s)]).join("");
  const g = mk("sequence", category, topic, grade, level, `${intro} (gõ chuỗi chữ cái, ví dụ ABCD).`, answer, sorted.map(explainJoin).join(" → ") + ".");
  g.items = items.map((i) => i.text);
  return g;
}

const EVENTS: { text: string; v: number }[] = [
  { text: "Khởi nghĩa Hai Bà Trưng", v: 40 }, { text: "Ngô Quyền đại thắng quân Nam Hán trên sông Bạch Đằng", v: 938 },
  { text: "Lý Công Uẩn dời đô ra Thăng Long", v: 1010 }, { text: "Lý Thường Kiệt chỉ huy trận phòng tuyến sông Như Nguyệt", v: 1077 },
  { text: "Nhà Trần được thành lập", v: 1225 }, { text: "Trần Hưng Đạo đại thắng quân Nguyên Mông trên sông Bạch Đằng", v: 1288 },
  { text: "Hồ Quý Ly lập nhà Hồ", v: 1400 }, { text: "Nguyễn Trãi soạn Bình Ngô đại cáo", v: 1428 },
  { text: "Mạc Đăng Dung lập nhà Mạc", v: 1527 }, { text: "Quang Trung đại phá quân Thanh", v: 1789 },
  { text: "Gia Long lên ngôi, lập nhà Nguyễn", v: 1802 }, { text: "Pháp nổ súng tấn công Đà Nẵng", v: 1858 },
  { text: "Đảng Cộng sản Việt Nam được thành lập", v: 1930 }, { text: "Cách mạng Tháng Tám thành công", v: 1945 },
  { text: "Chiến thắng Điện Biên Phủ", v: 1954 }, { text: "Ký Hiệp định Pa-ri về Việt Nam", v: 1973 },
  { text: "Giải phóng hoàn toàn miền Nam", v: 1975 }, { text: "Đại hội VI của Đảng mở đầu công cuộc Đổi mới", v: 1986 },
  { text: "Việt Nam gia nhập ASEAN", v: 1995 }, { text: "Việt Nam gia nhập WTO", v: 2007 },
  { text: "Magna Carta được ký ở Anh", v: 1215 }, { text: "Constantinople thất thủ, Đế quốc Byzantine sụp đổ", v: 1453 },
  { text: "Columbus đến châu Mỹ", v: 1492 }, { text: "Martin Luther đưa ra 95 luận đề", v: 1517 },
  { text: "Mỹ công bố Tuyên ngôn Độc lập", v: 1776 }, { text: "Napoleon lên ngôi hoàng đế Pháp", v: 1804 },
  { text: "Đức thống nhất dưới thời Bismarck", v: 1871 }, { text: "Anh em nhà Wright bay chuyến bay có động cơ đầu tiên", v: 1903 },
  { text: "Chiến tranh thế giới thứ nhất bùng nổ", v: 1914 }, { text: "Cách mạng Tháng Mười Nga", v: 1917 },
  { text: "Chiến tranh thế giới thứ hai bùng nổ", v: 1939 }, { text: "Yuri Gagarin bay vào vũ trụ", v: 1961 },
  { text: "Con người đặt chân lên Mặt Trăng lần đầu", v: 1969 }, { text: "Bức tường Berlin sụp đổ", v: 1989 },
];
const orderHistory: Gen = (r) => {
  for (;;) {
    const four = sample(EVENTS, 4, r);
    const vs = four.map((e) => e.v).sort((a, b) => a - b);
    if (vs.every((v, i) => i === 0 || v - vs[i - 1] >= 8)) {
      return orderQ("su", "su-nhan-vat", 9, 3, "Sắp xếp các sự kiện sau theo thứ tự thời gian từ sớm đến muộn", four, (p) => `${p.text} (${p.v})`, true, r);
    }
  }
};

const PLANETS = ["Sao Thủy", "Sao Kim", "Trái Đất", "Sao Hỏa", "Sao Mộc", "Sao Thổ", "Sao Thiên Vương", "Sao Hải Vương"];
const PLANET_DIAM: Record<string, number> = { "Sao Mộc": 142984, "Sao Thổ": 120536, "Sao Thiên Vương": 51118, "Sao Hải Vương": 49528, "Trái Đất": 12756, "Sao Kim": 12104, "Sao Hỏa": 6792, "Sao Thủy": 4879 };
const orderPlanets: Gen = (r) => {
  const four = sample(PLANETS, 4, r);
  if (r() < 0.5) {
    const near = r() < 0.5;
    return orderQ("chung", "chung-thien-van", 6, 2, `Sắp xếp các hành tinh sau theo khoảng cách ${near ? "tăng dần" : "giảm dần"} từ Mặt Trời`, four.map((p) => ({ text: p, v: PLANETS.indexOf(p) })), (p) => p.text, near, r);
  }
  return orderQ("chung", "chung-thien-van", 6, 3, "Sắp xếp các hành tinh sau theo đường kính từ lớn đến nhỏ", four.map((p) => ({ text: p, v: PLANET_DIAM[p] })), (p) => `${p.text} (${p.v.toLocaleString("vi-VN")} km)`, false, r);
};

const ELEMENTS: [string, number][] = [["Hiđro", 1], ["Heli", 2], ["Liti", 3], ["Cacbon", 6], ["Nitơ", 7], ["Oxi", 8], ["Flo", 9], ["Natri", 11], ["Magie", 12], ["Nhôm", 13], ["Silic", 14], ["Photpho", 15], ["Lưu huỳnh", 16], ["Clo", 17], ["Kali", 19], ["Canxi", 20], ["Sắt", 26], ["Đồng", 29], ["Kẽm", 30], ["Bạc", 47], ["Thiếc", 50], ["Iot", 53], ["Vàng", 79], ["Thủy ngân", 80], ["Chì", 82], ["Urani", 92]];
const orderElements: Gen = (r) => orderQ("hoa", "hoa-nguyen-to", 8, 3, "Sắp xếp các nguyên tố sau theo số hiệu nguyên tử tăng dần", sample(ELEMENTS, 4, r).map(([text, v]) => ({ text, v })), (p) => `${p.text} (Z = ${p.v})`, true, r);

const MOUNTAINS: [string, number][] = [["Everest", 8849], ["K2", 8611], ["Kangchenjunga", 8586], ["Lhotse", 8516], ["Kilimanjaro", 5895], ["Elbrus", 5642], ["Mont Blanc", 4806], ["Phú Sĩ", 3776], ["Phan Xi Păng", 3143], ["Aconcagua", 6961], ["Denali", 6190], ["Kosciuszko", 2228], ["Ben Nevis", 1345]];
const orderMountains: Gen = (r) => orderQ("dia", "dia-ky-luc", 8, 4, "Sắp xếp các đỉnh núi sau theo độ cao từ cao đến thấp", sample(MOUNTAINS, 4, r).map(([text, v]) => ({ text, v })), (p) => `${p.text} (khoảng ${p.v.toLocaleString("vi-VN")} m)`, false, r);

const orderFractions: Gen = (r) => {
  for (;;) {
    const set = new Map<string, { text: string; v: number }>();
    while (set.size < 4) {
      const d = int(r, 3, 12), n = int(r, 1, d - 1);
      if (gcd(n, d) !== 1) continue;
      set.set(`${n}/${d}`, { text: `${n}/${d}`, v: n / d });
    }
    const arr = [...set.values()];
    const vs = arr.map((x) => x.v).sort((a, b) => a - b);
    if (vs.every((v, i) => i === 0 || v - vs[i - 1] > 0.03)) {
      const asc = r() < 0.5;
      return orderQ("toan", "toan-so-hoc", 6, 3, `Sắp xếp các phân số sau theo thứ tự ${asc ? "tăng dần" : "giảm dần"}`, arr, (p) => `${p.text} ≈ ${p.v.toFixed(2).replace(".", ",")}`, asc, r);
    }
  }
};
export const ORDER_GENS: Gen[] = [orderHistory, orderHistory, orderPlanets, orderElements, orderMountains, orderFractions];

// ======================================================================= Hình ảnh (kind "image")
const uri = (svg: string) => "data:image/svg+xml;utf8," + encodeURIComponent(svg);
const COLORS: { name: string; hex: string }[] = [
  { name: "đỏ", hex: "#EF4444" }, { name: "xanh dương", hex: "#38BDF8" }, { name: "xanh lá", hex: "#34D399" }, { name: "vàng", hex: "#F59E0B" },
];
const SHAPES = [
  { name: "hình tròn", f: (x: number, y: number, c: string) => `<circle cx="${x}" cy="${y}" r="15" fill="${c}"/>` },
  { name: "hình vuông", f: (x: number, y: number, c: string) => `<rect x="${x - 14}" y="${y - 14}" width="28" height="28" fill="${c}"/>` },
  { name: "hình tam giác", f: (x: number, y: number, c: string) => `<polygon points="${x},${y - 16} ${x + 16},${y + 14} ${x - 16},${y + 14}" fill="${c}"/>` },
];

const shapeCount: Gen = (r) => {
  for (;;) {
    const cols = 6, rows = 4, W = 240, H = 160;
    const cells = shuffle(Array.from({ length: cols * rows }, (_, i) => i), r).slice(0, int(r, 11, 16));
    const placed = cells.map((c) => ({ c, s: int(r, 0, 2), k: int(r, 0, 3) }));
    const ts = int(r, 0, 2), tk = int(r, 0, 3);
    const count = placed.filter((p) => p.s === ts && p.k === tk).length;
    if (count < 2 || count > 6) continue;
    const body = placed.map((p) => {
      const x = Math.round(20 + (p.c % cols) * ((W - 40) / (cols - 1))), y = Math.round(22 + Math.floor(p.c / cols) * ((H - 44) / (rows - 1)));
      return SHAPES[p.s].f(x, y, COLORS[p.k].hex);
    }).join("");
    const g = mk("image", "toan", "toan-mach-tinh", 3, 3, `Có bao nhiêu ${SHAPES[ts].name} màu ${COLORS[tk].name} trong hình?`, count, `Đếm các ${SHAPES[ts].name} màu ${COLORS[tk].name}: ${count}.`, "Câu hình ảnh đòi hỏi quan sát nhanh, tránh đếm nhầm màu.");
    g.media = uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="12" fill="#0F172A"/>${body}</svg>`);
    return g;
  }
};

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};
const dice: Gen = (r) => {
  const n = int(r, 3, 4);
  const faces = Array.from({ length: n }, () => int(r, 1, 6));
  const W = 60 * n + 20;
  const body = faces.map((f, i) => {
    const x0 = 14 + i * 60;
    return `<rect x="${x0}" y="20" width="50" height="50" rx="8" fill="#F8FAFC"/>` + PIPS[f].map(([px, py]) => `<circle cx="${x0 + 10 + px * 15}" cy="${30 + py * 15}" r="4.5" fill="#0F172A"/>`).join("");
  }).join("");
  const sum = faces.reduce((a, b) => a + b, 0);
  const g = mk("image", "toan", "toan-mach-tinh", 2, 2, `Trong hình có ${n} con xúc xắc. Tổng số chấm trên các mặt nhìn thấy là bao nhiêu?`, sum, `Các mặt lần lượt là ${faces.join(" + ")} = ${sum}.`);
  g.media = uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 90" width="${W}" height="90"><rect width="${W}" height="90" rx="12" fill="#1E293B"/>${body}</svg>`);
  return g;
};

const clock: Gen = (r) => {
  const h = int(r, 1, 12), m = int(r, 0, 11) * 5;
  const cx = 90, cy = 90;
  const hand = (deg: number, len: number, w: number, c: string) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * len).toFixed(1)}" y2="${(cy + Math.sin(a) * len).toFixed(1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  };
  const marks = Array.from({ length: 12 }, (_, i) => {
    const a = ((i * 30 - 90) * Math.PI) / 180;
    return `<text x="${(cx + Math.cos(a) * 68).toFixed(1)}" y="${(cy + Math.sin(a) * 68 + 5).toFixed(1)}" text-anchor="middle" font-size="14" font-family="sans-serif" fill="#0F172A">${i === 0 ? 12 : i}</text>`;
  }).join("");
  const mm = String(m).padStart(2, "0");
  const g = mk("image", "toan", "toan-mach-tinh", 3, 3, "Đồng hồ trong hình chỉ mấy giờ? (gõ dạng giờ:phút, ví dụ 3:20)", `${h}:${mm}`, `Kim ngắn chỉ gần số ${h}, kim dài chỉ số ${m / 5}, tức ${h} giờ ${m} phút.`, "", [`${h}h${mm}`, `${h} giờ ${m} phút`, `${h} giờ ${mm}`, m === 0 ? `${h} giờ` : `${h}h${m}`, m === 0 ? `${h}h` : `${h}:${m}`]);
  g.media = uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180"><rect width="180" height="180" rx="12" fill="#F8FAFC"/><circle cx="${cx}" cy="${cy}" r="82" fill="#FFFFFF" stroke="#0F172A" stroke-width="4"/>${marks}${hand(h * 30 + m / 2, 40, 6, "#0F172A")}${hand(m * 6, 62, 3.5, "#EF4444")}<circle cx="${cx}" cy="${cy}" r="5" fill="#0F172A"/></svg>`);
  return g;
};
export const IMAGE_GENS: Gen[] = [shapeCount, shapeCount, dice, clock];

// ======================================================================= Tính nhẩm theo phân môn (kind "short")
const ATOM: Record<string, number> = { H: 1, C: 12, N: 14, O: 16, Na: 23, Mg: 24, Al: 27, S: 32, K: 39, Ca: 40, Fe: 56, Cu: 64 };
const COMPOUNDS: { name: string; formula: string; comp: Record<string, number> }[] = [
  { name: "nước", formula: "H2O", comp: { H: 2, O: 1 } }, { name: "cacbon đioxit", formula: "CO2", comp: { C: 1, O: 2 } },
  { name: "metan", formula: "CH4", comp: { C: 1, H: 4 } }, { name: "amoniac", formula: "NH3", comp: { N: 1, H: 3 } },
  { name: "natri hiđroxit", formula: "NaOH", comp: { Na: 1, O: 1, H: 1 } }, { name: "kali hiđroxit", formula: "KOH", comp: { K: 1, O: 1, H: 1 } },
  { name: "canxi cacbonat", formula: "CaCO3", comp: { Ca: 1, C: 1, O: 3 } }, { name: "canxi oxit", formula: "CaO", comp: { Ca: 1, O: 1 } },
  { name: "axit sunfuric", formula: "H2SO4", comp: { H: 2, S: 1, O: 4 } }, { name: "axit nitric", formula: "HNO3", comp: { H: 1, N: 1, O: 3 } },
  { name: "nhôm oxit", formula: "Al2O3", comp: { Al: 2, O: 3 } }, { name: "sắt(III) oxit", formula: "Fe2O3", comp: { Fe: 2, O: 3 } },
  { name: "ancol etylic", formula: "C2H5OH", comp: { C: 2, H: 6, O: 1 } }, { name: "glucozơ", formula: "C6H12O6", comp: { C: 6, H: 12, O: 6 } },
  { name: "magie hiđroxit", formula: "Mg(OH)2", comp: { Mg: 1, O: 2, H: 2 } }, { name: "canxi hiđroxit", formula: "Ca(OH)2", comp: { Ca: 1, O: 2, H: 2 } },
  { name: "natri hiđrocacbonat", formula: "NaHCO3", comp: { Na: 1, H: 1, C: 1, O: 3 } }, { name: "natri cacbonat", formula: "Na2CO3", comp: { Na: 2, C: 1, O: 3 } },
  { name: "axit axetic", formula: "CH3COOH", comp: { C: 2, H: 4, O: 2 } }, { name: "etilen", formula: "C2H4", comp: { C: 2, H: 4 } },
  { name: "đồng(II) sunfat", formula: "CuSO4", comp: { Cu: 1, S: 1, O: 4 } }, { name: "lưu huỳnh đioxit", formula: "SO2", comp: { S: 1, O: 2 } },
];
const molarMass: Gen = (r) => {
  const c = pick(r, COMPOUNDS);
  const M = Object.entries(c.comp).reduce((s, [e, n]) => s + ATOM[e] * n, 0);
  const used = Object.keys(c.comp).map((e) => `${e} = ${ATOM[e]}`).join(", ");
  return mk("short", "hoa", "hoa-ly-hoa", 8, 3, `Phân tử khối của ${c.name} (${c.formula}) bằng bao nhiêu? (Cho ${used})`, M, `Cộng khối lượng các nguyên tử trong ${c.formula}: ${M}.`);
};

const binaryConv: Gen = (r) => {
  const n = int(r, 11, 250);
  const t = r();
  if (t < 0.4) return mk("short", "tin", "tin-lap-trinh", 10, 3, `Số thập phân ${n} viết trong hệ nhị phân là gì?`, n.toString(2), `Chia ${n} liên tiếp cho 2 rồi đọc số dư ngược: ${n.toString(2)}.`);
  if (t < 0.8) return mk("short", "tin", "tin-lap-trinh", 10, 3, `Số nhị phân ${n.toString(2)} có giá trị bằng bao nhiêu trong hệ thập phân?`, n, `Cộng các lũy thừa của 2 tương ứng với bit 1: ${n}.`);
  const hex = n.toString(16).toUpperCase();
  return mk("short", "tin", "tin-lap-trinh", 11, 4, `Số thập lục phân ${hex} có giá trị bằng bao nhiêu trong hệ thập phân?`, n, `${hex} (hệ 16) = ${n} (hệ 10).`);
};

function toRoman(n: number): string {
  const t: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let s = "";
  for (const [v, sym] of t) while (n >= v) { s += sym; n -= v; }
  return s;
}
const roman: Gen = (r) => {
  const n = pick(r, [int(r, 40, 399), int(r, 400, 1999), int(r, 1900, 2099)]);
  return mk("short", "toan", "toan-hang-so", 6, 3, `Số La Mã ${toRoman(n)} có giá trị bằng bao nhiêu?`, n, `Cộng/trừ các ký hiệu La Mã theo quy tắc: ${toRoman(n)} = ${n}.`);
};

const physicsCalc: Gen = (r) => {
  const t = r();
  if (t < 0.2) { const s = int(r, 2, 9); return mk("short", "ly", "ly-co-hoc", 10, 3, `Một vật rơi tự do không vận tốc đầu trong ${s} giây, lấy g = 10 m/s². Quãng đường vật rơi được là bao nhiêu mét?`, 5 * s * s, `s = ½gt² = ½×10×${s}² = ${5 * s * s} m.`); }
  if (t < 0.4) { const [a, b, rr] = pick(r, [[6, 3, 2], [12, 4, 3], [20, 5, 4], [30, 60, 20], [10, 10, 5], [15, 10, 6], [40, 40, 20]] as const); return mk("short", "ly", "ly-dien", 9, 3, `Hai điện trở ${a} Ω và ${b} Ω mắc song song. Điện trở tương đương của đoạn mạch là bao nhiêu ôm?`, rr, `1/R = 1/${a} + 1/${b} nên R = ${rr} Ω.`); }
  if (t < 0.6) { const w = pick(r, [40, 60, 75, 100, 150]), h = pick(r, [2, 4, 5, 8, 10]), d = pick(r, [10, 20, 30]); const kwh = (w * h * d) / 1000; return mk("short", "ly", "ly-dien", 9, 3, `Một bóng đèn ${w} W thắp ${h} giờ mỗi ngày trong ${d} ngày. Điện năng tiêu thụ là bao nhiêu kWh?`, fmt(kwh), `A = P×t = ${w} W × ${h * d} h = ${w * h * d} Wh = ${fmt(kwh)} kWh.`, "", [`${fmt(kwh)} kWh`, String(kwh)]); }
  if (t < 0.8) { const v = pick(r, [18, 36, 54, 72, 90, 108, 126]); return mk("short", "ly", "ly-co-hoc", 8, 2, `Đổi vận tốc ${v} km/h sang đơn vị m/s.`, (v * 10) / 36, `Chia cho 3,6: ${v}/3,6 = ${(v * 10) / 36} m/s.`, "", [`${(v * 10) / 36} m/s`]); }
  const u = pick(r, [6, 12, 24, 36, 220]), i = pick(r, [0.5, 1, 2, 4, 5]); return mk("short", "ly", "ly-dien", 9, 2, `Đặt hiệu điện thế ${u} V vào hai đầu một điện trở thì cường độ dòng điện là ${fmt(i)} A. Điện trở có giá trị bao nhiêu ôm?`, fmt(u / i), `R = U/I = ${u}/${fmt(i)} = ${fmt(u / i)} Ω.`, "", [`${fmt(u / i)} ôm`]);
};

const chemCalc: Gen = (r) => {
  const t = r();
  const k = int(r, 2, 9);
  if (t < 0.34) return mk("short", "hoa", "hoa-ly-hoa", 10, 3, `Dung dịch axit mạnh có nồng độ H⁺ bằng 10 mũ −${k} mol/lít. pH của dung dịch bằng bao nhiêu?`, k, `pH = −lg[H⁺] = ${k}.`);
  if (t < 0.67) return mk("short", "hoa", "hoa-ly-hoa", 10, 4, `Dung dịch bazơ mạnh có nồng độ OH⁻ bằng 10 mũ −${k} mol/lít ở 25°C. pH của dung dịch bằng bao nhiêu?`, 14 - k, `pOH = ${k} nên pH = 14 − ${k} = ${14 - k}.`);
  const n = int(r, 1, 9);
  return mk("short", "hoa", "hoa-ly-hoa", 8, 3, `Đốt cháy hoàn toàn ${n} mol khí metan (CH4) theo phản ứng CH4 + 2O2 → CO2 + 2H2O. Cần dùng bao nhiêu mol khí oxi?`, 2 * n, `Theo phương trình, 1 mol CH4 cần 2 mol O2 nên ${n} mol cần ${2 * n} mol.`);
};

const bioCalc: Gen = (r) => {
  const t = r();
  if (t < 0.4) { const k = int(r, 2, 7); return mk("short", "sinh", "sinh-te-bao", 10, 3, `Một tế bào nguyên phân liên tiếp ${k} lần. Số tế bào con tạo thành là bao nhiêu?`, 2 ** k, `Mỗi lần nguyên phân số tế bào tăng gấp đôi: 2^${k} = ${2 ** k}.`); }
  if (t < 0.7) { const n2 = pick(r, [8, 14, 24, 38, 46, 78]); return mk("short", "sinh", "sinh-te-bao", 10, 4, `Một tế bào lưỡng bội có bộ nhiễm sắc thể 2n = ${n2}. Ở kỳ sau của nguyên phân, trong tế bào có bao nhiêu nhiễm sắc thể đơn?`, 2 * n2, `Ở kỳ sau, các nhiễm sắc thể kép tách thành nhiễm sắc thể đơn nên số nhiễm sắc thể đơn là 4n = ${2 * n2}.`); }
  const N = pick(r, [1200, 1800, 2400, 3000]), A = int(r, 5, 12) * 50;
  return mk("short", "sinh", "sinh-di-truyen", 12, 4, `Một đoạn ADN có tổng số ${N} nuclêôtit, trong đó loại A có ${A} nuclêôtit. Số nuclêôtit loại G là bao nhiêu?`, N / 2 - A, `A = T = ${A} nên G = X = (${N} − 2×${A})/2 = ${N / 2 - A}.`);
};

const ZONES: [string, number][] = [["Bắc Kinh", 8], ["Tokyo", 9], ["Mát-xcơ-va", 3], ["Dubai", 4], ["Băng Cốc", 7], ["Luân Đôn (bỏ qua giờ mùa hè)", 0]];
const timeZone: Gen = (r) => {
  const [city, off] = pick(r, ZONES.filter((z) => z[1] !== 7));
  const h = int(r, 0, 23);
  const there = (((h - 7 + off) % 24) + 24) % 24;
  return mk("short", "dia", "dia-trai-dat", 6, 3, `Lúc ${h} giờ theo giờ Hà Nội (UTC+7), ở ${city} (UTC${off >= 0 ? "+" : "−"}${Math.abs(off)}) là mấy giờ? (hệ 24 giờ, chỉ gõ số giờ)`, there, `Chênh lệch ${off - 7} giờ so với Hà Nội: ${h} ${off - 7 >= 0 ? "+" : "−"} ${Math.abs(off - 7)} → ${there} giờ.`, "", [`${there} giờ`, `${there}h`]);
};
export const MENTAL_GENS: Gen[] = [molarMass, binaryConv, roman, physicsCalc, chemCalc, bioCalc, timeZone];

export function genLogic(r: Rnd): GenQ {
  return r() < 0.45 ? pick(r, seqGens)(r) : pick(r, LOGIC_GENS)(r);
}
export const genOrder = (r: Rnd) => pick(r, ORDER_GENS)(r);
export const genImage = (r: Rnd) => pick(r, IMAGE_GENS)(r);
export const genMental = (r: Rnd) => pick(r, MENTAL_GENS)(r);
