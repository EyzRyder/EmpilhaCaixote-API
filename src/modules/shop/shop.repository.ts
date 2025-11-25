import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { and, eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { ShopPowers, ShopSkins } from "../../types";

export class ShopRepository {
    constructor(private db: BetterSQLite3Database<typeof schema>) { }


    // ------- SKINS -------
    async getAllSkins() {
        return this.db.select().from(schema.shopSkins);
    }

    async addSkins(skin: Omit<ShopSkins, "id">) {
        return this.db.insert(schema.shopSkins).values(skin).run();
    }

    async userOwnsSkin(userId: string, skinId: number) {
        const rows = await this.db
            .select()
            .from(schema.userSkins)
            .where(eq(schema.userSkins.userId, userId));

        return rows.some((row) => row.skinId === skinId);
    }

    async addUserSkin(userId: string, skinId: number) {
        await this.db.insert(schema.userSkins).values({ userId, skinId });
    }

    async GetUserSkins(userId: string) {
        return await this.db
            .select()
            .from(schema.userSkins)
            .where(
                eq(schema.userSkins.userId, userId),
            );
    }

    // ------- POWERS -------
    async getAllPowers() {
        return this.db.select().from(schema.shopPowers);
    }

    async addPower(power: Omit<ShopPowers, "id">) {
        return this.db.insert(schema.shopPowers).values(power).run();
    }

    async addPowers(Powers: ShopPowers) {
        return this.db.insert(schema.shopPowers).values(Powers).run();
    }

    async getUserPower(userId: string, powerId: number) {
        const rows = await this.db
            .select()
            .from(schema.userPowers)
            .where(eq(schema.userPowers.userId, userId));

        return rows.find((p) => p.powerId === powerId) ?? null;
    }

    async addUserPower(userId: string, powerId: number, quantity: number) {
        await this.db.insert(schema.userPowers).values({
            userId,
            powerId,
            quantity,
        });
    }

    async updateUserPower(userId: string, powerId: number, quantity: number) {
        await this.db
            .update(schema.userPowers)
            .set({ quantity })
            .where(
                and(
                    eq(schema.userPowers.userId, userId),
                    eq(schema.userPowers.powerId, powerId)
                )
            );
    }

    async GetUserPowers(userId: string) {
        return await this.db
            .select()
            .from(schema.userPowers)
            .where(
                eq(schema.userPowers.userId, userId),
            );
    }
    async getSkinsWithOwnership(userId: string) {
        const skins = await this.db.select().from(schema.shopSkins);

        const userSkins = await this.db
            .select()
            .from(schema.userSkins)
            .where(eq(schema.userSkins.userId, userId));

        const ownedSet = new Set(userSkins.map(s => s.skinId));

        return skins.map(skin => ({
            ...skin,
            owned: ownedSet.has(skin.id),
        }));
    }
    async getPowersWithOwnership(userId: string) {
        const powers = await this.db.select().from(schema.shopPowers);

        const userPowers = await this.db
            .select()
            .from(schema.userPowers)
            .where(eq(schema.userPowers.userId, userId));

        const powerMap = new Map(
            userPowers.map(p => [p.powerId, p.quantity])
        );

        return powers.map(power => ({
            ...power,
            quantity: powerMap.get(power.id) ?? 0,
            owned: powerMap.has(power.id),
        }));
    }

    // ------- USER WALLET -------
    async getUserWallet(userId: string) {
        return this.db.query.profiles.findFirst({
            where: eq(schema.profiles.id, userId),
        });
    }
    async updateUserCoins(userId: string, newCoins: number) {
        await this.db
            .update(schema.profiles)
            .set({ coins: newCoins })
            .where(eq(schema.profiles.id, userId));
    }

    async updateWallet(userId: string, newCoins: number, newGems: number) {
        await this.db
            .update(schema.profiles)
            .set({ coins: newCoins, gems: newGems })
            .where(eq(schema.profiles.id, userId));
    }
}