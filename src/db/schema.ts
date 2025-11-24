import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { sqliteTableCreator } from "drizzle-orm/sqlite-core";
export const createTable = sqliteTableCreator((name) => name);
/* ========================================================
 * TABLE: profiles
 * ======================================================== */
export const profiles = sqliteTable("profiles", {
  id: text("id").notNull().primaryKey(), // UUID
  username: text("username").notNull().unique(),
  coins: integer("coins").notNull().default(0),
  gems: integer("gems").notNull().default(0),
  password: text("password").notNull(),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(strftime('%s','now'))`), // timestamp unix
});

/* Username length constraint (manual check in app layer)
   SQLite does not support CHECK(char_length(...)). */

/* ========================================================
 * TABLE: shop_skins
 * ======================================================== */
export const shopSkins = sqliteTable("shop_skins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  priceGems: integer("price_gems").notNull().default(0),
  skinType: text("skin_type").notNull(), // claw | player | scenario
  iconUrl: text("icon_url"),
});

/* ========================================================
 * TABLE: user_equipped_items
 * ======================================================== */
export const userEquippedItems = sqliteTable("user_equipped_items", {
  userId: text("user_id")
    .notNull()
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  scenarioSkinId: integer("scenario_skin_id").references(() => shopSkins.id),
  clawSkinId: integer("claw_skin_id").references(() => shopSkins.id),
  playerSkinId: integer("player_skin_id").references(() => shopSkins.id),
});

/* ========================================================
 * TABLE: shop_powers
 * ======================================================== */
export const shopPowers = sqliteTable("shop_powers", {
  id: integer("id").notNull().primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  priceCoins: integer("price_coins").notNull().default(0),
  iconUrl: text("icon_url"),
});

/* ========================================================
 * TABLE: shop_gem_packs
 * ======================================================== */
export const shopGemPacks = sqliteTable("shop_gem_packs", {
  id: integer("id").notNull().primaryKey({ autoIncrement: true }),
  gemAmount: integer("gem_amount").notNull(),
  priceReal: real("price_real").notNull(), // DECIMAL
  storeProductId: text("store_product_id"),
});

/* ========================================================
 * TABLE: shop_coin_packs
 * ======================================================== */
export const shopCoinPacks = sqliteTable("shop_coin_packs", {
  id: integer("id").notNull().primaryKey({ autoIncrement: true }),
  coinAmount: integer("coin_amount").notNull(),
  priceGems: integer("price_gems").notNull(),
});

/* ========================================================
 * TABLE: user_powers
 * ======================================================== */
export const userPowers = sqliteTable(
  "user_powers",
  {
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    powerId: integer("power_id")
      .notNull()
      .references(() => shopPowers.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.powerId] }),
  ]
);

/* ========================================================
 * TABLE: user_skins
 * ======================================================== */
export const userSkins = sqliteTable(
  "user_skins",
  {
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    skinId: integer("skin_id")
      .notNull()
      .references(() => shopSkins.id, { onDelete: "cascade" }),
  },
  (t) => [
   primaryKey({ columns: [t.userId, t.skinId] }),
  ]
);
