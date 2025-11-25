import { WebSocketServer, WebSocket } from "ws";
import RoomManager from "./rooms/RoomManager";

/**
 * Configura o servidor WebSocket com todos os handlers necessários
 */
export function setupWebSocket(server: any) {
	const wss = new WebSocketServer({ server });
	const rooms = new RoomManager(wss);

	function buildOutgoingMessage(message: any) {
		if (!message) return message;
		const payload: any = { ...(message || {}) };
		if (message.content && typeof message.content === "object") {
			const { type, ...rest } = message.content;
			Object.assign(payload, rest);
		}
		return payload;
	}

	console.log("[WS] WebSocket server initialized");

	// =====================================================================
	// CONEXÃO
	// =====================================================================

	wss.on("connection", (ws: WebSocket) => {
		console.log("[WS] New connection");

		// ===================================================================
		// HANDLER DE MENSAGENS
		// ===================================================================

		ws.on("message", (message: string) => {
			try {
				// 🟢 CORRIGIDO: Parse a mensagem
				const data = JSON.parse(message.toString());
				const { type, content } = data;

				console.log(`[WS] Message received: ${type}`);

				// 🟢 CORRIGIDO: Switch case com todos os comandos
				switch (type) {
					// Obter lista de salas
					case "get-rooms":
						rooms.getRooms(ws);
						break;

					// Criar nova sala
					case "create-room":
						rooms.createRoom(ws, data);
						break;

					// Entrar em uma sala existente
					case "join-room":
						rooms.joinRoom(ws, data);
						break;

					// 🟢 CORRIGIDO: Player-ready - um jogador marca como pronto
					case "player-ready":
					case "ready":
						rooms.handlePlayerReady(ws, data);
						break;

					// Realizar uma jogada
					case "play-move":
					case "play":
						rooms.playMove(ws, data);
						break;

					// 🟢 NOVO: Usar um poder
					case "use-power":
					case "usePower":
						rooms.usePower(ws, data);
						break;

					case "start-game":
						// Some clients may request immediate start; delegate to RoomManager
						rooms.startGame(ws, data);
						break;

					// Comando desconhecido
					default:
						console.warn(
							`[WS] Unknown message type: ${type}`,
							data
						);
					ws.send(
						JSON.stringify(
							buildOutgoingMessage({
								type: "error",
								content: { code: "unknown_command", message: `Comando desconhecido: ${type}` },
							})
						)
					);
				}
			} catch (err) {
				console.error("[WS] Invalid message:", err);
				ws.send(
					JSON.stringify(
						buildOutgoingMessage({
							type: "error",
							content: { code: "invalid_json", message: "Mensagem inválida" },
						})
					)
				);
			}
		});

		// ===================================================================
		// HANDLER DE ERRO
		// ===================================================================

		ws.on("error", (error) => {
			console.error("[WS] WebSocket error:", error);
		});

		// ===================================================================
		// HANDLER DE DESCONEXÃO
		// ===================================================================

		ws.on("close", () => {
			console.log("[WS] Connection closed");
			// Limpar dados do jogador/sala se necessário
			try {
				rooms.removePlayerByWs(ws);
			} catch (err) {
				console.error("[WS] Error during cleanup on close:", err);
			}
		});
	});

	return wss;
}
