import { createElement, forwardRef } from "react";

const DROP = new Set(["initial", "animate", "exit", "transition", "whileHover", "whileTap", "whileInView", "layout", "variants", "viewport"]);
const cache: Record<string, unknown> = {};
function make(tag: string) {
  return (cache[tag] ??= forwardRef<HTMLElement, Record<string, unknown>>(function M(props, ref) {
    const p: Record<string, unknown> = {};
    for (const k in props) if (!DROP.has(k)) p[k] = props[k];
    p.className = `${(props.className as string) ?? ""} anim-in`.trim();
    return createElement(tag, { ...p, ref });
  }));
}
export const motion = new Proxy({} as Record<string, never>, { get: (_t, tag: string) => make(tag) }) as unknown as Record<string, React.ComponentType<Record<string, unknown>>>;
export const AnimatePresence = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
