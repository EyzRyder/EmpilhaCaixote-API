import { Router } from "express";
import { WalletRepository } from "./wallet.repository";
import { WalletService } from "./wallet.service";
import { WalletController } from "./wallet.controller";
import { db } from "../../db/db";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

const repo = new WalletRepository(db);
const service = new WalletService(repo);
const controller = new WalletController(service);

/**
 * @swagger
 * components:
 *   schemas:
 *     WalletUpdateRequest:
 *       type: object
 *       properties:
 *         coins:
 *           type: integer
 *           example: 150
 *         gems:
 *           type: integer
 *           example: 30
 *       required: []
 *
 *     WalletResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Wallet updated
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               example: 99449a57-4d1f-48d7-a2b1-b7eae8f99b0f
 *             username:
 *               type: string
 *               example: Player123
 *             coins:
 *               type: integer
 *               example: 150
 *             gems:
 *               type: integer
 *               example: 30
 *
 * /wallet/{userId}:
 *   put:
 *     summary: Update coins and/or gems of a user
 *     description: Updates the wallet balance of a user. Any field not included will remain unchanged.
 *     tags:
 *       - Wallet
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID (UUID)
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WalletUpdateRequest'
 *
 *     responses:
 *       200:
 *         description: Wallet updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WalletResponse'
 *
 *       400:
 *         description: Invalid request or user not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User not found
 */
router.put("/:userId", authMiddleware,controller.updateWallet);

export default router;
