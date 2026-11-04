"use client";
import { Send } from "lucide-react";
import { useState } from "react";
import { BANK } from "@/lib/bank";
import { topicLabel } from "@/lib/curriculum";
import { CATEGORY_LABEL, CATEGORY_ORDER, type CategoryKey } from "@/lib/types";

const CATS = CATEGORY_ORDER;

export default function KnowledgePage() {
  const [cat, setCat] = useState<CategoryKey>("su");
  const [shown, setShown] = useState<Set<number>>(new Set());
  const items = BANK.map((q, i) => ({ q, i })).filter(({ q }) => q.category === cat);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Kho kiến thức</h1>
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button key={c} className={`btn ${c === cat ? "btn-gold" : "btn-ghost"} !py-1.5`} onClick={() => setCat(c)}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        {items.length === 0 && <p className="text-navy/60 dark:text-paper/60">Chưa có câu mẫu cho lĩnh vực này.</p>}
        {items.map(({ q, i }) => (
          <div key={i} className="card space-y-1">
            <p className="text-xs text-paper/60">{topicLabel(q.topic)} · khó {q.level}/5{q.grade === 0 ? " · ngoài sách giáo khoa" : ""}</p>
            <p className="font-semibold">{q.content}</p>
            {shown.has(i) ? (
              <>
                <p className="text-sm">
                  Đáp án: <strong className="text-gold">{q.answer}</strong>
                </p>
                <p className="text-sm">{q.explanation}</p>
                {q.trivia && <p className="text-sm italic text-navy/70 dark:text-paper/70">Bạn có biết? {q.trivia}</p>}
              </>
            ) : (
              <button className="btn btn-ghost !py-1" onClick={() => setShown(new Set(shown).add(i))}>
                Xem đáp án
              </button>
            )}
          </div>
        ))}
      </section>

      <TutorChat topic={CATEGORY_LABEL[cat]} />
    </div>
  );
}

function TutorChat({ topic }: { topic: string }) {
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    const next = [...msgs, { role: "user" as const, content: text.trim() }];
    setMsgs(next);
    setText("");
    setBusy(true);
    setErr(null);
    try {
      const local = (globalThis as { __olymChat?: (m: { role: string; content: string }[], topic: string) => Promise<string> }).__olymChat;
      if (local) {
        setMsgs([...next, { role: "assistant", content: await local(next, topic) }]);
        return;
      }
      const r = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, topic }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Có lỗi xảy ra.");
      setMsgs([...next, { role: "assistant", content: d.reply }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Có lỗi xảy ra.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-3">
      <h2 className="font-bold">Gia sư AI · {topic}</h2>
      <p className="text-xs text-navy/60 dark:text-paper/60">Câu trả lời do AI sinh, có thể sai. Hãy đối chiếu với sách giáo khoa.</p>
      <div className="space-y-2">
        {msgs.map((m, i) => (
          <p key={i} className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-gold/15" : "bg-navy/5 dark:bg-white/5"}`}>
            {m.content}
          </p>
        ))}
      </div>
      {err && <p className="text-sm font-semibold text-bell">{err}</p>}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim() && !busy) void send();
        }}
      >
        <input className="input" placeholder="Hỏi hoặc xin câu hỏi luyện tập" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn btn-gold" disabled={busy || !text.trim()} aria-label="Gửi">
          <Send size={16} />
        </button>
      </form>
    </section>
  );
}
