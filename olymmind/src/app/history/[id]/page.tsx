"use client";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { loadMatch, loadSession, deleteSession } from "@/lib/storage";
import { CATEGORY_LABEL, ROUND_LABEL, type MatchSummary, type QuestionResult, type Session } from "@/lib/types";

const COLORS = ["#F59E0B", "#EF4444", "#38BDF8", "#34D399"];

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<MatchSummary | null | undefined>(undefined);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const s = loadSession(params.id);
    setSession(s);
    setMatch(s ? s.summary : loadMatch(params.id));
  }, [params.id]);

  const myId = match?.players[0]?.id ?? null;
  if (match === undefined) return null;
  if (match === null && session) return <Unfinished session={session} />;
  if (match === null) {
    return (
      <p>
        Không tìm thấy trận đấu. <Link href="/history" className="underline">Quay lại lịch sử</Link>
      </p>
    );
  }

  // Dữ liệu biểu đồ: mỗi dòng là điểm của các thí sinh sau câu thứ n
  const data = [
    { q: 0, ...Object.fromEntries(match.players.map((p) => [p.name, 0])) },
    ...match.timeline.map((t) => ({
      q: t.index + 1,
      label: t.label,
      ...Object.fromEntries(match.players.map((p) => [p.name, t.scores[p.id] ?? 0])),
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/history" className="text-sm underline">
          ← Lịch sử
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold">Lượt ôn {new Date(match.finishedAt).toLocaleDateString("vi-VN")}</h1>
        <p className="text-sm text-paper/70">{new Date(match.finishedAt).toLocaleTimeString("vi-VN")}{session && session.attempt > 1 ? ` · lần làm thứ ${session.attempt}` : ""}</p>
        {session && (
          <Link href={`/play?redo=${session.id}`} className="btn btn-gold mt-3 inline-flex">Làm lại bộ đề này</Link>
        )}
      </div>

      <section className="card">
        <h2 className="font-bold">Tổng điểm</h2>
        <p className="text-4xl font-extrabold tabular-nums text-gold-light">{match.players[0]?.score ?? 0} đ</p>
      </section>

      <section className="card">
        <h2 className="mb-3 font-bold">Biến động điểm số</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="q" label={{ value: "Sau mốc", position: "insideBottom", offset: -2 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              {match.players.map((p, i) => (
                <Line key={p.id} type="monotone" dataKey={p.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <Replay match={match} />

      <section className="card space-y-3">
        <h2 className="font-bold">Từng câu hỏi</h2>
        {match.questions.map((q, i) => {
          const iGotIt = myId ? q.correctPlayerIds.includes(myId) : false;
          const who = q.correctPlayerIds.map((id) => match.players.find((p) => p.id === id)?.name).filter(Boolean);
          return (
            <div key={i} className="rounded-xl border border-navy/10 p-3 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold">Câu {i + 1}</span>
                <span className="chip">{ROUND_LABEL[q.round]}</span>
                <span className="chip">{CATEGORY_LABEL[q.category]}</span>
                <span className="ml-auto">{iGotIt ? <Check className="text-green-500" size={18} /> : <X className="text-bell" size={18} />}</span>
              </div>
              <p className="mt-1 font-semibold">{q.content}</p>
              {q.userAnswer !== undefined && (
                <p className="text-sm">Bạn trả lời: <strong>{q.userAnswer || "(bỏ trống)"}</strong></p>
              )}
              <p className="text-sm">
                Đáp án: <strong className="text-gold">{q.answer}</strong> · {who.length ? `Đúng: ${who.join(", ")}` : "Không ai đúng"}
              </p>
              <p className="text-sm text-navy/70 dark:text-paper/70">{q.explanation}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}

const EVENT_LABEL: Record<string, string> = {
  round: "Vòng thi", turn: "Lượt", question: "Câu hỏi", answer: "Trả lời", buzz: "Bấm chuông", pick: "Chọn gói",
  star: "Ngôi sao hy vọng", steal: "Cướp điểm", cnv: "Đoán từ khóa", reveal: "Đáp án", score: "Điểm", tiebreak: "Câu hỏi phụ",
};

/** Phát lại trận: kéo thanh trượt để xem diễn biến theo thứ tự sự kiện, kèm điểm tại thời điểm đó. */
function Replay({ match }: { match: MatchSummary }) {
  const events = match.events ?? [];
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setI((x) => (x + 1 >= events.length ? (setPlaying(false), x) : x + 1)), 500);
    return () => clearInterval(id);
  }, [playing, events.length]);

  const scores = useMemo(() => {
    for (let k = Math.min(i, events.length - 1); k >= 0; k--) if (events[k].scores) return events[k].scores!;
    return {} as Record<string, number>;
  }, [i, events]);
  if (!events.length) return null;
  const e = events[Math.min(i, events.length - 1)];
  const name = (id?: string) => match.players.find((p) => p.id === id)?.name;
  return (
    <section className="card space-y-3">
      <h2 className="font-bold">Phát lại trận đấu</h2>
      <div className="flex items-center gap-3">
        <button className="btn btn-gold !py-1.5" onClick={() => (i + 1 >= events.length ? (setI(0), setPlaying(true)) : setPlaying(!playing))}>
          {playing ? "Tạm dừng" : "Phát"}
        </button>
        <input type="range" className="w-full" min={0} max={events.length - 1} value={i} onChange={(ev) => setI(Number(ev.target.value))} />
        <span className="text-xs tabular-nums">{(e.t / 1000).toFixed(0)}s</span>
      </div>
      <p className="rounded-lg bg-gold/10 px-3 py-2 text-sm">
        <strong>{EVENT_LABEL[e.type] ?? e.type}</strong>
        {name(e.playerId) ? ` · ${name(e.playerId)}` : ""}
        {e.text ? ` · ${e.text}` : ""}
        {e.correct !== undefined ? (e.correct ? " · đúng" : " · sai") : ""}
        {e.delta ? ` · ${e.delta > 0 ? "+" : ""}${e.delta}` : ""}
      </p>
      <div className="flex flex-wrap gap-3 text-sm font-semibold">
        {match.players.map((p) => (
          <span key={p.id}>
            {p.name}: {scores[p.id] ?? 0}
          </span>
        ))}
      </div>
    </section>
  );
}

/** Ván dở dang: xem tiến độ từng câu, làm tiếp hoặc làm lại từ đầu. */
function Unfinished({ session }: { session: Session }) {
  const done: QuestionResult[] = session.progress.results;
  const me = session.progress.timeline.length ? Object.keys(session.progress.timeline[0].scores)[0] : null;
  return (
    <div className="space-y-6">
      <div>
        <Link href="/history" className="text-sm underline">← Lịch sử</Link>
        <h1 className="mt-1 text-2xl font-extrabold">Ván dở dang</h1>
        <p className="text-sm text-paper/70">
          Cập nhật {new Date(session.updatedAt).toLocaleString("vi-VN")} · {done.length} câu đã xong · {session.progress.score} đ
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href={`/play?resume=${session.id}`} className="btn btn-gold">Làm tiếp</Link>
          <Link href={`/play?redo=${session.id}`} className="btn btn-ghost">Làm lại từ đầu</Link>
          <button className="btn btn-ghost" onClick={() => { deleteSession(session.id); window.location.href = "/history"; }}>Xóa ván này</button>
        </div>
      </div>
      <section className="card space-y-3">
        <h2 className="font-bold">Tiến độ từng câu</h2>
        {done.length === 0 && <p className="text-sm text-paper/70">Chưa xong câu nào.</p>}
        {done.map((q, i) => {
          const ok = me ? q.correctPlayerIds.includes(me) : q.correctPlayerIds.length > 0;
          return (
            <div key={i} className="rounded-xl border border-navy/10 p-3 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold">Câu {i + 1}</span>
                <span className="chip">{ROUND_LABEL[q.round]}</span>
                <span className="chip">{CATEGORY_LABEL[q.category]}</span>
                <span className="ml-auto">{ok ? <Check className="text-green-500" size={18} /> : <X className="text-bell" size={18} />}</span>
              </div>
              <p className="mt-1 font-semibold">{q.content}</p>
              {q.userAnswer !== undefined && <p className="text-sm">Bạn trả lời: <strong>{q.userAnswer || "(bỏ trống)"}</strong></p>}
              <p className="text-sm">Đáp án: <strong className="text-gold">{q.answer}</strong></p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
