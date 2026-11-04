"use client";
// Âm thanh tổng hợp bằng Web Audio (không cần file âm thanh): hiệu ứng đúng/sai, chuông, đếm giờ, fanfare
// và nhạc nền kịch tính kiểu sân khấu thi đấu. Chỉ bắt đầu sau lần chạm đầu tiên của người dùng.

type Name = "correct" | "wrong" | "tick" | "tickFast" | "bell" | "start" | "point" | "lose" | "victory" | "finish" | "star" | "click";
type Mood = "calm" | "tense";

const KEY = "olymmind:audio";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxOn = true;
let musicOn = true;
let mood: Mood = "calm";
let timer: ReturnType<typeof setInterval> | null = null;
let nextT = 0;
let step = 0;
const listeners = new Set<() => void>();

try {
  const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
  if (raw) {
    const o = JSON.parse(raw) as { sfx?: boolean; music?: boolean };
    sfxOn = o.sfx !== false;
    musicOn = o.music !== false;
  }
} catch {
  /* bỏ qua */
}
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ sfx: sfxOn, music: musicOn }));
  } catch {
    /* bỏ qua */
  }
  listeners.forEach((f) => f());
};

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = musicOn ? 0.5 : 0;
    musicGain.connect(master);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

function tone(f: number, t: number, dur: number, opt: { type?: OscillatorType; vol?: number; to?: number; attack?: number; dest?: AudioNode } = {}) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opt.type ?? "sine";
  o.frequency.setValueAtTime(f, t);
  if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t + dur);
  const v = opt.vol ?? 0.2;
  const a = opt.attack ?? 0.008;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(opt.dest ?? master!);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function bellTone(f: number, t: number, dur = 1.4, vol = 0.18) {
  // chuông kim loại: tổng các thành phần không điều hòa
  for (const [r, v] of [[1, 1], [2.76, 0.6], [5.4, 0.35], [8.93, 0.2]] as const) tone(f * r, t, dur / (0.6 + r * 0.25), { vol: vol * v, attack: 0.002 });
}

export function sfx(name: Name) {
  if (!sfxOn) return;
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (name) {
    case "click":
      tone(900, t, 0.05, { type: "triangle", vol: 0.08 });
      break;
    case "tick":
      tone(1200, t, 0.04, { type: "square", vol: 0.05 });
      break;
    case "tickFast":
      tone(1800, t, 0.06, { type: "square", vol: 0.09 });
      break;
    case "bell":
      bellTone(880, t, 1.2, 0.2);
      break;
    case "start":
      [60, 64, 67, 72].forEach((m, i) => tone(hz(m), t + i * 0.09, 0.5, { type: "triangle", vol: 0.14 }));
      bellTone(hz(84), t + 0.3, 1.2, 0.08);
      break;
    case "correct":
      tone(hz(76), t, 0.18, { type: "triangle", vol: 0.2 });
      tone(hz(83), t + 0.1, 0.5, { type: "triangle", vol: 0.22 });
      tone(hz(88), t + 0.1, 0.6, { type: "sine", vol: 0.1 });
      bellTone(hz(95), t + 0.12, 0.8, 0.05);
      break;
    case "wrong":
      tone(220, t, 0.35, { type: "sawtooth", vol: 0.13, to: 110 });
      tone(165, t + 0.12, 0.4, { type: "sawtooth", vol: 0.11, to: 82 });
      break;
    case "point":
      tone(hz(88), t, 0.07, { type: "square", vol: 0.07 });
      tone(hz(95), t + 0.07, 0.22, { type: "square", vol: 0.07 });
      break;
    case "star":
      [72, 76, 79, 84, 88].forEach((m, i) => tone(hz(m), t + i * 0.06, 0.4, { type: "sine", vol: 0.12 }));
      break;
    case "lose":
      [64, 62, 60, 55].forEach((m, i) => tone(hz(m), t + i * 0.18, 0.5, { type: "triangle", vol: 0.14 }));
      break;
    case "finish":
      [60, 64, 67, 72, 67, 72].forEach((m, i) => tone(hz(m), t + i * 0.12, 0.55, { type: "triangle", vol: 0.16 }));
      bellTone(hz(84), t + 0.6, 1.4, 0.08);
      break;
    case "victory": {
      // fanfare: kèn đồng (sawtooth lọc) + chuông
      const seq: [number, number, number][] = [[67, 0, 0.18], [67, 0.2, 0.18], [67, 0.4, 0.18], [72, 0.6, 0.6], [67, 1.25, 0.2], [72, 1.5, 0.2], [76, 1.75, 1.2]];
      for (const [m, off, d] of seq) {
        tone(hz(m), t + off, d + 0.2, { type: "sawtooth", vol: 0.09 });
        tone(hz(m - 12), t + off, d + 0.2, { type: "square", vol: 0.04 });
      }
      for (let i = 0; i < 8; i++) bellTone(hz(88 + (i % 3) * 4), t + 1.75 + i * 0.12, 1, 0.045);
      break;
    }
  }
}

