import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { profiles } from "../../db/schema";
import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";

export class WalletRepository {
  constructor(private db: BetterSQLite3Database<typeof schema>) {}

  async getById(userId: string) {
    const rows = await this.db.select().from(profiles).where(eq(profiles.id, userId));
    return rows[0] ?? null;
  }

  async updateWallet(userId: string, coins: number | null, gems: number | null) {
    const updateData: any = {};
    if (coins !== null) updateData.coins = coins;
    if (gems !== null) updateData.gems = gems;

    await this.db
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.id, userId));

    return this.getById(userId);
  }
}
