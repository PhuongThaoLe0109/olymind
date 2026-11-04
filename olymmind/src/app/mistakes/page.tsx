"use client";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadMistakes, removeMistake, reviewMistake, type Mistake } from "@/lib/storage";
import { CATEGORY_LABEL } from "@/lib/types";

export default function MistakesPage() {
  const [items, setItems] = useState<Mistake[] | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const refresh = () => setItems(loadMistakes());
  useEffect(refresh, []);

  const due = useMemo(() => (items ?? []).filter((m) => m.nextReviewAt <= Date.now()), [items]);
  const current = due[0];

  if (!items) return null;

  const answer = (remembered: boolean) => {
    if (!current) return;
    reviewMistake(current.id, remembered);
    setShowAnswer(false);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Sổ tay câu sai</h1>
        <p className="text-sm text-navy/70 dark:text-paper/70">
          Mọi câu sai hoặc bỏ lỡ được lưu tự động. Ôn theo hộp Leitner: nhớ thì lùi lịch ôn xa hơn, quên thì ôn lại ngay.
        </p>
      </div>

      {items.length === 0 && (
        <p>
          Chưa có câu nào. <Link href="/solo" className="font-semibold underline">Luyện Khởi động</Link> để bắt đầu.
        </p>
      )}

      {items.length > 0 && (
        <section className="card space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">Cần ôn hôm nay: {due.length}</span>
            <span className="text-navy/60 dark:text-paper/60">Tổng trong sổ: {items.length}</span>
          </div>
          {current ? (
            <>
              <span className="chip">{CATEGORY_LABEL[current.category]}</span>
              <p className="text-2xl font-semibold leading-snug">{current.content}</p>
              {showAnswer ? (
                <div className="space-y-3 rounded-xl bg-gold/10 p-4">
                  <p>
                    Đáp án: <strong className="text-gold">{current.answer}</strong>
                  </p>
                  <p>{current.explanation}</p>
                  {current.trivia && <p className="text-sm italic">Bạn có biết? {current.trivia}</p>}
                  <div className="flex gap-3">
                    <button className="btn btn-gold flex-1" onClick={() => answer(true)}>
                      Nhớ rồi
                    </button>
                    <button className="btn btn-ghost flex-1" onClick={() => answer(false)}>
                      Chưa nhớ
                    </button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-gold" onClick={() => setShowAnswer(true)}>
                  Hiện đáp án
                </button>
              )}
            </>
          ) : (
            <p className="font-semibold">Hôm nay bạn đã ôn xong. Quay lại vào ngày mai nhé!</p>
          )}
        </section>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((m) => (
            <li key={m.id} className="card flex items-start gap-3 !p-3 text-sm">
              <div className="flex-1">
                <div className="font-semibold">{m.content}</div>
                <div className="text-navy/60 dark:text-paper/60">
                  {m.answer} · sai {m.wrongCount} lần · hộp {m.box}
                </div>
              </div>
              <button
                className="btn btn-ghost !p-2"
                aria-label="Xóa khỏi sổ tay"
                onClick={() => {
                  removeMistake(m.id);
                  refresh();
                }}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
