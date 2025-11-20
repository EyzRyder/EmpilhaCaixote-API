import { Router } from "express";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { db } from "../../db/db";

const router = Router();

const repo = new AuthRepository(db);
const service = new AuthService(repo);
const controller = new AuthController(service);

router.post("/register", controller.register);
router.post("/login", controller.login);

export default router;
