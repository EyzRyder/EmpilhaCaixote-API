import { InferSelectModel } from "drizzle-orm";
import {
  profiles,
  shopPowers,
  shopSkins,
  userEquippedItems,
} from "./db/schema";
import {  WebSocket } from "ws";

export type Player = {
  ws: WebSocket; // WebSocket connection
} &Pick<User, "id"|"username">;

export type Room = {
  id: string;
  name: string;
  isPrivate: boolean;
  players: Player[];
  maxPlayers: 2;
  ready: Record<string, boolean>;
  board: number[][]; // connect 4 6x7
  turn: number; // index do jogador (0 ou 1)
  gameStarted: boolean;
};
export type User = InferSelectModel<typeof profiles>;

export type ShopSkins = InferSelectModel<typeof shopSkins>;

export type UserEquippedItems = InferSelectModel<typeof userEquippedItems>;

export type ShopPowers = InferSelectModel<typeof shopPowers>;
