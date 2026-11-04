// Bộ sinh số ngẫu nhiên theo seed (để cùng seed cho cùng kết quả) và vài hàm tiện ích.
export type Rnd = () => number;

export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(a: number): Rnd {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const seeded = (seed: string): Rnd => mulberry32(hashSeed(seed));
/** Seed ngẫu nhiên thật (không lặp giữa các lần gọi). */
export function freshSeed(): string {
  const a = new Uint32Array(3);
  globalThis.crypto.getRandomValues(a);
  return Array.from(a, (x) => x.toString(36)).join("") + Date.now().toString(36);
}

export const int = (r: Rnd, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
export const pick = <T,>(r: Rnd, a: readonly T[]): T => a[Math.floor(r() * a.length)];
export function shuffle<T>(arr: readonly T[], r: Rnd): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function sample<T>(arr: readonly T[], k: number, r: Rnd): T[] {
  return shuffle(arr, r).slice(0, k);
}
