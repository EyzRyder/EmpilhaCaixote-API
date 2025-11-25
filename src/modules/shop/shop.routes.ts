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
 * 
 *     BuyGems:
 *       type: object
 *       required:
 *         - gemsAmount
 *       properties:
 *         gemsAmount:
 *           type: number
 *           example: 100
 * 
 *     ExchangeCoins:
 *       type: object
 *       required:
 *         - coinsAmount
 *         - gemsPrice
 *       properties:
 *         coinsAmount:
 *           type: number
 *           example: 100
 *         gemsPrice:
 *           type: number
 *           example: 50
 *     SkinInput:
 *       type: object
 *       required:
 *         - name
 *         - priceGems
 *         - skinType
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         priceGems:
 *           type: number
 *         skinType:
 *           type: string
 *         iconUrl:
 *           type: string
 *           nullable: true
*     ShopPowers:
 *       type: object
 *       required:
 *         - name
 *         - priceCoins
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         iconUrl:
 *           type: string
 *           nullable: true
 *         priceCoins:
 *           type: number

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
 * @openapi
 * /shop/add/skin:
 *   post:
 *     tags:
 *       - Shop
 *     summary: Create a new skin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SkinInput'
 *     responses:
 *       201:
 *         description: User successfully created
 *       400:
 *         description: Username already exists
 */
router.post("/add/skin", authMiddleware, controller.addSkin);

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
 * @openapi
 * /shop/add/power:
 *   post:
 *     tags:
 *       - Shop
 *     summary: Create a new power
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/ShopPowers"
 *     responses:
 *       201:
 *         description: Power successfully created
 *       400:
 *         description: Bad request
 */
router.post("/add/power", authMiddleware, controller.addPower);

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
 *             $ref: '#/components/schemas/BuyGems'
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

/**
 * @swagger
 * /shop/exchange/coins:
 *   post:
 *     summary: Purchase a Coins
 *     tags: [Shop]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExchangeCoins'
 *     responses:
 *       200:
 *         description: Coins purchased successfully
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
 *         description: Not enough gems
 *       404:
 *         description: User not found
 */
router.post("/exchange/coins", authMiddleware, controller.exchangeCoins);

export default router;
