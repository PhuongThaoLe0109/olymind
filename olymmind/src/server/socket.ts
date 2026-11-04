// Adapter Socket.io mỏng: toàn bộ luật chơi nằm trong engine.ts.
import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { generatePlan } from "../lib/generate";
import type { ClientToServerEvents, ServerToClientEvents } from "../lib/types";
import { createEngine } from "./engine";

type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

const RTT_PING_EVERY_MS = 5_000;
const IDLE_ROOM_MS = 30 * 60_000;

export function initSocket(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN?.split(",") ?? false },
    pingInterval: 10_000,
    pingTimeout: 8_000,
  });

  const engine = createEngine({
    hub: { emit: (code, event, payload) => (io.to(code) as any).emit(event, payload) },
    makePlan: generatePlan,
    onFinish: (summary) => console.log(`[olymmind] phòng ${summary.code} xong ván ${summary.matchNo}`),
  });

  // Đo RTT: gửi ping, client ack ngay; lấy hiệu thời gian phía server.
  function measure(code: string, playerId: string, socket: Sock) {
    const t0 = performance.now();
    socket.timeout(2000).emit("rtt:ping", (err?: unknown) => {
      if (!err) engine.recordRtt(code, playerId, performance.now() - t0);
    });
  }

  io.on("connection", (socket: Sock) => {
    let code = "";
    let pid = "";

    const attach = (c: string, p: string) => {
      code = c;
      pid = p;
      socket.join(c);
      engine.setConnected(c, p, true);
      for (let i = 0; i < 5; i++) setTimeout(() => measure(c, p, socket), i * 150);
      const iv = setInterval(() => measure(c, p, socket), RTT_PING_EVERY_MS);
      socket.once("disconnect", () => clearInterval(iv));
    };

    socket.on("room:create", async (p, ack) => {
      const r = await engine.createRoom({ name: p?.name, useAI: !!p?.useAI, elo: p?.elo });
      if (r.ok) attach(r.code, r.playerId);
      ack?.(r);
    });

    socket.on("room:join", (p, ack) => {
      const r = engine.joinRoom({ code: p?.code, name: p?.name, playerId: p?.playerId, elo: p?.elo });
      if (r.ok) attach(r.code, r.playerId);
      ack?.(r);
    });

    socket.on("sync:ping", (ack) => ack?.(Date.now()));
    socket.on("game:start", () => code && void engine.start(code, pid));
    socket.on("game:next", () => code && engine.skip(code, pid));
    socket.on("game:rematch", () => code && engine.rematch(code, pid));
    socket.on("buzzer:press", () => code && engine.press(code, pid));
    socket.on("answer:submit", (p) => code && engine.submitAnswer(code, pid, String(p?.text ?? "")));
    socket.on("answer:skip", () => code && engine.skipAnswer(code, pid));
    socket.on("pick:submit", (p) => code && engine.pick(code, pid, p?.values, p?.star ?? null));
    socket.on("cnv:guess", (p) => code && engine.cnvGuess(code, pid, String(p?.text ?? "")));
    socket.on("disconnect", () => code && engine.setConnected(code, pid, false));
  });

  setInterval(() => engine.sweep(IDLE_ROOM_MS), 5 * 60_000).unref();
  return io;
}
