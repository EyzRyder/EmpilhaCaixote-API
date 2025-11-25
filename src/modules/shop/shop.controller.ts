import { Request, Response } from "express";
import { ShopService } from "./shop.service";
import { AuthRequest } from "../../middleware/auth.middleware";

export class ShopController {
  constructor(private service: ShopService) {}

  listSkins = async (_req: Request, res: Response) => {
    const skins = await this.service.listSkins();
    res.json(skins);
  };

  buySkin = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { skinId } = req.body;

      await this.service.buySkin(userId, Number(skinId));

      res.json({ message: "Skin purchased" });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };

  listPowers = async (_req: Request, res: Response) => {
    const powers = await this.service.listPowers();
    res.json(powers);
  };

  buyPower = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { powerId, amount } = req.body;

      await this.service.buyPower(userId, Number(powerId), Number(amount ?? 1));

      res.json({ message: "Power purchased" });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };

  buyGems = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { amount } = req.body;

      const data = await this.service.addGems(userId, Number(amount ?? 1));

      res.json({ message: "Gem purchased", data });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  };
}
