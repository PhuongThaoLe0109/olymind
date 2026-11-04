// Chấm đáp án tự động: không phân biệt hoa/thường, dấu tiếng Việt, dấu câu.

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFKD") // NFKD: tách dấu và đổi chỉ số dưới (H₂O -> H2O)
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.,\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Bỏ mọi khoảng trắng và dấu câu: "Phan Xi Păng" == "phanxipang", "B D A C" == "BDAC". */
export function compact(input: string): string {
  return normalize(input).replace(/[^a-z0-9]/g, "");
}

function toNumber(s: string): number | null {
  const cleaned = s.replace(/,/g, ".").replace(/\s+/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

/** Lấy số đứng đầu, bỏ đơn vị: "13 cm" -> 13 */
function leadingNumber(s: string): number | null {
  const m = normalize(s).match(/^-?\d+([.,]\d+)?/);
  return m ? toNumber(m[0]) : null;
}

/** Dấu vân tay ổn định của một câu hỏi: dựa trên nội dung và đáp án đã chuẩn hóa. */
export function fingerprint(content: string, answer: string): string {
  const s = `${compact(content)}|${compact(answer)}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x1b873593;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 + c, 0x85ebca6b) ^ (h2 >>> 13);
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

/** "120.000" hoặc "120 000 đồng" -> "120000" (chỉ dùng khi đáp án là số nguyên từ 1000 trở lên). */
function stripThousands(s: string): string {
  const m = s.trim().match(/^(\d{1,3}(?:[.,\s]\d{3})+)(\s*\D.*)?$/);
  return m ? m[1].replace(/[.,\s]/g, "") + (m[2] ?? "") : s;
}

export function isCorrect(input: string, answer: string, accepted: string[] = []): boolean {
  const candidates = [answer, ...accepted];
  const n = normalize(input);
  if (!n) return false;
  const ci = compact(input);

  for (const c of candidates) {
    const nc = normalize(c);
    if (n === nc) return true;
    const a = toNumber(nc);
    if (a !== null) {
      // Đáp án là số: chỉ so theo giá trị số (cho phép gõ kèm đơn vị)
      const b = leadingNumber(Number.isInteger(a) && Math.abs(a) >= 1000 ? stripThousands(input) : input);
      if (b !== null && a === b) return true;
      continue;
    }
    if (ci && ci === compact(c)) return true;
  }
  return false;
}
