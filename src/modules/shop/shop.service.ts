import { ShopRepository } from "./shop.repository";

export class ShopService {
  constructor(private repo: ShopRepository) {}

  // -------- SKINS --------
  async listSkins() {
    return this.repo.getAllSkins();
  }

  async buySkin(userId: string, skinId: number) {
    const wallet = await this.repo.getUserWallet(userId);
    const allSkins = await this.repo.getAllSkins();
    const skin = allSkins.find((s) => s.id === skinId);


    if (!wallet)
      throw new Error("User Not Found");
    if (!skin) throw new Error("Skin not found");
    if (wallet.coins < skin.priceCoins)
      throw new Error("Not enough coins");

    const owns = await this.repo.userOwnsSkin(userId, skinId);
    if (owns) throw new Error("User already owns this skin");

    await this.repo.addUserSkin(userId, skinId);

    await this.repo.updateUserCoins(userId, wallet.coins - skin.priceCoins);

    return { success: true };
  }

  // -------- POWERS --------
  async listPowers() {
    return this.repo.getAllPowers();
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
}
