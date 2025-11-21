import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthRepository } from "./auth.repository";
import { randomUUID } from "crypto";

export class AuthService {
  constructor(private repo: AuthRepository) {}

  async register(username: string, password: string) {
    const existing = await this.repo.findByUsername(username);
    if (existing) throw new Error("Usuário já existe");

    const hashed = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    const user = await this.repo.createUser(userId, username, hashed);

    if (!user) throw new Error("Error ao criar usuario");

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });
    return { token, user };
  }

  async login(username: string, password: string) {
    const user = await this.repo.findByUsername(username);
    if (!user) throw new Error("Credenciais inválidas");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Credenciais inválidas");

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    return { token, user };
  }
}
