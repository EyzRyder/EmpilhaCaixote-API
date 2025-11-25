import { InferSelectModel } from "drizzle-orm";
import {
  profiles,
  shopCoinPacks,
  shopGemPacks,
  shopPowers,
  shopSkins,
  userEquippedItems,
  userPowers,
  userSkins,
} from "./db/schema";
import { WebSocket } from "ws";

export type Player = {
  ws: WebSocket; // WebSocket connection
} & Pick<User, "id" | "username">;

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
  blockedColumns: number[];
  timer?: NodeJS.Timeout;
  timeLeft: number;
};

export type User = InferSelectModel<typeof profiles>;

export type ShopSkins = InferSelectModel<typeof shopSkins>;

export type UserEquippedItems = InferSelectModel<typeof userEquippedItems>;

export type ShopPowers = InferSelectModel<typeof shopPowers>;

export type ShopGemPacks = InferSelectModel<typeof shopGemPacks>;

export type ShopCoinPacks = InferSelectModel<typeof shopCoinPacks>;

export type UserPowers = InferSelectModel<typeof userPowers>;

export type UserSkins = InferSelectModel<typeof userSkins>;
