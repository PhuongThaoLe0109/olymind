"use client";
import { Check, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { topicLabel, topicsOf } from "@/lib/curriculum";
import { computeAchievements } from "@/lib/achievements";
import { loadQLog, type QLogEntry } from "@/lib/storage";
import { CATEGORY_LABEL, CATEGORY_ORDER, type CategoryKey } from "@/lib/types";

type Filter = "all" | "right" | "wrong";

export default function SubjectsPage() {
  const [log, setLog] = useState<QLogEntry[] | null>(null);
  const [open, setOpen] = useState<CategoryKey | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  useEffect(() => setLog(loadQLog()), []);

  const groups = useMemo(() => {
    const m = new Map<CategoryKey, QLogEntry[]>();
    for (const e of log ?? []) {
      // dữ liệu cũ dùng "hoa-sinh": gom vào Hóa học
      const k = (e.category as string) === "hoa-sinh" ? "hoa" : e.category;
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return m;
  }, [log]);

  if (!log) return null;
  const ach = computeAchievements(log);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Phân môn đã làm qua</h1>
        <Link href="/history" className="underline">Lịch sử ván →</Link>
      </div>
      <p className="text-sm text-paper/70">
        Tổng {log.length} câu khác nhau đã làm. Câu đã làm sẽ không xuất hiện lại trong ván mới, nhưng bạn xem lại được ở đây.
      </p>
      <section className="card space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-extrabold text-gold-light">Thành tích: {ach.tier.name}</h2>
          <span className="text-sm text-paper/70">
            {ach.right} câu đã vượt qua{ach.nextTier ? ` · còn ${ach.nextTier.min - ach.right} câu tới "${ach.nextTier.name}"` : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="chip">Đề khó (4-5): {ach.hard}</span>
          <span className="chip">Ngoài sách vở: {ach.beyond}</span>
          <span className="chip">Chủ đề đã đúng: {ach.topics}</span>
        </div>
        {ach.badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ach.badges.map((b) => (
              <span key={b.id} title={b.desc} className="chip !bg-gold/20">🏅 {b.title}</span>
            ))}
          </div>
        )}
      </section>
      <div className="flex gap-2 text-sm">
        {([["all", "Tất cả"], ["right", "Làm đúng"], ["wrong", "Làm sai"]] as const).map(([v, t]) => (
          <button key={v} className={`chip ${filter === v ? "!bg-gold/30" : ""}`} onClick={() => setFilter(v)}>{t}</button>
        ))}
      </div>
      <ul className="space-y-3">
        {CATEGORY_ORDER.map((cat) => {
          const items = groups.get(cat) ?? [];
          const right = items.filter((e) => e.lastCorrect).length;
          const shown = items.filter((e) => (filter === "all" ? true : filter === "right" ? e.lastCorrect : !e.lastCorrect));
          const byTopic = new Map<string, number>();
          for (const e of items) byTopic.set(e.topic ?? "", (byTopic.get(e.topic ?? "") ?? 0) + 1);
          const isOpen = open === cat;
          return (
            <li key={cat} className="card !p-0">
              <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => setOpen(isOpen ? null : cat)} aria-expanded={isOpen}>
                <span>
                  <b className="text-gold-light">{CATEGORY_LABEL[cat]}</b>
                  <span className="block text-sm text-paper/70">
                    {items.length === 0 ? "Chưa làm câu nào" : `Bạn đã làm ${items.length} câu, đúng ${right}`}
                    {topicsOf(cat).length ? ` · ${byTopic.size}/${topicsOf(cat).length} chủ đề` : ""}
                    {(() => { const st = ach.subjects.find((x) => x.cat === cat)!; return st.next ? ` · mốc kế: ${st.right}/${st.next}` : " · đã đạt mốc cao nhất"; })()}
                  </span>
                </span>
                <ChevronDown size={18} className={isOpen ? "rotate-180" : ""} />
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-white/10 px-4 py-3">
                  {items.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {[...byTopic.entries()].map(([t, n]) => (
                        <span key={t} className="chip">{t ? topicLabel(t) : "Khác"}: {n}</span>
                      ))}
                    </div>
                  )}
                  {shown.length === 0 && <p className="text-sm text-paper/70">Không có câu nào.</p>}
                  {shown.map((e) => (
                    <details key={e.fp} className="rounded-xl border border-white/10 p-3">
                      <summary className="flex cursor-pointer items-start gap-2">
                        {e.lastCorrect ? <Check className="mt-0.5 shrink-0 text-green-500" size={18} /> : <X className="mt-0.5 shrink-0 text-bell" size={18} />}
                        <span className="font-semibold">{e.content}</span>
                      </summary>
                      <div className="mt-2 space-y-1 pl-7 text-sm">
                        {e.items && <p className="text-paper/70">{e.items.join(" · ")}</p>}
                        {e.lastUserAnswer !== undefined && <p>Bạn trả lời: <strong>{e.lastUserAnswer || "(bỏ trống)"}</strong></p>}
                        <p>Đáp án: <strong className="text-gold">{e.answer}</strong></p>
                        {e.explanation && <p className="text-paper/70">{e.explanation}</p>}
                        {e.trivia && <p className="text-paper/60">Thêm: {e.trivia}</p>}
                        <p className="text-xs text-paper/50">
                          {e.topic ? `${topicLabel(e.topic)} · ` : ""}Làm {e.attempts} lần, đúng {e.correctCount} · {new Date(e.lastAt).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
