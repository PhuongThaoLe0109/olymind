// Thành tích tính thẳng từ sổ câu đã làm: càng vượt qua nhiều câu, càng nhiều mốc.
import { CATEGORY_LABEL, CATEGORY_ORDER, type CategoryKey } from "./types";
import type { QLogEntry } from "./storage";

export const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
export const TIERS = [
  { min: 0, name: "Tân binh" },
  { min: 10, name: "Thí sinh" },
  { min: 50, name: "Chiến binh tri thức" },
  { min: 150, name: "Chạm ngõ đường băng" },
  { min: 400, name: "Cao thủ Olympia" },
  { min: 1000, name: "Nhà vô địch" },
];

export interface Badge { id: string; title: string; desc: string }
export interface SubjectStat { cat: CategoryKey; done: number; right: number; next: number | null; reached: number }

const norm = (c: string): CategoryKey => ((c as string) === "hoa-sinh" ? "hoa" : (c as CategoryKey));

export function computeAchievements(log: QLogEntry[]) {
  const right = log.filter((e) => e.correctCount > 0);
  const subjects: SubjectStat[] = CATEGORY_ORDER.map((cat) => {
    const items = log.filter((e) => norm(e.category) === cat);
    const r = items.filter((e) => e.correctCount > 0).length;
    const reached = MILESTONES.filter((m) => r >= m).pop() ?? 0;
    return { cat, done: items.length, right: r, next: MILESTONES.find((m) => m > r) ?? null, reached };
  });
  const hard = right.filter((e) => (e.level ?? 0) >= 4).length;
  const beyond = right.filter((e) => (e.grade ?? -1) === 0).length;
  const topics = new Set(right.map((e) => e.topic).filter(Boolean)).size;
  const tier = [...TIERS].reverse().find((t) => right.length >= t.min)!;
  const nextTier = TIERS.find((t) => t.min > right.length) ?? null;
  const badges: Badge[] = [];
  for (const s of subjects) if (s.reached) badges.push({ id: `${s.cat}-${s.reached}`, title: `${CATEGORY_LABEL[s.cat]} · ${s.reached} câu`, desc: `Vượt qua ${s.reached} câu ${CATEGORY_LABEL[s.cat]}` });
  for (const m of [10, 50, 100, 250]) if (hard >= m) badges.push({ id: `hard-${m}`, title: `Đề khó · ${m}`, desc: `${m} câu độ khó 4-5 đã đúng` });
  for (const m of [10, 50, 100]) if (beyond >= m) badges.push({ id: `beyond-${m}`, title: `Ngoài sách vở · ${m}`, desc: `${m} câu ngoài chương trình đã đúng` });
  for (const m of [10, 25, 50]) if (topics >= m) badges.push({ id: `topics-${m}`, title: `Đa tài · ${m} chủ đề`, desc: `Đã đúng ở ${m} chủ đề khác nhau` });
  if (subjects.every((s) => s.right > 0)) badges.push({ id: "all-subjects", title: "Phủ sóng mọi phân môn", desc: "Đã đúng ít nhất một câu ở cả 13 phân môn" });
  return { total: log.length, right: right.length, hard, beyond, topics, tier, nextTier, subjects, badges };
}
