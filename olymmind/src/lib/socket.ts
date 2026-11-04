"use client";
import { io, type Socket } from "socket.io-client";
import { loadElo } from "./storage";
import type { Ack, ClientToServerEvents, ServerToClientEvents } from "./types";

export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ClientSocket | null = null;

/** Một kết nối duy nhất cho cả ứng dụng. */
export function getSocket(): ClientSocket {
  if (!socket) {
    socket = io({ transports: ["websocket"], autoConnect: true });
    // Server đo RTT: trả lời ngay lập tức.
    socket.on("rtt:ping", (ack) => ack());
  }
  return socket;
}

const PLAYER_KEY = "olymmind:player";

export interface StoredPlayer {
  playerId: string;
  name: string;
  code: string;
}

export function loadPlayer(): StoredPlayer | null {
  try {
    const raw = localStorage.getItem(PLAYER_KEY);
    return raw ? (JSON.parse(raw) as StoredPlayer) : null;
  } catch {
    return null;
  }
}

export function savePlayer(p: StoredPlayer) {
  try {
    localStorage.setItem(PLAYER_KEY, JSON.stringify(p));
  } catch {
    /* bỏ qua */
  }
}

function withAck<T>(fn: (cb: (r: Ack<T>) => void) => void): Promise<Ack<T>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: "Máy chủ không phản hồi." }), 20_000);
    fn((r) => {
      clearTimeout(timer);
      resolve(r);
    });
  });
}

export async function createRoom(name: string, useAI: boolean) {
  const s = getSocket();
  const r = await withAck<{ code: string; playerId: string }>((cb) => s.emit("room:create", { name, useAI, elo: loadElo() }, cb));
  if (r.ok) savePlayer({ playerId: r.playerId, name, code: r.code });
  return r;
}

export async function joinRoom(code: string, name: string, playerId?: string) {
  const s = getSocket();
  const c = code.trim().toUpperCase();
  const r = await withAck<{ code: string; playerId: string }>((cb) => s.emit("room:join", { code: c, name, playerId, elo: loadElo() }, cb));
  if (r.ok) savePlayer({ playerId: r.playerId, name, code: r.code });
  return r;
}
