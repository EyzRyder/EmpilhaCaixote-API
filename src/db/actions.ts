import { sql, eq, and } from "drizzle-orm";import {
  profiles,
  shopCoinPacks,
  shopPowers,
  shopSkins,
  userEquippedItems,
  userPowers,
  userSkins,
} from "./schema";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

/* -------------------
   buyPower
   ------------------- */
   export function buyPower(
    db: BetterSQLite3Database,
    userId: string,
    powerId: number,
    quantity: number,
  ): string {
    return db.transaction(() => {
      // get power
      const power = db
        .select()
        .from(shopPowers)
        .where(eq(shopPowers.id, powerId))
        .get();
  
      if (!power) throw new Error("Power not found");
  
      const totalCost = power.priceCoins * quantity;
  
      // debit coins atomically
      const updated = db
        .update(profiles)
        .set({ coins: sql`coins - ${totalCost}` })
        .where(
          and(eq(profiles.id, userId), sql`coins >= ${totalCost}`)
        )
        .run();
  
      if ((updated as any).changes === 0) {
        throw new Error("Moedas insuficientes");
      }
  
      // upsert user powers
      db.insert(userPowers)
        .values({
          userId,
          powerId,
          quantity,
        })
        .onConflictDoUpdate({
          target: [userPowers.userId, userPowers.powerId],
          set: {
            quantity: sql`${userPowers.quantity} + ${quantity}`,
          },
        })
        .run();
  
      return "Compra de poder realizada!";
    });
  }
  
  /* -------------------
     buySkin
     ------------------- */
  export function buySkin(
    db: BetterSQLite3Database,
    userId: string,
    skinId: number,
  ): string {
    return db.transaction(() => {
      // check ownership
      const owned = db
        .select()
        .from(userSkins)
        .where(
          and(eq(userSkins.userId, userId), eq(userSkins.skinId, skinId)),
        )
        .get();
  
      if (owned) throw new Error("Item já comprado");
  
      const skin = db
        .select()
        .from(shopSkins)
        .where(eq(shopSkins.id, skinId))
        .get();
  
      if (!skin) throw new Error("Skin não encontrada");
  
      const cost = skin.priceCoins;
  
      const updated = db
        .update(profiles)
        .set({ coins: sql`coins - ${cost}` })
        .where(
          and(eq(profiles.id, userId), sql`coins >= ${cost}`)
        )
        .run();
  
      if ((updated as any).changes === 0) {
        throw new Error("Moedas insuficientes");
      }
  
      db.insert(userSkins)
        .values({ userId, skinId })
        .run();
  
      return "Item comprado com sucesso!";
    });
  }
  
  /* -------------------
     buyCoinPack
     ------------------- */
  export function buyCoinPack(
    db: BetterSQLite3Database,
    userId: string,
    packId: number,
  ): string {
    return db.transaction(() => {
      const pack = db
        .select()
        .from(shopCoinPacks)
        .where(eq(shopCoinPacks.id, packId))
        .get();
  
      if (!pack) throw new Error("Pack not found");
  
      const cost = pack.priceGems;
      const reward = pack.coinAmount;
  
      const updated = db
        .update(profiles)
        .set({
          gems: sql`gems - ${cost}`,
          coins: sql`coins + ${reward}`,
        })
        .where(and(eq(profiles.id, userId), sql`gems >= ${cost}`))
        .run();
  
      if ((updated as any).changes === 0) {
        throw new Error("Diamantes insuficientes");
      }
  
      return "Pacote de moedas comprado!";
    });
  }
  
  /* -------------------
     equipSkin
     ------------------- */
  export function equipSkin(
    db: BetterSQLite3Database,
    userId: string,
    skinId: number,
  ): string {
    return db.transaction(() => {
      const owned = db
        .select()
        .from(userSkins)
        .where(and(eq(userSkins.userId, userId), eq(userSkins.skinId, skinId)))
        .get();
  
      if (!owned) throw new Error("Você não possui este item.");
  
      const skin = db
        .select()
        .from(shopSkins)
        .where(eq(shopSkins.id, skinId))
        .get();
  
      if (!skin) throw new Error("Item não encontrado");
  
      // ensure row exists
      db.insert(userEquippedItems)
        .values({ userId })
        .onConflictDoNothing()
        .run();
  
      // update correct column
      if (skin.skinType === "scenario") {
        db.update(userEquippedItems)
          .set({ scenarioSkinId: skinId })
          .where(eq(userEquippedItems.userId, userId))
          .run();
      } else if (skin.skinType === "claw") {
        db.update(userEquippedItems)
          .set({ clawSkinId: skinId })
          .where(eq(userEquippedItems.userId, userId))
          .run();
      } else if (skin.skinType === "player") {
        db.update(userEquippedItems)
          .set({ playerSkinId: skinId })
          .where(eq(userEquippedItems.userId, userId))
          .run();
      }
  
      return "Item equipado!";
    });
  }
  
  /* -------------------
     usePower
     ------------------- */
  export function usePower(
    db: BetterSQLite3Database,
    userId: string,
    powerId: number,
  ): string {
    const updated = db
      .update(userPowers)
      .set({ quantity: sql`quantity - 1` })
      .where(
        and(
          eq(userPowers.userId, userId),
          eq(userPowers.powerId, powerId),
          sql`quantity > 0`,
        )
      )
      .run();
  
    if ((updated as any).changes === 0) {
      throw new Error("Poder esgotado ou não existente.");
    }
  
    return "Poder utilizado!";
  }