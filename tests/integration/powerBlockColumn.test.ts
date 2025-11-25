import http from "http";
import WebSocket from "ws";
import assert from "assert";
import { setupWebSocket } from "../../src/websocket";

type Msg = any;

function waitForOpen(ws: WebSocket, timeout = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("WS open timeout")), timeout);
    ws.on("open", () => {
      clearTimeout(t);
      resolve();
    });
    ws.on("error", (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

function waitForMessage(ws: WebSocket, predicate: (m: Msg) => boolean, timeout = 3000): Promise<Msg> {
  return new Promise((resolve, reject) => {
    const handler = (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (predicate(msg)) {
          cleanup();
          resolve(msg);
        }
      } catch {}
    };
    const cleanup = () => {
      clearTimeout(t);
      ws.off("message", handler);
    };
    const t = setTimeout(() => {
      cleanup();
      reject(new Error("Message wait timeout"));
    }, timeout);
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
  assert(roomId && typeof roomId === "string");

  send(ws2, "join-room", { roomId, user: user2 });
  await waitForMessage(ws1, (m) => m.type === "player-joined");
  await waitForMessage(ws2, (m) => m.type === "player-joined");

  send(ws1, "player-ready", { roomId, userId: user1.id });
  send(ws2, "player-ready", { roomId, userId: user2.id });
  const started = await Promise.race([
    waitForMessage(ws1, (m) => m.type === "game-started" || m.type === "start-game"),
    waitForMessage(ws2, (m) => m.type === "game-started" || m.type === "start-game"),
  ]);

  const currentPlayerId: string = started.currentPlayerId ?? started.startingPlayerId;
  assert(currentPlayerId === user1.id || currentPlayerId === user2.id);

  const currentWs = currentPlayerId === user1.id ? ws1 : ws2;
  const opponentWs = currentWs === ws1 ? ws2 : ws1;
  const currentUserId = currentPlayerId;
  const opponentUserId = currentWs === ws1 ? user2.id : user1.id;

  send(opponentWs, "use-power", { roomId, powerType: "block_column", data: { col: 3 } });
  const blockedEvt = await Promise.race([
    waitForMessage(ws1, (m) => m.type === "column-blocked" && m.col === 3),
    waitForMessage(ws2, (m) => m.type === "column-blocked" && m.col === 3),
  ]);
  assert(blockedEvt.col === 3);

  send(currentWs, "play-move", { roomId, playerId: currentUserId, column: 3 });
  const errBlocked = await waitForMessage(currentWs, (m) => m.type === "error" && m.content?.code === "column_blocked");
  assert(errBlocked.content.code === "column_blocked");

  send(currentWs, "play-move", { roomId, playerId: currentUserId, column: 2 });
  const played1 = await Promise.race([
    waitForMessage(ws1, (m) => m.type === "move-played" && m.column === 2),
    waitForMessage(ws2, (m) => m.type === "move-played" && m.column === 2),
    waitForMessage(ws1, (m) => m.type === "play" && m.column === 2),
    waitForMessage(ws2, (m) => m.type === "play" && m.column === 2),
  ]);
  assert(played1.column === 2);

  const unblockedEvt = await Promise.race([
    waitForMessage(ws1, (m) => m.type === "column-unblocked" && m.col === 3),
    waitForMessage(ws2, (m) => m.type === "column-unblocked" && m.col === 3),
  ]);
  assert(unblockedEvt.col === 3);

  send(opponentWs, "play-move", { roomId, playerId: opponentUserId, column: 3 });
  const played2 = await Promise.race([
    waitForMessage(ws1, (m) => m.type === "move-played" && m.column === 3),
    waitForMessage(ws2, (m) => m.type === "move-played" && m.column === 3),
    waitForMessage(ws1, (m) => m.type === "play" && m.column === 3),
    waitForMessage(ws2, (m) => m.type === "play" && m.column === 3),
  ]);
  assert(played2.column === 3);

  ws1.close();
  ws2.close();
  wss.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  console.log("[TEST] powerBlockColumn integração passou");
}

main().catch(async (err) => {
  console.error("[TEST] Falhou:", err);
  process.exitCode = 1;
});

