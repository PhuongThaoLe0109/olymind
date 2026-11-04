"use client";
import { useEffect, useRef } from "react";

/** Vòng nguyệt quế vàng bao quanh khung nội dung chính (hở ở giữa cạnh trên và cạnh dưới). */
export function LaurelFrame({ children }: { children: React.ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const fr = frame.current!, svg = svgRef.current!;
    const NS = "http://www.w3.org/2000/svg";
    let raf = 0, lw = 0, lh = 0;
    const el = (n: string, a: Record<string, string | number>) => {
      const e = document.createElementNS(NS, n);
      for (const k in a) e.setAttribute(k, String(a[k]));
      return e;
    };
    function draw() {
      const w = fr.clientWidth, h = fr.clientHeight;
      if (w === lw && h === lh) return;
      lw = w; lh = h;
      svg.setAttribute("width", String(w)); svg.setAttribute("height", String(h)); svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const defs = el("defs", {}), g = el("linearGradient", { id: "lg", gradientUnits: "userSpaceOnUse", x1: 0, y1: 0, x2: 0, y2: h });
      [["0", "#FFE9A8"], [".55", "#F2BE48"], ["1", "#B7791F"]].forEach(([o, c]) => g.appendChild(el("stop", { offset: o, "stop-color": c })));
      defs.appendChild(g); svg.appendChild(defs);
      const narrow = w < 520, ins = narrow ? 11 : 15, r = narrow ? 18 : 26, cx = w / 2, L = narrow ? 11 : 15;
      for (const m of [-1, 1]) {
        const X = (x: number) => (m < 0 ? x : w - x);
        const d = `M${X(cx - 26)} ${h - ins} H${X(ins + r)} Q${X(ins)} ${h - ins} ${X(ins)} ${h - ins - r} V${ins + r} Q${X(ins)} ${ins} ${X(ins + r)} ${ins} H${X(cx - 62)}`;
        const p = el("path", { d, fill: "none", stroke: "url(#lg)", "stroke-width": 1.6, "stroke-linecap": "round" }) as SVGPathElement;
        svg.appendChild(p);
        const len = p.getTotalLength(), step = L * 1.15;
        const leaf = (s: number, x: number, y: number, ang: number) =>
          el("path", { d: `M0 0Q${s * 0.45} ${-s * 0.3} ${s} 0Q${s * 0.45} ${s * 0.3} 0 0Z`, fill: "url(#lg)", transform: `translate(${x} ${y}) rotate(${ang})` });
        for (let t = 6; t < len - 4; t += step) {
          const a = p.getPointAtLength(t), b = p.getPointAtLength(Math.min(len, t + 2));
          const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
          const sz = L * (0.75 + 0.35 * Math.sin((Math.PI * t) / len));
          for (const o of [-38, 38]) svg.appendChild(leaf(sz, a.x, a.y, ang + o));
        }
        const e = p.getPointAtLength(len), e2 = p.getPointAtLength(len - 2);
        svg.appendChild(leaf(L * 1.2, e.x, e.y, (Math.atan2(e.y - e2.y, e.x - e2.x) * 180) / Math.PI));
      }
      svg.appendChild(el("circle", { cx, cy: h - ins, r: 4, fill: "url(#lg)" }));
    }
    const sched = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
    const ro = new ResizeObserver(sched);
    ro.observe(fr);
    sched();
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div ref={frame} className="relative flex min-h-[calc(100vh-190px)] flex-col px-[26px] py-[26px] sm:px-[42px] sm:py-[34px]">
      <svg ref={svgRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 overflow-visible" />
      <div className="relative z-[1] flex flex-1 flex-col justify-center">{children}</div>
    </div>
  );
}
