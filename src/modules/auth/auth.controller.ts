import { Request, Response } from "express";
import { AuthService } from "./auth.service";

export class AuthController {
  constructor(private service: AuthService) {}

  register = async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const user = await this.service.register(username, password);
      res.status(201).json({ message: "Registrado!", user });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const data = await this.service.login(username, password);
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}
