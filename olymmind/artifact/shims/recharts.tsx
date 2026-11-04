import { Children, isValidElement, type ReactElement, type ReactNode } from "react";

type LineP = { dataKey: string; stroke?: string };
export const ResponsiveContainer = ({ children }: { children?: ReactNode }) => <div style={{ width: "100%", height: "100%" }}>{children}</div>;
export const Line = (_: LineP & Record<string, unknown>) => null;
export const CartesianGrid = () => null;
export const XAxis = () => null;
export const YAxis = () => null;
export const Tooltip = () => null;
export const Legend = () => null;

/** Biểu đồ đường tối giản vẽ bằng SVG, đủ cho biểu đồ điểm số theo câu. */
export function LineChart({ data, children }: { data: Record<string, number | string>[]; children?: ReactNode }) {
  const lines = Children.toArray(children).filter((c): c is ReactElement<LineP> => isValidElement(c) && (c.props as LineP).dataKey !== undefined);
  const W = 600, H = 240, L = 36, B = 22, T = 14, R = 12;
  const vals = lines.flatMap((l) => data.map((d) => Number(d[l.props.dataKey] ?? 0)));
  const lo = Math.min(0, ...vals), hi = Math.max(10, ...vals);
  const x = (i: number) => L + (data.length <= 1 ? 0 : (i * (W - L - R)) / (data.length - 1));
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);
  const ticks = [lo, lo + (hi - lo) / 2, hi];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Biến động điểm số">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity=".15" strokeDasharray="3 3" />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="currentColor" fillOpacity=".7">{Math.round(t)}</text>
        </g>
      ))}
      {lines.map((l, k) => (
        <polyline key={k} fill="none" stroke={l.props.stroke ?? "#F59E0B"} strokeWidth="2.5" strokeLinejoin="round" points={data.map((d, i) => `${x(i)},${y(Number(d[l.props.dataKey] ?? 0))}`).join(" ")} />
      ))}
    </svg>
  );
}
