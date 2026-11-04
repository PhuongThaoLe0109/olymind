"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { sfx } from "@/lib/sfx";

/** Điểm số: đếm lên mượt, nhảy nhẹ và bay chữ +N / −N mỗi khi thay đổi. */
export function ScoreBadge({ score, className = "" }: { score: number; className?: string }) {
  const [shown, setShown] = useState(score);
  const [pulse, setPulse] = useState<{ id: number; delta: number } | null>(null);
  const prev = useRef(score);
  const idRef = useRef(0);

  useEffect(() => {
    const from = prev.current;
    if (score === from) return;
    prev.current = score;
    const delta = score - from;
    setPulse({ id: ++idRef.current, delta });
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 700);
      setShown(Math.round(from + delta * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const off = setTimeout(() => setPulse(null), 1400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(off);
    };
  }, [score]);

  return (
    <span className={`relative inline-block ${className}`} aria-label="Điểm" aria-live="polite">
      <span key={pulse?.id ?? 0} className={`inline-block tabular-nums ${pulse ? "anim-pop" : ""}`}>
        {shown} đ
      </span>
      {pulse && (
        <span
          key={`d${pulse.id}`}
          className={`anim-float pointer-events-none absolute -top-2 right-0 text-xl font-extrabold ${pulse.delta > 0 ? "text-green-300" : "text-bell"}`}
        >
          {pulse.delta > 0 ? "+" : "−"}
          {Math.abs(pulse.delta)}
        </span>
      )}
    </span>
  );
}

const CONFETTI = ["#F2BE48", "#FFE9A8", "#EF4444", "#38BDF8", "#34D399", "#F472B6"];

/** Cúp vinh quang giữa vòng nguyệt quế vàng, kèm pháo giấy. Hiện khi trả lời đúng tất cả. */
export function VictoryOverlay({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  useEffect(() => {
    sfx("victory");
  }, []);
  const leaves = useMemo(() => {
    const out: { x: number; y: number; ang: number; delay: number; s: number }[] = [];
    const cx = 200, cy = 215, r = 150, N = 15;
    for (const m of [-1, 1]) {
      for (let k = 0; k < N; k++) {
        const th = (100 + (k * 150) / (N - 1)) * (Math.PI / 180);
        const x = cx + m * r * Math.cos(th);
        const y = cy + r * Math.sin(th);
        const tangent = m < 0 ? th + Math.PI / 2 : Math.PI - (th + Math.PI / 2);
        const deg = (tangent * 180) / Math.PI;
        const s = 26 + 8 * Math.sin((Math.PI * k) / (N - 1));
        out.push({ x, y, ang: deg - 35, delay: 0.15 + k * 0.05, s });
        out.push({ x, y, ang: deg + 35, delay: 0.18 + k * 0.05, s: s * 0.9 });
      }
    }
    return out;
  }, []);
  const confetti = useMemo(
    () => Array.from({ length: 46 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 9) * 0.18, dur: 2.6 + (i % 5) * 0.4, color: CONFETTI[i % CONFETTI.length], w: 6 + (i % 4) * 2 })),
    [],
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      {confetti.map((c, i) => (
        <span key={i} className="anim-confetti pointer-events-none absolute -top-4 block rounded-[1px]" style={{ left: `${c.left}%`, width: c.w, height: c.w * 1.6, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }} />
      ))}
      <div className="relative flex max-w-full flex-col items-center px-4 text-center" onClick={(e) => e.stopPropagation()}>
        <svg viewBox="0 0 400 400" className="h-[min(70vw,380px)] w-[min(70vw,380px)] overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFE9A8" />
              <stop offset=".55" stopColor="#F2BE48" />
              <stop offset="1" stopColor="#B7791F" />
            </linearGradient>
            <linearGradient id="vshine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset=".5" stopColor="#fff" stopOpacity=".85" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <clipPath id="cupclip">
              <path d="M150 118h100v60q0 56-50 66q-50-10-50-66z" />
            </clipPath>
          </defs>
          {/* vòng nguyệt quế */}
          {leaves.map((l, i) => (
            <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.ang})`}>
              <path
                className="anim-leaf"
                style={{ animationDelay: `${l.delay}s`, transformBox: "fill-box", transformOrigin: "0% 50%" }}
                d={`M0 0Q${l.s * 0.45} ${-l.s * 0.32} ${l.s} 0Q${l.s * 0.45} ${l.s * 0.32} 0 0Z`}
                fill="url(#vg)"
                stroke="#7a4b0c"
                strokeWidth=".6"
              />
            </g>
          ))}
          {/* cúp */}
          <g className="anim-trophy" style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
            <path d="M150 118h100v60q0 56-50 66q-50-10-50-66z" fill="url(#vg)" stroke="#7a4b0c" strokeWidth="2" />
            <path d="M150 134h-30q-6 54 40 70" fill="none" stroke="url(#vg)" strokeWidth="10" strokeLinecap="round" />
            <path d="M250 134h30q6 54 -40 70" fill="none" stroke="url(#vg)" strokeWidth="10" strokeLinecap="round" />
            <rect x="188" y="244" width="24" height="38" fill="url(#vg)" stroke="#7a4b0c" strokeWidth="2" />
            <path d="M160 282h80l8 30h-96z" fill="url(#vg)" stroke="#7a4b0c" strokeWidth="2" />
            <rect x="150" y="312" width="100" height="14" rx="3" fill="#7a4b0c" />
            <path d="M200 140l9 20 22 2-17 14 5 22-19-12-19 12 5-22-17-14 22-2z" fill="#FFF4D6" opacity=".9" />
            <g clipPath="url(#cupclip)">
              <rect className="anim-shine" x="-60" y="110" width="50" height="150" fill="url(#vshine)" transform="skewX(-18)" />
            </g>
          </g>
        </svg>
        <h2 className="anim-rise text-3xl font-extrabold sm:text-4xl">{title}</h2>
        <p className="anim-rise mt-1 max-w-md text-paper/85" style={{ animationDelay: "1.1s" }}>{subtitle}</p>
        <button className="btn btn-gold anim-rise mt-4" style={{ animationDelay: "1.3s" }} onClick={onClose}>
          Tiếp tục
        </button>
      </div>
    </div>
  );
}
