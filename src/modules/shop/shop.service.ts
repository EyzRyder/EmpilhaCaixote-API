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
    
    // 🎯 NOVO PARÂMETRO: Assumindo que o preço em diamantes é 'skin.priceGems'
    const priceGems = skin.priceGems || 0; // Use '0' ou uma lógica para garantir que é um número
    
    // 💡 NOVO: VERIFICAÇÃO DE SALDO DE DIAMANTES
    if (wallet.gems < priceGems)
      throw new Error("Not enough gems"); // Mensagem para o frontend

    const owns = await this.repo.userOwnsSkin(userId, skinId);
    if (owns) throw new Error("User already owns this skin");

    // 1. Adiciona a skin ao usuário
    await this.repo.addUserSkin(userId, skinId);

    // 2. NOVO: SUBTRAI O CUSTO EM DIAMANTES
    const newGems = wallet.gems - priceGems;
    
    // Atualiza a carteira com o novo saldo de diamantes (moedas permanecem as mesmas)
    // Assumindo que this.repo.updateWallet(userId, newCoins, newGems) existe e funciona
    await this.repo.updateWallet(userId, wallet.coins, newGems);

    // Retorna os novos saldos para o frontend
    return { success: true, newGems: newGems };
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
   
   const wallet = await this.repo.getUserWallet(userId);

   if (!wallet)
      throw new Error("User Not Found");

   // 1. Validação de Saldo de Diamantes
   if (wallet.gems < gemsPrice) {
      throw new Error("Not enough gems"); 
   }

   // 2. Calcular novos saldos
   const newGems = wallet.gems - gemsPrice;
   const newCoins = wallet.coins + coinsAmount;

   // 3. Atualizar usando a nova função do repositório
   await this.repo.updateWallet(userId, newCoins, newGems); // AGORA FUNCIONA

   return { success: true, newCoins: newCoins, newGems: newGems };
}

async addGems(
  userId: string,
  gemsAmount: number
) {
  if (gemsAmount <= 0) {
    throw new Error("Amount must be positive.");
  }
  
  // 1. Obter a carteira atual
  const wallet = await this.repo.getUserWallet(userId);

  if (!wallet)
    throw new Error("User Not Found");

  // 2. Calcular novo saldo
  const newGems = wallet.gems + gemsAmount;

  // 3. Atualizar o saldo (usaremos a função updateWallet que adicionamos)
  // A carteira de moedas (coins) permanece inalterada (wallet.coins)
  await this.repo.updateWallet(userId, wallet.coins, newGems);
  
  // Retorna o novo saldo para o frontend atualizar o Signal
  return { success: true, newGems: newGems };
}
}
