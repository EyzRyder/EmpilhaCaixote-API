import { randomUUID } from "crypto";
import { ShopPowers, ShopSkins } from "../../types";
import { ShopRepository } from "./shop.repository";

export class ShopService {
  constructor(private repo: ShopRepository) { }

  // -------- SKINS --------
  async listSkins() {
    return this.repo.getAllSkins();
  }


  async addSkins(skins: Omit<ShopSkins, "id">) {
    return this.repo.addSkins({ ...skins });
  }

  async buySkin(userId: string, skinId: number) {
    const wallet = await this.repo.getUserWallet(userId);
    const allSkins = await this.repo.getAllSkins();
    const skin = allSkins.find((s) => s.id === skinId);

    if (!wallet)
      throw new Error("User Not Found");
    if (!skin) throw new Error("Skin not found");
    const priceGems = skin.priceGems || 0;

    if (wallet.gems < priceGems)
      throw new Error("Not enough gems");

    const owns = await this.repo.userOwnsSkin(userId, skinId);
    if (owns) throw new Error("User already owns this skin");
    await this.repo.addUserSkin(userId, skinId);
    const newGems = wallet.gems - priceGems;
    await this.repo.updateWallet(userId, wallet.coins, newGems);
    return { newGems: newGems };
  }

  // -------- POWERS --------
  async listPowers() {
    return this.repo.getAllPowers();
  }

  async addPowers(powers: Omit<ShopPowers, "id">) {
    return this.repo.addPower({ ...powers });
  }

  async buyPower(userId: string, powerId: number, amount: number) {
    const wallet = await this.repo.getUserWallet(userId);
    const allPowers = await this.repo.getAllPowers();
    const power = allPowers.find((p) => p.id === powerId);

    if (!wallet)
      throw new Error("User Not Found");
    if (!power) throw new Error("Power not found");
    if (wallet.coins < power.priceCoins * amount)
      throw new Error("Not enough coins");

    const existing = await this.repo.getUserPower(userId, powerId);

    if (!existing) {
      await this.repo.addUserPower(userId, powerId, amount);
    } else {
      await this.repo.updateUserPower(
        userId,
        powerId,
        existing.quantity + amount
      );
    }

    await this.repo.updateUserCoins(
      userId,
      wallet.coins - power.priceCoins * amount
    );

    return { success: true };
  }

  // ShopService.ts (Trecho relevante)

  // ...

  // -------- TROCA DE MOEDAS/DIAMANTES (NEW) --------
  async exchangeCoinsForGems(
    userId: string,
    coinsAmount: number,
    gemsPrice: number
  ) {
    if (coinsAmount <= 0 || gemsPrice <= 0) {
      throw new Error("Amounts must be positive.");
    }
    console.log(coinsAmount, gemsPrice);

    const wallet = await this.repo.getUserWallet(userId);

    if (!wallet)
      throw new Error("User Not Found");
    if (wallet.gems < gemsPrice) {
      throw new Error("Not enough gems");
    }

    const newGems = wallet.gems - gemsPrice;
    const newCoins = wallet.coins + coinsAmount;
    await this.repo.updateWallet(userId, newCoins, newGems);

    return { newCoins: newCoins, newGems: newGems };
  }

  async addGems(
    userId: string,
    gemsAmount: number
  ) {
    if (gemsAmount <= 0) {
      throw new Error("Amount must be positive.");
    }

    const wallet = await this.repo.getUserWallet(userId);

    if (!wallet)
      throw new Error("User Not Found");
    const newGems = wallet.gems + gemsAmount;
    await this.repo.updateWallet(userId, wallet.coins, newGems);
    return { success: true, newGems: newGems };
  }
}
