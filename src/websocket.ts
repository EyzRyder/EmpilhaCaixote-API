import { WebSocketServer, WebSocket } from "ws";
import RoomManager from "./rooms/RoomManager";

export function setupWebSocket(server: any) {
  const wss = new WebSocketServer({ server });
  const rooms = new RoomManager();

  console.log("[WS] WebSocket server initialized");

  wss.on("connection", (ws: WebSocket) => {
    console.log("[WS] New connection");

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case "get-rooms":
            rooms.getRooms(ws);
            break;
          case "create-room":
            rooms.createRoom(ws, data);
            break;

          case "join-room":
            rooms.joinRoom(ws, data);
            break;

          case "ready":
            rooms.setReady(ws, data.roomId,data.playerId);
            break;

          case "play":
            rooms.playMove(ws, data);
            break;

          default:
            console.log("[WS] Unknown message type:", data);
        }
      } catch (err) {
        console.error("[WS] Invalid message:", err);
      }
    });
  });
}
