import type { Metadata } from "next";
import Link from "next/link";
import { Source_Sans_3 } from "next/font/google";
import { LaurelFrame } from "@/components/LaurelFrame";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import "./globals.css";

const ui = Source_Sans_3({ subsets: ["latin", "vietnamese"], weight: ["400", "600", "700"], variable: "--font-ui", display: "swap" });

export const metadata: Metadata = {
  title: "OlymMind — Ôn luyện & thi đấu Đường lên đỉnh Olympia",
  description: "Nền tảng ôn thi và thi đấu mô phỏng Đường lên đỉnh Olympia dành cho học sinh Việt Nam.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="dark">
      <body className={`${ui.variable} min-h-screen font-sans`}>
        <AnimatedBackground />
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" aria-label="OlymMind - trang chủ" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.svg" alt="" className="h-10 w-10" />
            <span className="bg-[image:var(--goldtext)] bg-clip-text text-2xl font-bold text-transparent drop-shadow">OlymMind</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link href="/play" className="btn btn-ghost !py-2">
              Ôn luyện
            </Link>
            <Link href="/mistakes" className="btn btn-ghost !py-2">
              Sổ tay
            </Link>
            <Link href="/history" className="btn btn-ghost !py-2">
              Lịch sử
            </Link>
            <Link href="/subjects" className="btn btn-ghost !py-2">
              Phân môn
            </Link>
            <Link href="/knowledge" className="btn btn-ghost !py-2">
              Kiến thức
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-10">
          <LaurelFrame>{children}</LaurelFrame>
        </main>
      </body>
    </html>
  );
}
