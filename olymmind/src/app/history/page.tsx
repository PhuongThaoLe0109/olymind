"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadMatches, loadSessions } from "@/lib/storage";
import { ROUND_LABEL, ROUND_ORDER, type MatchSummary, type Session } from "@/lib/types";

export default function HistoryPage() {
  const [data, setData] = useState<{ sessions: Session[]; legacy: MatchSummary[] } | null>(null);
  useEffect(() => {
    const sessions = loadSessions();
    const ids = new Set(sessions.map((s) => s.summary?.id).filter(Boolean));
    setData({ sessions, legacy: loadMatches().filter((m) => !ids.has(m.id)) });
  }, []);

  if (!data) return null;
  const empty = data.sessions.length === 0 && data.legacy.length === 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Lịch sử ôn luyện</h1>
        <Link href="/subjects" className="underline">Phân môn đã làm qua →</Link>
      </div>
      {empty && (
        <p className="text-navy/70 dark:text-paper/70">
          Chưa có ván nào. <Link href="/play" className="font-semibold underline">Bắt đầu ôn luyện</Link> để có lịch sử.
        </p>
      )}
      <ul className="space-y-3">
        {data.sessions.map((s) => {
          const done = s.progress.results.length;
          const right = s.progress.results.filter((r) => r.correctPlayerIds.length > 0).length;
          const rounds = s.rounds.map((i) => ROUND_LABEL[ROUND_ORDER[i]]).join(" · ");
          return (
            <li key={s.id} className="card flex flex-wrap items-center justify-between gap-3">
              <Link href={`/history/${s.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-bold">
                  {s.status === "in-progress" ? <span className="chip !bg-gold/30">Dở dang</span> : <span className="chip">Đã xong</span>}
                  {s.progress.score} đ · đúng {right}/{done} câu{s.attempt > 1 ? ` · lần ${s.attempt}` : ""}
                </div>
                <div className="text-sm text-navy/60 dark:text-paper/60">{rounds}</div>
                <div className="text-sm text-navy/60 dark:text-paper/60">{new Date(s.updatedAt).toLocaleString("vi-VN")}</div>
              </Link>
              <div className="flex gap-2">
                {s.status === "in-progress" && <Link href={`/play?resume=${s.id}`} className="btn btn-gold !py-1.5">Làm tiếp</Link>}
                <Link href={`/play?redo=${s.id}`} className="btn btn-ghost !py-1.5">Làm lại</Link>
              </div>
            </li>
          );
        })}
        {data.legacy.map((m) => (
          <li key={m.id}>
            <Link href={`/history/${m.id}`} className="card flex items-center justify-between transition hover:border-gold">
              <div>
                <div className="font-bold">
                  {m.players[0]?.score ?? 0} đ · đúng {m.questions.filter((q) => q.correctPlayerIds.length > 0).length}/{m.questions.length} câu
                </div>
                <div className="text-sm text-navy/60 dark:text-paper/60">{new Date(m.finishedAt).toLocaleString("vi-VN")}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
