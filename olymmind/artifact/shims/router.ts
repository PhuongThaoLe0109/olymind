// Bộ định tuyến trong bộ nhớ cho bản artifact: địa chỉ chỉ giữ tên màn hình (#play, #history...), tham số nằm trong bộ nhớ.
import { useEffect, useState } from "react";

const NAME2PATH: Record<string, string> = { home: "/", play: "/play", history: "/history", subjects: "/subjects", mistakes: "/mistakes", knowledge: "/knowledge", solo: "/solo" };
const first = (p: string) => "/" + (p.split("/")[1] ?? "");

function fromHash(): string {
  const n = (typeof location !== "undefined" ? location.hash : "").replace(/^#/, "");
  return NAME2PATH[n] ?? "/";
}
let current = fromHash();
const subs = new Set<() => void>();

export function navigate(href: string) {
  current = href;
  const name = Object.entries(NAME2PATH).find(([, p]) => p === first(href.split("?")[0]))?.[0] ?? "home";
  try {
    history.replaceState(null, "", name === "home" ? location.pathname + location.search : `#${name}`);
  } catch {
    /* bỏ qua */
  }
  subs.forEach((f) => f());
  if (typeof window !== "undefined") window.scrollTo(0, 0);
}
export function hrefFor(path: string) {
  const name = Object.entries(NAME2PATH).find(([, p]) => p === first(path.split("?")[0]))?.[0] ?? "home";
  return name === "home" ? "#" : `#${name}`;
}
export function useLocation() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    subs.add(f);
    const onHash = () => { current = fromHash(); f(); };
    window.addEventListener("hashchange", onHash);
    return () => { subs.delete(f); window.removeEventListener("hashchange", onHash); };
  }, []);
  const [path, q] = current.split("?");
  return { path, query: new URLSearchParams(q ?? "") };
}
