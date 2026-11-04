import { createRoot } from "react-dom/client";
import { useEffect } from "react";
import Link from "next/link";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { LaurelFrame } from "@/components/LaurelFrame";
import { SoundToggle } from "@/components/SoundToggle";
import HomePage from "@/app/page";
import PlayPage from "@/app/play/page";
import HistoryPage from "@/app/history/page";
import MatchDetailPage from "@/app/history/[id]/page";
import SubjectsPage from "@/app/subjects/page";
import MistakesPage from "@/app/mistakes/page";
import KnowledgePage from "@/app/knowledge/page";
import SoloPage from "@/app/solo/page";
import { useLocation } from "./shims/router";
import { generatePlan } from "@/lib/generate";
import { freshSeed } from "@/lib/rng";

function Routes() {
  const { path } = useLocation();
  if (path.startsWith("/history/")) return <MatchDetailPage params={{ id: path.split("/")[2] }} />;
  switch (path) {
    case "/play": return <PlayPage />;
    case "/history": return <HistoryPage />;
    case "/subjects": return <SubjectsPage />;
    case "/mistakes": return <MistakesPage />;
    case "/knowledge": return <KnowledgePage />;
    case "/solo": return <SoloPage />;
    default: return <HomePage />;
  }
}

function App() {
  const { path } = useLocation();
  useEffect(() => { document.title = "OlymMind"; }, []);
  const nav = (href: string, label: string) => (
    <Link href={href} className={`btn btn-ghost !py-2 ${path === href ? "!bg-gold/25" : ""}`}>{label}</Link>
  );
  return (
    <>
      <AnimatedBackground />
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 py-4">
        <Link href="/" aria-label="OlymMind - trang chủ" className="flex items-center gap-2">
          <span className="bg-[image:var(--goldtext)] bg-clip-text text-2xl font-bold text-transparent drop-shadow">OlymMind</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {nav("/play", "Ôn luyện")}
          {nav("/history", "Lịch sử")}
          {nav("/subjects", "Phân môn")}
          {nav("/mistakes", "Sổ tay")}
          {nav("/knowledge", "Kiến thức")}
          <SoundToggle />
        </nav>
      </header>
      <main className="mx-auto max-w-6xl pb-10">
        <LaurelFrame><Routes /></LaurelFrame>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

// Sinh đề mới bằng Claude ngay trong trang (capability sample). Không có thì trang vẫn chạy bằng kho câu hỏi và bộ sinh thuật toán.
type Claude = { use?: (n: string) => Promise<unknown> };
void (async () => {
  try {
    const claude = (window as unknown as { claude?: Claude }).claude;
    const sample = (await claude?.use?.("sample")) as ((input: string, opts?: Record<string, unknown>) => Promise<{ text: string }>) | null | undefined;
    if (!sample) return;
    const ask = async (system: string, user: string) => (await sample(`${system}\n\n${user}`, { cache: false })).text;
    (globalThis as Record<string, unknown>).__olymChat = async (msgs: { role: string; content: string }[], topic: string) =>
      (await sample(
        `Bạn là gia sư ôn thi Đường lên đỉnh Olympia cho học sinh lớp 12, chủ đề "${topic}". Trả lời ngắn gọn, chính xác, tiếng Việt. Khi được xin câu hỏi luyện tập, ra câu khó, ngoài sách giáo khoa, đáp án ngắn và nêu đáp án ở cuối.\n\nHội thoại:\n` +
          msgs.map((m) => `${m.role === "user" ? "Học sinh" : "Gia sư"}: ${m.content}`).join("\n") +
          "\nGia sư:",
        { cache: false },
      )).text;
    (globalThis as Record<string, unknown>).__olymGenerate = ({ seen, shift }: { seen: never; shift: number }) =>
      generatePlan({ seed: freshSeed(), useAI: true, seen, shift, ask });
  } catch {
    /* không có capability */
  }
})();
