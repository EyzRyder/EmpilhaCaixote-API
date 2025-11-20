import { Request, Response } from "express";
import { WalletService } from "./wallet.service";

export class WalletController {
  constructor(private service: WalletService) {}

  updateWallet = async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      const { coins, gems } = req.body;

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
