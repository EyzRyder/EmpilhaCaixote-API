import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { id: string };
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token." });
  }

  const token = header.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET || "default";
    if (!secret) throw new Error("JWT_SECRET not set");

    const decoded = jwt.verify(token, secret) as { userId: string };

    req.user = { id: decoded.userId };

    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}
