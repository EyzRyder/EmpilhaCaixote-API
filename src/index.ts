import dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response } from "express";
import cors from "cors";
import http from "http";
import { setupWebSocket } from "./websocket";

const port = process.env.SERVER_PORT || 8080;

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

app.use((_: Request, res: Response) => {
  res.status(404).send({ message: "page not found" });
});

//WS

setupWebSocket(server);

server.listen(port, () => {
  console.log(
    "[Server] Ready > The server is running on 0.0.0.0:" +
      port +
      ", url: http://localhost:" +
      port,
  );
});
