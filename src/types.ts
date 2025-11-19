export type Player = {
  id: string;
  name: string;
  email: string;
  ws: any; // WebSocket connection
};

export type Room = {
  id: string;
  name: string;
  isPrivate: boolean;
  password?: string;
  players: Player[];
  maxPlayers: 2;
  ready: Record<string, boolean>;
  board: number[][]; // connect 4 6x7
  turn: number; // index do jogador (0 ou 1)
  gameStarted: boolean;
};
