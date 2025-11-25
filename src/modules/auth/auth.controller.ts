import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { AuthRequest } from "../../middleware/auth.middleware";

export class AuthController {
  constructor(private service: AuthService) { }

  register = async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const user = await this.service.register(username, password);
      res.status(201).json(user);
    } catch (err: any) {
      console.log(err)
      res.status(400).json({ error: err.message });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const data = await this.service.login(username, password);
      res.json(data);
    } catch (err: any) {
      console.log(err)
      res.status(400).json({ error: err.message });
    }
  };

  getUser = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = await this.service.getUser(userId);
      res.json(user);
    } catch (err: any) {
      console.log(err)
      res.status(400).json({ error: err.message });
    }
  }
}
