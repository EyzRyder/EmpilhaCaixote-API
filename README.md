Empilha Caixote API

Componentes e Funções

- `src/index.ts`
  - Inicializa Express, configura CORS e rotas HTTP (`/auth`, `/wallet`, `/shop`).
  - Integra WebSocket com `setupWebSocket(server)`.

- `src/websocket.ts`
  - Instancia `WebSocketServer` e roteia mensagens por `type`.
  - Delegação para `RoomManager`.
  - Padroniza erros com `{ type: "error", content: { code, message } }`.

- `src/rooms/RoomManager.ts`
  - Gestão de salas: criar, entrar, remover por desconexão.
  - Lógica do jogo: tabuleiro, turnos, timers, vitória/empate.
  - Powers com regras de turno e desbloqueio automático de colunas.
  - Broadcast por sala com payload compatível.

- `src/types.ts`
  - Tipos: `Room`, `Player`, `User`, etc.

- `src/helper.ts`
  - Utilitários (ex.: geração de código de sala).

- `src/middleware/auth.middleware.ts`
  - Middleware de autenticação para rotas HTTP.

- `src/modules/auth/*`
  - Autenticação: rotas e serviços.

- `src/modules/wallet/*`
  - Carteira: rotas e serviços.

- `src/modules/shop/*`
  - Loja: rotas e serviços.

- `src/docs/swagger.ts`
  - Configuração do Swagger em `/api-docs`.

- `src/db/*`
  - Drizzle ORM: config, schema e ações.

WebSocket — Entrada

- `get-rooms`
- `create-room`
- `join-room`
- `player-ready` | `ready`
- `play-move` | `play`
- `use-power` | `usePower`
- `start-game`

WebSocket — Saída

- `error` `{ content: { code, message } }`
- `room-created` `{ content: { room } }`
- `player-reentered` `{ content: { room } }`
- `player-joined` `{ content: { room } }`
- `player-left` `{ content: { playerId, room } }`
- `rooms-updated` `{ content: { rooms } }`
- `player-ready` | `ready-update` `{ content: { playerId, isReady } }`
- `game-started` | `start-game` `{ content: { room, startingPlayerId, currentPlayerId } }`
- `turn-start` `{ content: { playerId, timeLeft } }`
- `turn-timeout` `{ content: { playerId } }`
- `move-played` | `play` `{ content: { row, column, player } }`
- `game-over` `{ content: { winnerId, board } }`
- `board-update` `{ content: { board, message } }`
- `timer-update` `{ content: { timeLeft, message } }`
- `column-blocked` `{ content: { col } }`
- `column-unblocked` `{ content: { col } }`

Regras de Powers

- Permitidos apenas no turno do oponente: `clear_bottom_line`, `eliminate_box`, `reduce_opponent_time`, `block_column`.
- `block_column` é automaticamente desfeito no final do turno atual antes do próximo (`column-unblocked`).
- `unblock_column` pode ser chamado diretamente.

Erros Padronizados

- `invalid_json`, `unknown_command`, `invalid_payload`, `room_not_found`, `game_already_started`, `room_min_players`, `user_already_in_room`, `room_full`, `game_not_started`, `not_player_turn`, `column_blocked`, `column_full`, `power_wrong_turn`, `player_not_found`.
