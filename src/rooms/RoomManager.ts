import { Player, Room, User } from "../types";
import { generateRoomCode } from "../helper";
import { WebSocketServer, WebSocket } from "ws";

export default class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private wss: WebSocketServer;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
  }

  createRoom(ws: WebSocket, data: any) {
    const { isPrivate, user } = data as {
      isPrivate: boolean;
      user: Pick<User, "id" | "username">;
    };

    const roomId = generateRoomCode(); // ID usado para conectar

    const newPlayer: Player = {
      id: user.id,
      username: user.username,
      ws,
    };

    if (this.rooms.has(roomId)) {
      console.log("Sala já tem esse codigo");
    }

    const room: Room = {
      id: roomId,
      name: "Sala de " + user.username,
      isPrivate,
      players: [newPlayer],
      maxPlayers: 2,
      ready: {},
      board: Array.from({ length: 6 }, () => Array(7).fill(0)),
      turn: 0,
      gameStarted: false,
    };

    this.rooms.set(roomId, room);

    ws.send(
      JSON.stringify({
        type: "room-created",
        room,
      }),
    );
    this.broadcast({
      type: "rooms-updated",
      rooms: Array.from(this.rooms.entries())
        .filter((room) => !room[1].isPrivate)
        .map((room) => room[1]),
    });
  }

  getRooms(ws: WebSocket) {
    ws.send(
      JSON.stringify({
        type: "rooms-updated",
        rooms: Array.from(this.rooms.entries())
          .filter((room) => !room[1].isPrivate)
          .map((room) => room[1]),
      }),
    );
  }

  joinRoom(ws: WebSocket, data: any) {
    const { roomId, user } = data as {
      roomId: string;
      user: Pick<User, "id" | "username">;
    };
    const room = this.rooms.get(roomId);

    if (!room) {
      return ws.send(
        JSON.stringify({ type: "error", message: "Sala não existe" }),
      );
    }

    const userAlreadyInRoom = room.players.find((p) => p.id == user.id);
    if (userAlreadyInRoom) {
      room.players = room.players.map((p) => {
        return p.id == user.id ? { ...p, ws: ws } : p;
      });
      this.rooms.set(roomId, room);
      console.log(room.players);
      ws.send(
        JSON.stringify({
          type: "player-reentered",
          room,
        }),
      );
    }

    for (const room of this.rooms.values()) {
      const userInRoom = room.players.filter((p) => p.id == user.id);
      if (userInRoom.length > 0) {
        return ws.send(
          JSON.stringify({
            type: "error",
            message: "Usuário já esta numa sala",
          }),
        );
      }
    }

    if (room.players.length >= room.maxPlayers) {
      return ws.send(JSON.stringify({ type: "error", message: "Sala cheia" }));
    }

    const newPlayer: Player = {
      id: user.id,
      username: user.username,
      ws,
    };

    room.players.push(newPlayer);

    this.broadcastByRoom(roomId, {
      type: "player-joined",
      room,
    });
  }

  setReady(data: any) {
    const { roomId, user } = data as { roomId: string; user: Pick<User, "id"> };

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.ready[user.id] = true;

    this.broadcastByRoom(roomId, {
      type: "ready-update",
      ready: room.ready,
    });

    // Se os 2 players estão prontos → inicia jogo
    if (
      Object.keys(room.ready).length === 2 &&
      room.ready[room.players[0].id] &&
      room.ready[room.players[1].id]
    ) {
      room.gameStarted = true;
      this.broadcastByRoom(roomId, {
        type: "start-game",
        room,
      });
    }
  }

  playMove(ws: WebSocket, data: any) {
    const { roomId, playerId, column } = data;
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (!room.gameStarted) return;

    // cual player está no turno?
    const currentPlayer = room.players[room.turn];
    if (currentPlayer.id !== playerId) return;

    // realizar jogada
    const row = this.dropDisc(room.board, column, room.turn + 1);
    if (row === -1) return; // coluna cheia

    // broadcastByRoom da jogada
    this.broadcastByRoom(roomId, {
      type: "play",
      row,
      column,
      player: room.turn + 1,
    });

    // próxima vez outro jogador joga
    room.turn = room.turn === 0 ? 1 : 0;
  }

  private dropDisc(board: number[][], column: number, player: number): number {
    for (let row = 5; row >= 0; row--) {
      if (board[row][column] === 0) {
        board[row][column] = player;
        return row;
      }
    }
    return -1;
  }

  private broadcast(message: any) {
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    }
  }

  private broadcastByRoom(roomId: string, message: any) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players.forEach((p) => {
      try {
        p.ws.send(JSON.stringify(message));
      } catch (err) {
        console.error(err);
      }
    });
  }
}
