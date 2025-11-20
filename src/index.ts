import dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response } from "express";
import cors from "cors";
import http from "http";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger";
import { setupWebSocket } from "./websocket";
import authRoutes from "./modules/auth/auth.routes";
import walletRoutes from "./modules/wallet/wallet.routes";

const PORT = process.env.SERVER_PORT || "8080";

const app: Express = express();
const server = http.createServer(app);

const corsConfig = {
  origin: "*",
  credentials: false,
};

app
  .use(cors(corsConfig))
  .use(express.json())
  .use(express.urlencoded({ extended: false }))
  .use((req: Request, _: Response, next) => {
    console.log(req.path, req.method);
    next();
  });

//Routes
app.get("/", (_: Request, res: Response) => {
  res.send({ message: "hello world!" });
});
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec(PORT))
);
app.use("/auth", authRoutes);
app.use("/wallet", walletRoutes);
app.use((_: Request, res: Response) => {
  res.status(404).send({ message: "page not found" });
});

//WS

setupWebSocket(server);

server.listen(PORT, () => {
  console.log(
    "[Server] Ready > The server is running on 0.0.0.0:" +
      PORT +
      ", url: http://localhost:" +
      PORT,
  );
});
