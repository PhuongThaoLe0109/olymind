"use client";
import { useEffect, useRef } from "react";

/** Nền sân khấu: núi đa giác lung linh, mặt sàn phản chiếu, hạt đỏ bay lên, vệt sáng chéo. */
export function AnimatedBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current!;
    const cx = cv.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, raf = 0;
    type Tri = { p: number[][]; l: number; ph: number; k: number };
    let tris: Tri[] = [];
    let parts: { x: number; y: number; s: number; v: number; t: number }[] = [];
    const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    function build() {
      W = cv.width = innerWidth * dpr;
      H = cv.height = innerHeight * dpr;
      tris = [];
      const r = rng(7), cols = 14, rows = 5, hz = H * 0.74;
      const pts: number[][][] = [];
      for (let j = 0; j <= rows; j++) {
        pts[j] = [];
        for (let i = 0; i <= cols; i++) {
          const x = (i / cols) * W * 1.1 - W * 0.05 + (r() - 0.5) * (W / cols) * 0.6;
          const base = j / rows;
          const ridge = Math.pow(Math.sin(i * 0.9 + 1) * 0.5 + 0.5, 1.4) * 0.6 + Math.sin(i * 2.3) * 0.12 + 0.28;
          const y = hz - (1 - base) * ridge * H * 0.34 * (0.5 + r() * 0.8) + (r() - 0.5) * H * 0.02;
          pts[j][i] = [x, Math.min(y, hz)];
        }
      }
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
          const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i], d = pts[j + 1][i + 1];
          tris.push({ p: [a, b, c], l: r(), ph: r() * 6.28, k: j / rows });
          tris.push({ p: [b, d, c], l: r(), ph: r() * 6.28, k: j / rows });
        }
      parts = Array.from({ length: 70 }, () => ({
        x: Math.random() * W, y: Math.random() * H, s: (0.6 + Math.random() * 1.6) * dpr,
        v: (8 + Math.random() * 22) * dpr, t: Math.random() * 6.28,
      }));
    }

    function poly(t: Tri, tm: number, flip: boolean) {
      const lum = t.l * 0.5 + Math.sin(tm * 0.5 + t.ph) * 0.12 + 0.2 + t.k * 0.18;
      cx.fillStyle = `hsl(${285 + t.l * 55 - t.k * 10},${48 + t.l * 25}%,${12 + lum * 34}%)`;
      cx.beginPath();
      t.p.forEach((p, i) => {
        const y = flip ? 2 * H * 0.74 - p[1] : p[1];
        if (i) cx.lineTo(p[0], y); else cx.moveTo(p[0], y);
      });
      cx.closePath();
      cx.fill();
    }

    const t0 = performance.now();
    function frame(now: number) {
      const tm = reduce ? 0 : (now - t0) / 1000, hz = H * 0.74;
      const g = cx.createRadialGradient(W * 0.55, H * 0.28, 0, W * 0.55, H * 0.28, H * 0.95);
      g.addColorStop(0, "#8A1F66"); g.addColorStop(0.45, "#4A0F4A"); g.addColorStop(1, "#1A0623");
      cx.globalAlpha = 1; cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      const sx = ((tm * 18) % (W * 1.6)) - W * 0.3;
      const lg = cx.createLinearGradient(sx, 0, sx + W * 0.35, H * 0.55);
      lg.addColorStop(0, "rgba(255,230,180,0)"); lg.addColorStop(0.5, "rgba(255,230,180,.16)"); lg.addColorStop(1, "rgba(255,230,180,0)");
      cx.strokeStyle = lg; cx.lineWidth = 1.5 * dpr; cx.beginPath(); cx.moveTo(sx, 0); cx.lineTo(sx + W * 0.35, H * 0.55); cx.stroke();
      tris.forEach((t) => poly(t, tm, false));
      const fl = cx.createLinearGradient(0, hz, 0, H); fl.addColorStop(0, "#2B0B35"); fl.addColorStop(1, "#12041A");
      cx.fillStyle = fl; cx.fillRect(0, hz, W, H - hz);
      cx.save(); cx.beginPath(); cx.rect(0, hz, W, H - hz); cx.clip(); cx.globalAlpha = 0.22;
      tris.forEach((t) => poly(t, tm, true));
      cx.restore(); cx.globalAlpha = 1;
      const hg = cx.createLinearGradient(0, hz - 6 * dpr, 0, hz + 30 * dpr);
      hg.addColorStop(0, "rgba(255,170,90,0)"); hg.addColorStop(0.2, "rgba(255,170,90,.22)"); hg.addColorStop(1, "rgba(255,170,90,0)");
      cx.fillStyle = hg; cx.fillRect(0, hz - 6 * dpr, W, 36 * dpr);
      parts.forEach((p) => {
        if (!reduce) {
          p.y -= p.v * 0.016; p.x += Math.sin(tm + p.t) * 0.2 * dpr;
          if (p.y < -5) { p.y = H * 0.8; p.x = Math.random() * W; }
        }
        cx.fillStyle = `rgba(255,70,60,${(0.35 + 0.65 * Math.abs(Math.sin(tm * 1.3 + p.t))).toFixed(2)})`;
        cx.beginPath(); cx.arc(p.x, p.y, p.s, 0, 6.283); cx.fill();
      });
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    const onResize = () => { build(); if (reduce) raf = requestAnimationFrame(frame); };
    build();
    raf = requestAnimationFrame(frame);
    addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="fixed inset-0 -z-10 h-full w-full" />;
}
