import { Request, Response } from "express";
import { ShopService } from "./shop.service";
import { AuthRequest } from "../../middleware/auth.middleware";
import { ShopPowers, ShopSkins } from "../../types";

export class ShopController {
  constructor(private service: ShopService) { }

  listSkins = async (_req: Request, res: Response) => {
    const skins = await this.service.listSkins();
    res.json(skins);
  };

  addSkin = async (req: AuthRequest, res: Response) => {
    try {
      const payload = req.body as Omit<ShopSkins, "id">;

      const data = await this.service.addSkins(payload);

      res.json({ message: "Skin purchased", data });
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  }

  buySkin = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { skinId } = req.body;

      await this.service.buySkin(userId, Number(skinId));

      res.json({ message: "Skin added" });
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  };

  listPowers = async (_req: Request, res: Response) => {
    const powers = await this.service.listPowers();
    res.json(powers);
  };

  addPower = async (req: AuthRequest, res: Response) => {
    try {
      const payload = req.body as Omit<ShopPowers, "id">;

      const data = await this.service.addPowers(payload);

      res.json({ message: "Power added", data });
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  }

  buyPower = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { powerId, amount } = req.body;

      await this.service.buyPower(userId, Number(powerId), Number(amount ?? 1));

      res.json({ message: "Power purchased" });
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  };

  buyGems = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      // Garanta que 'amount' é um número. Usar Number() já está presente na sua controller, mas é bom reforçar.
      const { gemsAmount } = req.body;

      const result = await this.service.addGems(userId, Number(gemsAmount ?? 0));

      // Desestrutura o resultado do service (result) diretamente na resposta JSON
      res.json({
        message: "Gem purchased",
        newGems: result.newGems // Adiciona newGems diretamente
      });
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  };

  exchangeCoins = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { coinsAmount, gemsPrice } = req.body;
      console.log(coinsAmount, gemsPrice);

      const result = await this.service.exchangeCoinsForGems(userId, Number(coinsAmount ?? 0), Number(gemsPrice ?? 0));
      res.json({
        message: "Coins purchased",
        newCoins: result.newCoins,
        newGems: result.newGems
      });
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  };
}
