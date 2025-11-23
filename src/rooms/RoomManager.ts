import { Player, Room, User } from "../types";
import { generateRoomCode } from "../helper";
import { WebSocketServer, WebSocket } from "ws";

const ROWS = 6;
const COLS = 7;
const TURN_TIME_MAX = 15; // 15 segundos

export default class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private wss: WebSocketServer;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
  }

  // ===========================================================================
  // GESTÃO DE SALA (CRIAÇÃO / ENTRADA)
  // ===========================================================================

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
      return ws.send(
        JSON.stringify({ type: "error", message: "Erro ao criar Sala" })
      );
    }

    const room: Room = {
      id: roomId,
      name: "Sala de " + user.username,
      isPrivate,
      players: [newPlayer],
      maxPlayers: 2,
      ready: {},
      board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
      turn: 0, // Index do array players
      gameStarted: false,
      blockedColumns: [],
      timeLeft: TURN_TIME_MAX
    };

    this.rooms.set(roomId, room);

    ws.send(JSON.stringify({ type: "room-created", room: this.sanitizeRoom(room) }));
    this.broadcastRoomList();
  }

  joinRoom(ws: WebSocket, data: any) {
    const { roomId, user } = data as {
      roomId: string;
      user: Pick<User, "id" | "username">;
    };
    const room = this.rooms.get(roomId);

    if (!room) {
      return ws.send(JSON.stringify({ type: "error", message: "Sala não existe" }));
    }

    // Reconexão
    const userAlreadyInRoom = room.players.find((p) => p.id == user.id);
    if (userAlreadyInRoom) {
      room.players = room.players.map((p) => {
        return p.id == user.id ? { ...p, ws: ws } : p;
      });
      // Atualiza o WS na sala
      this.rooms.set(roomId, room);
      
      ws.send(JSON.stringify({ type: "player-reentered", room: this.sanitizeRoom(room) }));
      return;
    }

    // Validações de entrada
    for (const r of this.rooms.values()) {
      if (r.players.some((p) => p.id == user.id)) {
        return ws.send(JSON.stringify({ type: "error", message: "Usuário já está numa sala" }));
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
    this.broadcastByRoom(roomId, { type: "player-joined", room: this.sanitizeRoom(room) });
  }

  getRooms(ws: WebSocket) {
    ws.send(
      JSON.stringify({
        type: "rooms-updated",
        rooms: Array.from(this.rooms.entries())
          .filter((room) => !room[1].isPrivate)
          .map((room) => this.sanitizeRoom(room[1])),
      })
    );
  }

  // ===========================================================================
  // LÓGICA DE JOGO
  // ===========================================================================

  setReady(data: any) {
    const { roomId, user } = data;
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.ready[user.id] = true;

    this.broadcastByRoom(roomId, {
      type: "ready-update",
      ready: room.ready,
    });

    // Iniciar jogo se ambos prontos
    if (
      Object.keys(room.ready).length === 2 &&
      room.players.every(p => room.ready[p.id])
    ) {
      this.startGame(room);
    }
  }

  private startGame(room: Room) {
    room.gameStarted = true;
    room.turn = Math.floor(Math.random() * 2); // Randomiza quem começa
    room.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    room.blockedColumns = [];
    
    this.broadcastByRoom(room.id, {
      type: "start-game",
      room: this.sanitizeRoom(room),
      currentPlayerId: room.players[room.turn].id
    });

    this.startTurnTimer(room);
  }

  playMove(ws: WebSocket, data: any) {
    const { roomId, playerId, column } = data;
    const room = this.rooms.get(roomId);
    if (!room || !room.gameStarted) return;

    // Valida Turno
    const currentPlayer = room.players[room.turn];
    if (currentPlayer.id !== playerId) return;

    // Valida Coluna Bloqueada
    if (room.blockedColumns.includes(column)) {
        ws.send(JSON.stringify({ type: "error", message: "Coluna Bloqueada!" }));
        return;
    }

    // Realiza jogada
    const playerNumber = room.turn + 1; // 1 ou 2
    const row = this.dropDisc(room.board, column, playerNumber);
    
    if (row === -1) return; // Coluna cheia

    // Para o timer atual pois a jogada foi feita
    this.stopTimer(room);

    // Broadcast da jogada visual
    this.broadcastByRoom(roomId, {
      type: "play",
      row,
      column,
      player: playerNumber,
    });

    // Checa Vitória ou Empate
    if (this.checkWin(room.board, playerNumber)) {
        this.endGame(room, currentPlayer.id);
        return;
    }

    if (this.checkTie(room.board)) {
        this.endGame(room, "tie");
        return;
    }

    // Passa o turno
    this.switchTurn(room);
  }

  // ===========================================================================
  // PODERES (Powers)
  // ===========================================================================

  // Chamado via WebSocket quando o cliente usa um poder
  usePower(ws: WebSocket, data: any) {
    const { roomId, powerType, content } = data; // content pode ter { col, targetId }
    const room = this.rooms.get(roomId);
    if (!room || !room.gameStarted) return;

    switch (powerType) {
        case "clear_bottom_line":
            this.powerClearLastLine(room);
            break;
        case "eliminate_box":
            this.powerEliminateBox(room);
            break;
        case "reduce_opponent_time":
            this.powerReduceTime(room);
            break;
        case "block_column":
            if (content && content.col !== undefined) {
                this.powerBlockColumn(room, content.col);
            }
            break;
        case "unblock_column":
            if (content && content.col !== undefined) {
                this.powerUnblockColumn(room, content.col);
            }
            break;
    }
  }

  private powerClearLastLine(room: Room) {
    const emptyRow = Array(COLS).fill(0);
    // Remove a última linha (índice 5) e adiciona uma vazia no topo (índice 0)
    // No array visual, índice 0 é o topo.
    room.board.pop(); 
    room.board.unshift(emptyRow);
    
    this.broadcastByRoom(room.id, {
        type: "board-update",
        board: room.board,
        message: "A linha inferior foi removida!"
    });
  }

  private powerEliminateBox(room: Room) {
    let attempts = 0;
    let eliminated = false;
    
    // Tenta achar uma peça não vazia aleatória
    while (attempts < 50 && !eliminated) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        
        if (room.board[r][c] !== 0) {
            // Lógica de gravidade: remove essa peça, tudo acima cai
            for (let i = r; i > 0; i--) {
                room.board[i][c] = room.board[i - 1][c];
            }
            room.board[0][c] = 0;
            eliminated = true;
        }
        attempts++;
    }

    if (eliminated) {
        this.broadcastByRoom(room.id, {
            type: "board-update",
            board: room.board,
            message: "Uma peça foi eliminada!"
        });
    }
  }

  private powerReduceTime(room: Room) {
      // Reduz o tempo do turno ATUAL pela metade
      if (room.timer) {
          clearTimeout(room.timer);
      }
      
      room.timeLeft = Math.floor(room.timeLeft / 2);
      
      // Reinicia o timer com o tempo reduzido
      room.timer = setTimeout(() => {
        this.handleTurnTimeout(room);
      }, room.timeLeft * 1000);

      this.broadcastByRoom(room.id, {
          type: "timer-update",
          timeLeft: room.timeLeft,
          message: "Tempo reduzido pela metade!"
      });
  }

  private powerBlockColumn(room: Room, col: number) {
      if (col >= 0 && col < COLS) {
          room.blockedColumns.push(col);
          this.broadcastByRoom(room.id, {
              type: "column-blocked",
              col: col
          });
      }
  }

  private powerUnblockColumn(room: Room, col: number) {
      room.blockedColumns = room.blockedColumns.filter(c => c !== col);
      // Opcional: notificar desbloqueio
  }

  // ===========================================================================
  // GESTÃO DE TEMPO E TURNOS
  // ===========================================================================

  private startTurnTimer(room: Room) {
    this.stopTimer(room); // Garante que não tem timer anterior
    room.timeLeft = TURN_TIME_MAX;

    const currentPlayerId = room.players[room.turn].id;

    // Notifica front-end para iniciar contagem visual
    this.broadcastByRoom(room.id, {
        type: "turn-start",
        playerId: currentPlayerId,
        timeLeft: room.timeLeft
    });

    room.timer = setTimeout(() => {
        this.handleTurnTimeout(room);
    }, TURN_TIME_MAX * 1000);
  }

  private stopTimer(room: Room) {
      if (room.timer) {
          clearTimeout(room.timer);
          room.timer = undefined;
      }
  }

  private handleTurnTimeout(room: Room) {
      const currentPlayerId = room.players[room.turn].id;
      
      this.broadcastByRoom(room.id, {
          type: "turn-timeout",
          playerId: currentPlayerId
      });

      // Passa a vez automaticamente por timeout
      this.switchTurn(room);
  }

  private switchTurn(room: Room) {
      room.turn = room.turn === 0 ? 1 : 0;
      this.startTurnTimer(room);
  }

  private endGame(room: Room, winnerId: string | "tie") {
      this.stopTimer(room);
      room.gameStarted = false;
      
      this.broadcastByRoom(room.id, {
          type: "game-over",
          winnerId,
          board: room.board
      });
  }

  // ===========================================================================
  // LÓGICA DE TABULEIRO (HELPERS)
  // ===========================================================================

  private dropDisc(board: number[][], column: number, playerVal: number): number {
    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row][column] === 0) {
        board[row][column] = playerVal;
        return row;
      }
    }
    return -1;
  }

  private checkWin(board: number[][], playerVal: number): boolean {
      // Horizontal
      for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c <= COLS - 4; c++) {
              if (board[r][c] === playerVal && board[r][c+1] === playerVal && 
                  board[r][c+2] === playerVal && board[r][c+3] === playerVal) return true;
          }
      }
      // Vertical
      for (let r = 0; r <= ROWS - 4; r++) {
          for (let c = 0; c < COLS; c++) {
              if (board[r][c] === playerVal && board[r+1][c] === playerVal && 
                  board[r+2][c] === playerVal && board[r+3][c] === playerVal) return true;
          }
      }
      // Diagonal Principal
      for (let r = 0; r <= ROWS - 4; r++) {
          for (let c = 0; c <= COLS - 4; c++) {
              if (board[r][c] === playerVal && board[r+1][c+1] === playerVal && 
                  board[r+2][c+2] === playerVal && board[r+3][c+3] === playerVal) return true;
          }
      }
      // Diagonal Secundária
      for (let r = 0; r <= ROWS - 4; r++) {
          for (let c = 3; c < COLS; c++) {
              if (board[r][c] === playerVal && board[r+1][c-1] === playerVal && 
                  board[r+2][c-2] === playerVal && board[r+3][c-3] === playerVal) return true;
          }
      }
      return false;
  }

  private checkTie(board: number[][]): boolean {
      return board.every(row => row.every(cell => cell !== 0));
  }

  // ===========================================================================
  // UTILITÁRIOS DE MENSAGEM
  // ===========================================================================

  /**
   * Remove dados sensíveis ou não serializáveis (como o Timer object) antes de enviar
   */
  private sanitizeRoom(room: Room): Omit<Room, 'timer'> {
      const { timer, ...safeRoom } = room;
      return safeRoom;
  }

  private broadcastRoomList() {
    this.broadcast({
      type: "rooms-updated",
      rooms: Array.from(this.rooms.entries())
        .filter((room) => !room[1].isPrivate)
        .map((room) => this.sanitizeRoom(room[1])),
    });
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
        if (p.ws.readyState === WebSocket.OPEN) {
            p.ws.send(JSON.stringify(message));
        }
      } catch (err) {
        console.error(`Erro enviando msg para sala ${roomId}:`, err);
      }
    });
  }
}