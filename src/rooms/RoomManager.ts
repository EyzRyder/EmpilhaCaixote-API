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

	/**
	 * Force start game for a room if valid
	 */
	public startGame(ws: WebSocket, data: any) {
		const body = data && data.content ? data.content : data;
		if (!body || !body.roomId) {
			return ws.send(
				JSON.stringify({
					type: "error",
					content: { code: "invalid_payload", message: "Dados inválidos: roomId é necessário" },
				})
			);
		}

		const roomId: string = body.roomId;
		const room = this.rooms.get(roomId);

		if (!room) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "room_not_found", message: "Sala não existe" } })
			);
		}

		if (room.gameStarted) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "game_already_started", message: "Jogo já iniciado" } })
			);
		}

		if (room.players.length < 2) {
			return ws.send(
				JSON.stringify({
					type: "error",
					content: { code: "room_min_players", message: "Sala precisa ter ao menos 2 jogadores" },
				})
			);
		}

        room.gameStarted = true;
        room.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        room.turn = Math.floor(Math.random() * 2);

		// Broadcast both aliases
		const payload = {
			room: this.sanitizeRoom(room),
			startingPlayerId: room.players[room.turn].id,
			currentPlayerId: room.players[room.turn].id,
		};
		this.broadcastByRoom(roomId, {
			type: "game-started",
			content: payload,
		});
		this.broadcastByRoom(roomId, { type: "start-game", content: payload });

		// start turn timer
		this.startTurnTimer(room);
	}

	/**
	 * Remove um jogador baseado na sua conexão WebSocket quando ela é fechada.
	 * Limpa sala se ficar vazia, avisa demais players e encerra o jogo se necessário.
	 */
	public removePlayerByWs(ws: WebSocket) {
		for (const [roomId, room] of this.rooms.entries()) {
			const idx = room.players.findIndex((p) => p.ws === ws);

			if (idx !== -1) {
				const [removed] = room.players.splice(idx, 1);

				// Stop timer if exists after modification
				this.stopTimer(room);

				// If no players left, delete room
				if (room.players.length === 0) {
					this.rooms.delete(roomId);
					this.broadcastRoomList();
					console.log(
						`[WS] Sala ${roomId} removida pois ficou vazia`
					);
					return;
				}

				// If the game was started and one left, end game
				if (room.gameStarted) {
					// If still one player remains, declare that player as winner
					if (room.players.length === 1) {
						const remainingPlayer = room.players[0];
						this.endGame(room, remainingPlayer.id);
					}
				}

				// Notify the remaining players that someone left
				this.broadcastByRoom(roomId, {
					type: "player-left",
					content: {
						playerId: removed.id,
						room: this.sanitizeRoom(room),
					},
				});

				// Update lobby list for everyone
				this.broadcastRoomList();

				console.log(
					`[WS] Jogador ${removed.id} saiu da sala ${roomId}`
				);
				return;
			}
		}
	}

	// =========================================================================
	// GESTÃO DE SALA (CRIAÇÃO / ENTRADA)
	// =========================================================================

	createRoom(ws: WebSocket, data: any) {
		const body = data && data.content ? data.content : data;
		if (!body) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "invalid_payload", message: "Dados inválidos" } })
			);
		}
		const { isPrivate, user } = body as {
			isPrivate: boolean;
			user: Pick<User, "id" | "username">;
		};

		const roomId = generateRoomCode(); // ID usado para conectar

		const newPlayer: Player = {
			id: user.id,
			username: user.username,
			ws,
			isReady: false, // 🟢 NOVO: Adicionado
		};

		if (this.rooms.has(roomId)) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "room_create_failed", message: "Erro ao criar Sala" } })
			);
		}

		const room: Room = {
			id: roomId,
			name: "Sala de " + user.username,
			isPrivate,
			players: [newPlayer],
			maxPlayers: 2,
			board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
			turn: 0, // Index do array players
			gameStarted: false,
			blockedColumns: [],
			unblockOnTurnEnd: [],
			timeLeft: TURN_TIME_MAX,
			timer: undefined,
			ready: {},
		};

		this.rooms.set(roomId, room);

		ws.send(
			JSON.stringify(
				this.buildOutgoingMessage({
					type: "room-created",
					content: { room: this.sanitizeRoom(room) },
				})
			)
		);

		this.broadcastRoomList();
	}

	joinRoom(ws: WebSocket, data: any) {
		const body = data && data.content ? data.content : data;
		if (!body) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "invalid_payload", message: "Dados inválidos" } })
			);
		}
		const { roomId, user } = body as {
			roomId: string;
			user: Pick<User, "id" | "username">;
		};

		const room = this.rooms.get(roomId);

		if (!room) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "room_not_found", message: "Sala não existe" } })
			);
		}

		// Reconexão
		const userAlreadyInRoom = room.players.find((p) => p.id == user.id);

		if (userAlreadyInRoom) {
			room.players = room.players.map((p) => {
				return p.id == user.id ? { ...p, ws: ws } : p;
			});

			// Atualiza o WS na sala
			this.rooms.set(roomId, room);

			ws.send(
				JSON.stringify(
					this.buildOutgoingMessage({
						type: "player-reentered",
						content: { room: this.sanitizeRoom(room) },
					})
				)
			);

			return;
		}

		// Validações de entrada
		for (const r of this.rooms.values()) {
			if (r.players.some((p) => p.id == user.id)) {
				return ws.send(
					JSON.stringify({
						type: "error",
						content: { code: "user_already_in_room", message: "Usuário já está numa sala" },
					})
				);
			}
		}

		if (room.players.length >= room.maxPlayers) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "room_full", message: "Sala cheia" } })
			);
		}

		const newPlayer: Player = {
			id: user.id,
			username: user.username,
			ws,
			isReady: false, // 🟢 NOVO: Adicionado
		};

		room.players.push(newPlayer);

		this.broadcastByRoom(roomId, {
			type: "player-joined",
			content: { room: this.sanitizeRoom(room) },
		});
		// Atualiza lista de salas para quem estiver observando
		this.broadcastRoomList();
	}

	getRooms(ws: WebSocket) {
		ws.send(
			JSON.stringify(
				this.buildOutgoingMessage({
					type: "rooms-updated",
					content: {
						rooms: Array.from(this.rooms.values())
							.filter((room) => !room.isPrivate)
							.map((room) => this.sanitizeRoom(room)),
					},
				})
			)
		);
	}

	// =========================================================================
	// LÓGICA DE JOGO - PRONTO
	// =========================================================================

	/**
	 * 🟢 NOVO: Handler para o cliente enviar 'player-ready'
	 * Comando WebSocket: { type: 'player-ready', content: { roomId, userId } }
	 */
	handlePlayerReady(ws: WebSocket, data: any) {
		const body = data && data.content ? data.content : data;
		if (!body) {
			return ws.send(
				JSON.stringify({
					type: "error",
					content: { code: "invalid_payload", message: "Dados de player-ready inválidos" },
				})
			);
		}

		const { roomId, userId, playerId: pId } = body as any;
		const playerId = userId ?? pId;

		// 🟢 VALIDAÇÃO: Não deixar valores vazios passarem
		if (!roomId || !playerId) {
			return ws.send(
				JSON.stringify({
					type: "error",
					content: { code: "missing_fields", message: "roomId e playerId (ou userId) são obrigatórios" },
				})
			);
		}

		console.log(
			`[READY] Jogador ${playerId} está pronto na sala ${roomId}`
		);

		const room = this.rooms.get(roomId);

		if (!room) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "room_not_found", message: "Sala não existe" } })
			);
		}

		// Marcar jogador como pronto
		const player = room.players.find((p) => p.id === playerId);

		if (!player) {
			return ws.send(
				JSON.stringify({
					type: "error",
					content: { code: "player_not_found", message: "Jogador não encontrado na sala" },
				})
			);
		}

		player.isReady = true;

		// 🟢 CORRIGIDO: Broadcast agora envia playerId também
		const readyPayload = { playerId, isReady: true };
		this.broadcastByRoom(roomId, {
			type: "player-ready",
			content: readyPayload,
		});
		// Compatibility - older clients expect 'ready-update'
		this.broadcastByRoom(roomId, {
			type: "ready-update",
			content: readyPayload,
		});

		console.log(
			`[READY] Status na sala ${roomId}:`,
			room.players.map((p) => ({
				id: p.id,
				username: p.username,
				ready: p.isReady,
			}))
		);

		// Verificar se ambos estão prontos
		this.checkBothPlayersReady(room);
	}

	// =========================================================================
	// AÇÕES DO JOGO
	// =========================================================================

	playMove(ws: WebSocket, data: any) {
		const body = data && data.content ? data.content : data;
		if (!body) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "invalid_payload", message: "Dados inválidos" } })
			);
		}
		const { roomId, playerId: pId, userId: uId, column } = body as any;
		const playerId = pId ?? uId;

		const room = this.rooms.get(roomId);

		if (!room || !room.gameStarted) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "game_not_started", message: "Jogo não iniciado" } })
			);
		}

		// Valida Turno
		const currentPlayer = room.players[room.turn];

		if (currentPlayer.id !== playerId) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "not_player_turn", message: "Não é sua vez!" } })
			);
		}

		// Valida Coluna Bloqueada
		if (room.blockedColumns.includes(column)) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "column_blocked", message: "Coluna Bloqueada!" } })
			);
		}

		// Realiza jogada
		const playerNumber = room.turn + 1; // 1 ou 2
		const row = this.dropDisc(room.board, column, playerNumber);

		if (row === -1) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "column_full", message: "Coluna cheia!" } })
			);
		}

		// Para o timer atual pois a jogada foi feita
		this.stopTimer(room);

		// Broadcast da jogada visual
		this.broadcastByRoom(roomId, {
			type: "move-played",
			content: { row, column, player: playerNumber },
		});
		// Alias de compatibilidade para clientes antigos
		this.broadcastByRoom(roomId, {
			type: "play",
			content: { row, column, player: playerNumber },
		});

		// Checa Vitória ou Empate
		if (this.checkWin(room.board, playerNumber)) {
			if (room.unblockOnTurnEnd.length > 0) {
				const cols = Array.from(new Set(room.unblockOnTurnEnd));
				room.unblockOnTurnEnd = [];
				cols.forEach((c) => {
					if (room.blockedColumns.includes(c)) {
						this.powerUnblockColumn(room, c);
					}
				});
			}
			this.endGame(room, currentPlayer.id);
			return;
		}

		if (this.checkTie(room.board)) {
			if (room.unblockOnTurnEnd.length > 0) {
				const cols = Array.from(new Set(room.unblockOnTurnEnd));
				room.unblockOnTurnEnd = [];
				cols.forEach((c) => {
					if (room.blockedColumns.includes(c)) {
						this.powerUnblockColumn(room, c);
					}
				});
			}
			this.endGame(room, "tie");
			return;
		}

		if (room.unblockOnTurnEnd.length > 0) {
			const cols = Array.from(new Set(room.unblockOnTurnEnd));
			room.unblockOnTurnEnd = [];
			cols.forEach((c) => {
				if (room.blockedColumns.includes(c)) {
					this.powerUnblockColumn(room, c);
				}
			});
		}
		this.switchTurn(room);
	}

	// =========================================================================
	// PODERES (Powers)
	// =========================================================================

	/**
	 * Handler para quando o cliente usa um poder
	 * Comando WebSocket: { type: 'use-power', content: { roomId, powerType, data } }
	 */
	usePower(ws: WebSocket, data: any) {
		const body = data && data.content ? data.content : data;
		if (!body) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "invalid_payload", message: "Dados inválidos" } })
			);
		}
		const { roomId, powerType, data: powerData } = body;

		const room = this.rooms.get(roomId);

		if (!room || !room.gameStarted) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "game_not_started", message: "Jogo não iniciado" } })
			);
		}

		const actor = room.players.find((p) => p.ws === ws);
		if (!actor) {
			return ws.send(
				JSON.stringify({ type: "error", content: { code: "player_not_found", message: "Jogador não encontrado na sala" } })
			);
		}

		const currentPlayerId = room.players[room.turn].id;
		const isOpponentTurn = actor.id !== currentPlayerId;

		console.log(`[POWER] Poder ${powerType} usado na sala ${roomId}`);

		switch (powerType) {
			case "clear_bottom_line":
				if (!isOpponentTurn) {
					ws.send(
						JSON.stringify({ type: "error", content: { code: "power_wrong_turn", message: "Poder só pode ser usado no turno do oponente" } })
					);
					return;
				}
				this.powerClearLastLine(room);
				break;

			case "eliminate_box":
				if (!isOpponentTurn) {
					ws.send(
						JSON.stringify({ type: "error", content: { code: "power_wrong_turn", message: "Poder só pode ser usado no turno do oponente" } })
					);
					return;
				}
				this.powerEliminateBox(room);
				break;

			case "reduce_opponent_time":
				if (!isOpponentTurn) {
					ws.send(
						JSON.stringify({ type: "error", content: { code: "power_wrong_turn", message: "Poder só pode ser usado no turno do oponente" } })
					);
					return;
				}
				this.powerReduceTime(room);
				break;

			case "block_column":
				if (!isOpponentTurn) {
					ws.send(
						JSON.stringify({ type: "error", content: { code: "power_wrong_turn", message: "Poder só pode ser usado no turno do oponente" } })
					);
					return;
				}
				if (powerData && powerData.col !== undefined) {
					this.powerBlockColumn(room, powerData.col);
				}
				break;

			case "unblock_column":
				if (powerData && powerData.col !== undefined) {
					this.powerUnblockColumn(room, powerData.col);
				}
				break;

			default:
				console.warn(`[POWER] Poder desconhecido: ${powerType}`);
		}
	}

	/**
	 * Poder: Limpar última linha
	 */
	private powerClearLastLine(room: Room) {
		const emptyRow = Array(COLS).fill(0);

		// Remove a última linha (índice 5) e adiciona uma vazia no topo (índice 0)
		room.board.pop();
		room.board.unshift(emptyRow);

		this.broadcastByRoom(room.id, {
			type: "board-update",
			content: {
				board: room.board,
				message: "A linha inferior foi removida!",
			},
		});
	}

	/**
	 * Poder: Eliminar caixa aleatória
	 */
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

				// Limpa o topo da coluna (índice 0) após o "shift"
				room.board[0][c] = 0;
				eliminated = true;
			}

			attempts++;
		}

		if (eliminated) {
			this.broadcastByRoom(room.id, {
				type: "board-update",
				content: {
					board: room.board,
					message: "Uma peça foi eliminada!",
				},
			});
		}
	}

	/**
	 * Poder: Reduzir tempo do oponente
	 */
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
			content: {
				timeLeft: room.timeLeft,
				message: "Tempo reduzido pela metade!",
			},
		});
	}

	/**
	 * Poder: Bloquear coluna
	 */
	private powerBlockColumn(room: Room, col: number) {
		if (col >= 0 && col < COLS && !room.blockedColumns.includes(col)) {
			room.blockedColumns.push(col);
			if (!room.unblockOnTurnEnd.includes(col)) {
				room.unblockOnTurnEnd.push(col);
			}

			this.broadcastByRoom(room.id, {
				type: "column-blocked",
				content: { col },
			});
		}
	}

	/**
	 * Poder: Desbloquear coluna
	 */
	private powerUnblockColumn(room: Room, col: number) {
		room.blockedColumns = room.blockedColumns.filter((c) => c !== col);

		// Notifica clients sobre o desbloqueio
		this.broadcastByRoom(room.id, {
			type: "column-unblocked",
			content: { col },
		});
	}

	/**
	 * Checa se ambos os jogadores estão prontos e inicia a partida
	 */
	private checkBothPlayersReady(room: Room) {
		if (!room || room.players.length < 2) return;

		const allReady = room.players.every((p) => p.isReady === true);

		if (allReady && !room.gameStarted) {
			room.gameStarted = true;
			// Reset board and turn
            room.board = Array.from({ length: ROWS }, () =>
                Array(COLS).fill(0)
            );
            room.turn = Math.floor(Math.random() * 2);

			// Broadcast início de jogo para os players
			const broadcastContent = {
				room: this.sanitizeRoom(room),
				startingPlayerId: room.players[room.turn].id,
				currentPlayerId: room.players[room.turn].id, // alias for front
			};

			this.broadcastByRoom(room.id, {
				type: "game-started",
				content: broadcastContent,
			});
			// Compatibilidade: alguns clientes usam `start-game`.
			this.broadcastByRoom(room.id, {
				type: "start-game",
				content: broadcastContent,
			});

			// Inicia o timer do turno
			this.startTurnTimer(room);
		}
	}

	// =========================================================================
	// GESTÃO DE TEMPO E TURNOS
	// =========================================================================

	private startTurnTimer(room: Room) {
		this.stopTimer(room); // Garante que não tem timer anterior

		room.timeLeft = TURN_TIME_MAX;
		const currentPlayerId = room.players[room.turn].id;

		// Notifica front-end para iniciar contagem visual
		this.broadcastByRoom(room.id, {
			type: "turn-start",
			content: {
				playerId: currentPlayerId,
				timeLeft: room.timeLeft,
			},
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
			content: { playerId: currentPlayerId },
		});

		if (room.unblockOnTurnEnd.length > 0) {
			const cols = Array.from(new Set(room.unblockOnTurnEnd));
			room.unblockOnTurnEnd = [];
			cols.forEach((c) => {
				if (room.blockedColumns.includes(c)) {
					this.powerUnblockColumn(room, c);
				}
			});
		}
		this.switchTurn(room);
	}

	private switchTurn(room: Room) {
		room.turn = room.turn === 0 ? 1 : 0;
		this.startTurnTimer(room);
	}

	private endGame(room: Room, winnerId: string | "tie") {
		this.stopTimer(room);
		room.gameStarted = false;
		room.blockedColumns = [];
		room.unblockOnTurnEnd = [];

		// Resetar estados prontos para próximo jogo
		room.players.forEach((p) => (p.isReady = false));

		this.broadcastByRoom(room.id, {
			type: "game-over",
			content: { winnerId, board: room.board },
		});

		console.log(
			`[GAME END] Sala ${room.id}: ${
				winnerId === "tie" ? "Empate" : winnerId
			} venceu!`
		);
	}

	// =========================================================================
	// LÓGICA DE TABULEIRO (HELPERS)
	// =========================================================================

	private dropDisc(
		board: number[][],
		column: number,
		playerVal: number
	): number {
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
				if (
					board[r][c] === playerVal &&
					board[r][c + 1] === playerVal &&
					board[r][c + 2] === playerVal &&
					board[r][c + 3] === playerVal
				)
					return true;
			}
		}

		// Vertical
		for (let r = 0; r <= ROWS - 4; r++) {
			for (let c = 0; c < COLS; c++) {
				if (
					board[r][c] === playerVal &&
					board[r + 1][c] === playerVal &&
					board[r + 2][c] === playerVal &&
					board[r + 3][c] === playerVal
				)
					return true;
			}
		}

		// Diagonal Principal
		for (let r = 0; r <= ROWS - 4; r++) {
			for (let c = 0; c <= COLS - 4; c++) {
				if (
					board[r][c] === playerVal &&
					board[r + 1][c + 1] === playerVal &&
					board[r + 2][c + 2] === playerVal &&
					board[r + 3][c + 3] === playerVal
				)
					return true;
			}
		}

		// Diagonal Secundária
		for (let r = 0; r <= ROWS - 4; r++) {
			for (let c = 3; c < COLS; c++) {
				if (
					board[r][c] === playerVal &&
					board[r + 1][c - 1] === playerVal &&
					board[r + 2][c - 2] === playerVal &&
					board[r + 3][c - 3] === playerVal
				)
					return true;
			}
		}

		return false;
	}

	private checkTie(board: number[][]): boolean {
		return board.every((row) => row.every((cell) => cell !== 0));
	}

	// =========================================================================
	// UTILITÁRIOS DE MENSAGEM
	// =========================================================================

	/**
	 * Remove dados sensíveis ou não serializáveis (como o Timer object) antes de enviar
	 */
	private sanitizeRoom(room: Room): Omit<Room, "timer"> {
		const { timer, ...safeRoom } = room;

		// Remove non-serializable fields (WebSocket) from players
		safeRoom.players = safeRoom.players.map((p) => {
			const { ws, ...rest } = p as any; // strip ws reference
			return rest as any;
		});

		return safeRoom;
	}

	private broadcastRoomList() {
		this.broadcast(
			{
				type: "rooms-updated",
				content: {
					rooms: Array.from(this.rooms.values())
						.filter((room) => !room.isPrivate)
						.map((room) => this.sanitizeRoom(room)),
				},
			}
		);
	}

	private broadcast(message: any) {
		const payload = this.buildOutgoingMessage(message);
		for (const client of this.wss.clients) {
			if (client.readyState === WebSocket.OPEN) {
				client.send(JSON.stringify(payload));
			}
		}
	}

	private broadcastByRoom(roomId: string, message: any) {
		const room = this.rooms.get(roomId);

		if (!room) return;

		const payload = this.buildOutgoingMessage(message);
		room.players.forEach((p) => {
			try {
				if (p.ws.readyState === WebSocket.OPEN) {
					p.ws.send(JSON.stringify(payload));
				}
			} catch (err) {
				console.error(`Erro enviando msg para sala ${roomId}:`, err);
			}
		});
	}

	/**
	 * Utility to build an outgoing message that merges `content` into top-level
	 * for client compatibility. Keeps `content` field as well.
	 */
	private buildOutgoingMessage(message: any) {
		if (!message) return message;
		const payload: any = { ...(message || {}) };
		if (message.content && typeof message.content === "object") {
			// Avoid overwriting `type` when content contains `type`.
			const { type, ...rest } = message.content;
			Object.assign(payload, rest);
		}
		return payload;
	}
}
