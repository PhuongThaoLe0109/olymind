"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket, joinRoom, loadPlayer } from "@/lib/socket";
import type { RoomState } from "@/lib/types";

export type JoinStatus = "connecting" | "need-name" | "joining" | "joined" | "error";

/**
 * Hook trung tâm của phòng thi: kết nối, vào phòng, đồng bộ đồng hồ, bấm chuông.
 * - Đồng hồ: ước lượng độ lệch giữa client và server (lấy mẫu có RTT thấp nhất).
 * - Bấm chuông: chỉ gửi sự kiện; server tự quyết định ai nhanh nhất (đã bù RTT).
 */
export function useBuzzer(code: string) {
  const [state, setState] = useState<RoomState | null>(null);
  const [status, setStatus] = useState<JoinStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [ping, setPing] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const offsetRef = useRef(0); // serverTime ≈ Date.now() + offset
  const bestRtt = useRef<{ rtt: number; offset: number }[]>([]);

  const tryJoin = useCallback(
    async (name: string, existingId?: string) => {
      setStatus("joining");
      const r = await joinRoom(code, name, existingId);
      if (r.ok) {
        setPlayerId(r.playerId);
        setStatus("joined");
        setError(null);
      } else {
        setError(r.error);
        setStatus(existingId ? "need-name" : "error");
      }
    },
    [code],
  );

  // Kết nối + tự vào lại nếu đã có danh tính lưu sẵn cho phòng này
  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => {
      setConnected(true);
      const saved = loadPlayer();
      if (saved && saved.code === code.toUpperCase()) void tryJoin(saved.name, saved.playerId);
      else setStatus((s) => (s === "joined" || s === "joining" ? s : "need-name"));
    };
    const onDisconnect = () => setConnected(false);
    const onState = (s: RoomState) => {
      setState(s);
      // Khởi tạo thô độ lệch đồng hồ cho tới khi có mẫu ping tốt hơn
      if (!bestRtt.current.length) offsetRef.current = s.serverTime - Date.now();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", onState);
    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", onState);
    };
  }, [code, tryJoin]);

  // Đồng bộ đồng hồ mỗi 4 giây
  useEffect(() => {
    const socket = getSocket();
    const sample = () => {
      if (!socket.connected) return;
      const t0 = Date.now();
      socket.emit("sync:ping", (serverTime) => {
        const t1 = Date.now();
        const rtt = t1 - t0;
        const offset = serverTime + rtt / 2 - t1;
        const list = bestRtt.current;
        list.push({ rtt, offset });
        if (list.length > 6) list.shift();
        const best = list.reduce((a, b) => (b.rtt < a.rtt ? b : a));
        offsetRef.current = best.offset;
        setPing(Math.round(best.rtt));
      });
    };
    sample();
    const id = setInterval(sample, 4000);
    return () => clearInterval(id);
  }, []);

  // Nhịp cập nhật UI cho thanh đếm ngược
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const remainingMs = state?.deadline ? Math.max(0, state.deadline - (now + offsetRef.current)) : null;

  // Tổng thời gian của bước hiện tại = thời gian còn lại lớn nhất thấy được cho deadline này
  const totalRef = useRef<{ d: number | null; max: number }>({ d: null, max: 1 });
  const dl = state?.deadline ?? null;
  if (totalRef.current.d !== dl) totalRef.current = { d: dl, max: remainingMs ?? 1 };
  if ((remainingMs ?? 0) > totalRef.current.max) totalRef.current.max = remainingMs!;
  const totalMs = Math.max(totalRef.current.max, 1);

  const buzz = useCallback(() => {
    // clientTime chỉ để gỡ lỗi; server bỏ qua nó khi xếp thứ tự.
    getSocket().emit("buzzer:press", { clientTime: Date.now() + offsetRef.current });
  }, []);
  const submitAnswer = useCallback((text: string) => getSocket().emit("answer:submit", { text }), []);
  const startGame = useCallback(() => getSocket().emit("game:start"), []);
  const nextQuestion = useCallback(() => getSocket().emit("game:next"), []);
  const rematch = useCallback(() => getSocket().emit("game:rematch"), []);
  const skipAnswer = useCallback(() => getSocket().emit("answer:skip"), []);
  const pick = useCallback((values: number[], star: number | null) => getSocket().emit("pick:submit", { values, star }), []);
  const guessKeyword = useCallback((text: string) => getSocket().emit("cnv:guess", { text }), []);

  const me = state?.players.find((p) => p.id === playerId) ?? null;

  return {
    state,
    me,
    playerId,
    status,
    error,
    connected,
    ping,
    remainingMs,
    totalMs,
    isHost: !!state && state.hostId === playerId,
    join: (name: string) => tryJoin(name),
    buzz,
    submitAnswer,
    startGame,
    nextQuestion,
    rematch,
    skipAnswer,
    pick,
    guessKeyword,
  };
}
