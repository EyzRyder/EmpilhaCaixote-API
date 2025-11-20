import { Response } from "express";
import { WalletService } from "./wallet.service";
import { AuthRequest } from "../../middleware/auth.middleware";

export class WalletController {
  constructor(private service: WalletService) {}

  updateWallet = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.params.userId;
      const { coins, gems } = req.body;
      
      if (!req.user || req.user.id !== userId) {
        return res.status(403).json({ error: "Forbidden: cannot modify another user." });
      }

      const updated = await this.service.updateWallet(
        userId,
        coins,
        gems
      );

      res.json({ message: "Wallet updated", data: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}
