"use client";

export function TimerBar({ remainingMs, totalMs }: { remainingMs: number | null; totalMs: number }) {
  if (remainingMs === null) return null;
  const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  const urgent = remainingMs < 5000;
  return (
    <div className="space-y-1">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-navy/10 dark:bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${urgent ? "bg-bell" : "bg-gold"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`text-right text-sm font-bold tabular-nums ${urgent ? "text-bell" : ""}`}>
        {(remainingMs / 1000).toFixed(1)}s
      </div>
    </div>
  );
}
