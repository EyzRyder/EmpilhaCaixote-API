import { Player, Room } from "../types";
import { generateRoomCode } from "../helper";

const ROWS = 6;
const COLS = 7;

export default class RoomManager {
  private rooms: Map<string, Room> = new Map();


  createRoom(ws: any, data: any) {
    const { name, isPrivate, password, player } = data;

    const roomId = generateRoomCode(); // ID usado para conectar

    // Players no createRoom já chegam como objeto básico
    const newPlayer: Player = {
      id: player.id,
      name: player.name,
      email: "emailtest@email.com",
      ws,
    };

    const room: Room = {
      id: roomId,
      name,
      isPrivate,
      password: isPrivate ? password : undefined,
      players: [newPlayer],
      maxPlayers: 2,
      ready: {},
      board: Array.from({ length: 6 }, () => Array(7).fill(0)),
      turn: 0,
      gameStarted: false,
    };

    this.rooms.set(roomId, room);

    console.log(this.rooms);

    ws.send(
      JSON.stringify({
        type: "room-created",
        roomId,
        room,
      }),
    );
  }

  getRooms(ws: any){
    ws.send(
      JSON.stringify({
        type: "rooms-fetched",
        rooms:Array.from(this.rooms.entries()).filter(room=>!room[1].isPrivate)
      }),
    );
  }


  joinRoom(ws: any, data: any) {
    const { roomId, password, player } = data;
    const room = this.rooms.get(roomId);

    if (!room) {
      return ws.send(
        JSON.stringify({ type: "error", message: "Sala não existe" }),
      );
    }

    if (room.players.length >= room.maxPlayers) {
      return ws.send(
        JSON.stringify({ type: "error", message: "Sala cheia" }),
      );
    }

    if (room.isPrivate && room.password !== password) {
      return ws.send(
        JSON.stringify({ type: "error", message: "Senha incorreta" }),
      );
    }

    const newPlayer: Player = {
      id: player.id,
      name: player.name,
      email: player.email,
      ws,
    };

    room.players.push(newPlayer);

    this.broadcast(roomId, {
      type: "player-joined",
      players: room.players.map((p) => ({ id: p.id, name: p.name })),
    });
  }


  setReady(ws: any, roomId: string, playerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.ready[playerId] = true;

    this.broadcast(roomId, {
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
      this.broadcast(roomId, {
        type: "start-game",
        room,
      });
    }
  }


  playMove(ws: any, data: any) {
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

    // broadcast da jogada
    this.broadcast(roomId, {
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

  private broadcast(roomId: string, message: any) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players.forEach((p) => {
      try {
        p.ws.send(JSON.stringify(message));
      } catch (_) {}
    });
  }
}