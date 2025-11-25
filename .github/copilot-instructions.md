# Copilot / AI Assistant Instructions for EmpilhaCaixote-API

This file helps AI coding agents quickly understand the project architecture and make safe, accurate edits.

Key points to understand and follow:

1) Project Overview
- Repository: EmpilhaCaixote-API (back-end only in this workspace). Frontend client is in a separate project `front/EmplihaCaixote-front` (not part of the repo but referenced by the developer).
- Tech stack: Node.js + TypeScript, Express HTTP server + ws WebSocket package, Drizzle ORM for DB.
- Primary responsibilities of the API: HTTP REST endpoints (`/auth`, `/wallet`, `/shop`) and a WebSocket lobby/game server for real-time Connect-4-like gameplay.

2) Code locations & important files
- `src/index.ts` initializes Express app and creates Node HTTP server. WebSocket server is set up in `src/websocket.ts`.
- `src/websocket.ts`: Defines WebSocket server lifecycle and `switch(type)` message dispatch to `RoomManager` methods.
- `src/rooms/RoomManager.ts`: Server-side game logic and room management; contains most real-time business logic and broadcast helpers.
- `src/types.ts`: Common types for Room / Player / User used across server.
- `src/helper.ts`: Small utilities (e.g. `generateRoomCode`).

3) Big-picture architecture
- Clients connect to the backend (HTTP for REST, WebSocket for real-time) and exchange JSON messages of shape: `{ type: string, content?: object }`. Note: Some clients may sometimes omit the `content` wrapper and pass top-level fields; server supports both shapes.
- `websocket.ts` parses incoming messages and maps type strings to `RoomManager` methods.
- `RoomManager` maintains in-memory rooms using `Map<string, Room>`. Each `Room` holds `players`, `board`, `turn`, timers, and `gameStarted` status.
- Timers: RoomManager uses NodeJS timeouts stored in `room.timer`. When users disconnect, make sure to stop timers to prevent leaks.

4) Main WebSocket events and payloads (server accepted input)
- Input (from client to server):
  - `get-rooms` — returns lobby rooms via `rooms-updated` (content: `{ rooms: Room[] }`).
  - `create-room` — `content: { isPrivate: boolean, user: { id, username } }` (or top-level equivalent). Server responds `room-created` with `room` sanitized (no `ws` property) and broadcasts `rooms-updated`.
  - `join-room` — `content: { roomId, user: { id, username } }` (or top-level equivalent) -> `player-joined` broadcast to all in room.
  - `player-ready` / `ready` — `content: { roomId, userId | playerId }` (server accepts both keys), server toggles ready and broadcasts `player-ready` and `ready-update` (compatibility), then checks to start the game.
  - `play-move` / `play` — `content: { roomId, playerId|userId, column }` (server accepts both `playerId` and `userId` names)
  - `use-power` / `usePower` — `content: { roomId, powerType, data }` (power-specific payloads)
  - `start-game` — Clients may request an explicit start (server supports this as `rooms.startGame(...)`), requires `roomId` and will validate player count.

- Output (server -> clients, via `RoomManager.broadcastByRoom` or `broadcast`):
  - `rooms-updated`: lobby broadcast with sanitized rooms
  - `room-created`: created room payload
  - `player-joined` / `player-reentered`: when a player joins or reconnects
  - `player-left`: fired when a player's WebSocket closes; contains `playerId` and sanitized `room`
  - `player-ready` / `ready-update`: broadcast after a player's ready change
  - `game-started` / `start-game`: broadcast on game start (two aliases supported)
  - `play`: broadcast on board changes after a move
  - `board-update`, `column-blocked`, `column-unblocked` — various power effects
  - `timer-update`, `turn-start`, `turn-timeout`, `game-over`

5) Message shape compatibility & patterns
- Server already attempts compatibility for multiple message shapes:
  - `data.content` (preferred) or top-level properties `data`.
  - Both `userId` and `playerId` are accepted where appropriate.
  - Aliases for event names are supported for backward compatibility: `play`/<->`play-move`, `ready`/<->`player-ready`, `start-game`/<->`game-started`, `usePower`/<->`use-power`.
- When editing or adding handlers, always check these two shapes and maintain compatibility.

6) Server naming & serialization conventions
- Send `room` objects only after calling `sanitizeRoom(room)` to strip `ws` references and timer objects.
- `broadcastByRoom` should always check `p.ws.readyState === WebSocket.OPEN` before sending.

7) Developer workflow & commands
- Build (TypeScript) with tsup: `npm run build`.
- Run dev server (if scripts configured): `npm run dev` or `npm start` (check `package.json`).
- On code changes: ensure `npm run build` still works; watch for TypeScript errors and missing imports.
- Run REST endpoints with Postman or the client and test WebSocket flows using `wscat` or the frontend client.

8) Common pitfalls and how to fix them
- Invalid message shape: Use `const body = data && data.content ? data.content : data` at top of `RoomManager` handler methods and destructure from `body`.
- `JSON.stringify` failing due to `ws` or timers: Use `sanitizeRoom` before including room in payloads.
- Timers not cleared on disconnect: Use the `removePlayerByWs` method to stop timers when a player leaves and delete empty rooms.
- Inconsistent event names across clients: Provide alias handling in `websocket.ts` (server side) and broadcast both `game-started` and `start-game` where appropriate.

9) Integration & external dependencies
- WebSocket server uses `ws` package. RoomManager uses WebSocketServer instance for global broadcast.
- Drizzle ORM: DB setup under `src/db/*`, not relevant to WebSocket but worth noting for REST APIs.

10) Code editing guidance for AI agents
- Prefer adding backward-compatible handlers rather than changing existing message names unless the dev requested it.
- Keep `sanitizeRoom` DRY and always call before sending room data.
- When adding new functionality, add both server-side and documentation changes in `README.md` and update the `front` client to match.
- If adding a new broadcast event name, consider keeping aliases if there are multiple clients/versions.

11) Quick example messages
- Create room (client):
  { "type": "create-room", "content": { "isPrivate": false, "user": { "id": "u1", "username": "Alice" } } }
- Ready (client):
  { "type": "player-ready", "content": { "roomId": "ABCDE", "playerId": "u1" } }
- Play move (client):
  { "type": "play-move", "content": { "roomId": "ABCDE", "playerId": "u1", "column": 3 } }

12) When in doubt
- Ask the developer about the `front` client's expected event names (or copy of `ws.service.ts`) if something is ambiguous.
- Always run `npm run build` before proposing a change as it catches TypeScript syntax errors quickly.

---

If you want me to expand the file with a more detailed message matrix (input vs. output shapes for each event) or generate unit tests / integration tests for real-time events, say so and I will proceed.