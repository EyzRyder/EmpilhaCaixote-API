import { Router } from "express";
import { ShopRepository } from "./shop.repository";
import { ShopService } from "./shop.service";
import { ShopController } from "./shop.controller";
import { db } from "../../db/db";
import { authMiddleware } from "../../middleware/auth.middleware";

const repo = new ShopRepository(db);
const service = new ShopService(repo);
const controller = new ShopController(service);

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Shop
 *   description: Skin & Power store operations
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *
 *   schemas:
 *     Skin:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         price:
 *           type: number
 *
 *     Power:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         effect:
 *           type: string
 *         price:
 *           type: number
 *
 *     BuySkinInput:
 *       type: object
 *       required:
 *         - skinId
 *       properties:
 *         skinId:
 *           type: string
 *           example: "skin_fire_001"
 *
 *     BuyPowerInput:
 *       type: object
 *       required:
 *         - powerId
 *       properties:
 *         powerId:
 *           type: string
 *           example: "power_speed_03"
 */

/**
 * @swagger
 * /shop/skins:
 *   get:
 *     summary: List all available skins
 *     tags: [Shop]
 *     responses:
 *       200:
 *         description: List of skins
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Skin'
 */
router.get("/skins", authMiddleware, controller.listSkins);

/**
 * @swagger
 * /shop/buy/skin:
 *   post:
 *     summary: Purchase a skin
 *     tags: [Shop]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BuySkinInput'
 *     responses:
 *       200:
 *         description: Skin purchased successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Not enough coins or invalid skin
 *       404:
 *         description: Skin not found
 */
router.post("/buy/skin", authMiddleware, controller.buySkin);

/**
 * @swagger
 * /shop/powers:
 *   get:
 *     summary: List all available powers
 *     tags: [Shop]
 *     responses:
 *       200:
 *         description: List of powers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Power'
 */
router.get("/powers", authMiddleware, controller.listPowers);

/**
 * @swagger
 * /shop/buy/power:
 *   post:
 *     summary: Purchase a power
 *     tags: [Shop]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BuyPowerInput'
 *     responses:
 *       200:
 *         description: Power purchased successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Not enough coins or invalid power
 *       404:
 *         description: Power not found
 */
router.post("/buy/power", authMiddleware, controller.buyPower);

/**
 * @swagger
 * /shop/buy/gems:
 *   post:
 *     summary: Purchase a Gems
 *     tags: [Shop]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BuyPowerInput'
 *     responses:
 *       200:
 *         description: Gem  purchased successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Not enough coins or invalid power
 *       404:
 *         description: Power not found
 */
router.post("/buy/gems", authMiddleware, controller.buyGems);

export default router;
