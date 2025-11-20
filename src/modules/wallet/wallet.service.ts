import { WalletRepository } from "./wallet.repository";

export class WalletService {
  constructor(private repo: WalletRepository) {}

  async updateWallet(
    userId: string,
    coins?: number,
    gems?: number
  ) {
    if (coins === undefined && gems === undefined) {
      throw new Error("Nothing to update.");
    }

    const user = await this.repo.getById(userId);
    if (!user) throw new Error("User not found.");

    const finalCoins = coins !== undefined ? coins : null;
    const finalGems = gems !== undefined ? gems : null;

    return this.repo.updateWallet(userId, finalCoins, finalGems);
  }
}