// ---------------------------------------------------------------- nhạc nền
// Am - F - C - G, nhịp ~104, bass nhịp đập + arpeggio + pad. "tense" thêm nhịp dồn và nâng cao độ.
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const BEAT = 60 / 104;

function scheduleMusic() {
  const c = ctx;
  if (!c || !musicGain) return;
  while (nextT < c.currentTime + 0.35) {
    const bar = Math.floor(step / 8) % 4;
    const i = step % 8;
    const chord = CHORDS[bar];
    const t = nextT;
    const eighth = BEAT / 2;
    // bass
    if (i % 2 === 0) tone(hz(chord[0] - 12), t, eighth * 1.8, { type: "triangle", vol: mood === "tense" ? 0.2 : 0.14, dest: musicGain });
    // arpeggio
    const note = chord[(i * 2) % 3] + (i >= 4 ? 12 : 0) + (mood === "tense" ? 12 : 0);
    tone(hz(note + 12), t, eighth * 1.2, { type: "sine", vol: mood === "tense" ? 0.07 : 0.05, dest: musicGain });
    // pad đầu ô nhịp
    if (i === 0) for (const m of chord) tone(hz(m + 12), t, BEAT * 4 * 0.95, { type: "sawtooth", vol: 0.018, attack: 0.25, dest: musicGain });
    // nhịp trống nhẹ ở chế độ căng thẳng
    if (mood === "tense" && i % 2 === 1) tone(1500, t, 0.03, { type: "square", vol: 0.025, dest: musicGain });
    if (mood === "tense" && i === 0) tone(90, t, 0.18, { type: "sine", vol: 0.25, to: 45, dest: musicGain });
    nextT += eighth;
    step++;
  }
}

export const audio = {
  /** Gọi trong sự kiện bấm/phím để mở khóa âm thanh của trình duyệt. */
  unlock() {
    ensure();
  },
  startMusic(m: Mood = "calm") {
    mood = m;
    const c = ensure();
    if (!c || timer) return;
    nextT = c.currentTime + 0.05;
    step = 0;
    timer = setInterval(scheduleMusic, 120);
    scheduleMusic();
  },
  stopMusic() {
    if (timer) clearInterval(timer);
    timer = null;
  },
  setMood(m: Mood) {
    mood = m;
  },
  get sfxOn() {
    return sfxOn;
  },
  get musicOn() {
    return musicOn;
  },
  setSfx(v: boolean) {
    sfxOn = v;
    save();
  },
  setMusic(v: boolean) {
    musicOn = v;
    if (musicGain && ctx) musicGain.gain.setTargetAtTime(v ? 0.5 : 0, ctx.currentTime, 0.1);
    if (v) ensure();
    save();
  },
  subscribe(f: () => void) {
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  },
};
