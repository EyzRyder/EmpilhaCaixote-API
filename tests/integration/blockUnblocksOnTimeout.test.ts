import http from "http";
import WebSocket from "ws";
import assert from "assert";
import { setupWebSocket } from "../../src/websocket";

type Msg = any;

function waitForOpen(ws: WebSocket, timeout = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("WS open timeout")), timeout);
    ws.on("open", () => { clearTimeout(t); resolve(); });
    ws.on("error", (err) => { clearTimeout(t); reject(err); });
  });
}

function waitForMessage(ws: WebSocket, predicate: (m: Msg) => boolean, timeout = 6000): Promise<Msg> {
  return new Promise((resolve, reject) => {
    const handler = (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (predicate(msg)) { cleanup(); resolve(msg); }
      } catch {}
    };
    const cleanup = () => { clearTimeout(t); ws.off("message", handler); };
    const t = setTimeout(() => { cleanup(); reject(new Error("Message wait timeout")); }, timeout);
    ws.on("message", handler);
  });
}

function send(ws: WebSocket, type: string, content: any) {
  ws.send(JSON.stringify({ type, content }));
}

async function main() {
  const server = http.createServer();
  const wss = setupWebSocket(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  const port = address.port;
  const url = `ws://localhost:${port}`;

  const ws1 = new WebSocket(url);
  const ws2 = new WebSocket(url);
  await Promise.all([waitForOpen(ws1), waitForOpen(ws2)]);

  const user1 = { id: "u1", username: "Alice" };
  const user2 = { id: "u2", username: "Bob" };

  send(ws1, "create-room", { isPrivate: false, user: user1 });
  const created = await waitForMessage(ws1, (m) => m.type === "room-created");
  const roomId: string = created.room.id;

  send(ws2, "join-room", { roomId, user: user2 });
  await waitForMessage(ws1, (m) => m.type === "player-joined");

  send(ws1, "player-ready", { roomId, userId: user1.id });
  send(ws2, "player-ready", { roomId, userId: user2.id });

  const ts = await Promise.race([
    waitForMessage(ws1, (m) => m.type === "turn-start"),
    waitForMessage(ws2, (m) => m.type === "turn-start"),
  ]);

  const currentPlayerId: string = ts.playerId;
  const currentWs = currentPlayerId === user1.id ? ws1 : ws2;
  const opponentWs = currentWs === ws1 ? ws2 : ws1;
  const opponentId = currentWs === ws1 ? user2.id : user1.id;

  send(opponentWs, "use-power", { roomId, powerType: "block_column", data: { col: 4 } });
  await Promise.race([
    waitForMessage(ws1, (m) => m.type === "column-blocked" && m.col === 4),
    waitForMessage(ws2, (m) => m.type === "column-blocked" && m.col === 4),
  ]);

  send(opponentWs, "use-power", { roomId, powerType: "reduce_opponent_time" });
  send(opponentWs, "use-power", { roomId, powerType: "reduce_opponent_time" });
  send(opponentWs, "use-power", { roomId, powerType: "reduce_opponent_time" });

  await Promise.race([
    waitForMessage(ws1, (m) => m.type === "turn-timeout"),
    waitForMessage(ws2, (m) => m.type === "turn-timeout"),
  ]);

  const unblocked = await Promise.race([
    waitForMessage(ws1, (m) => m.type === "column-unblocked" && m.col === 4),
    waitForMessage(ws2, (m) => m.type === "column-unblocked" && m.col === 4),
  ]);
  assert(unblocked.col === 4);

  send(opponentWs, "play-move", { roomId, playerId: opponentId, column: 4 });
  const played = await Promise.race([
    waitForMessage(ws1, (m) => m.type === "move-played" && m.column === 4),
    waitForMessage(ws2, (m) => m.type === "move-played" && m.column === 4),
    waitForMessage(ws1, (m) => m.type === "play" && m.column === 4),
    waitForMessage(ws2, (m) => m.type === "play" && m.column === 4),
  ]);
  assert(played.column === 4);

  ws1.close();
  ws2.close();
  wss.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  console.log("[TEST] desbloqueio via timeout OK");
}

main().catch((err) => { console.error("[TEST] Falhou:", err); process.exitCode = 1; });
