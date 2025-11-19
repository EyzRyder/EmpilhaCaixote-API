import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
dotenv.config();
import cors from "cors";
const port = process.env.SERVER_PORT || 8080;
const server: Express = express();

const corsConfig = {
  origin: "http://localhost:3000",
  credentials: true,
  optionSuccessStatus: 200,
};

server
  .use(cors(corsConfig))
  .use(express.json())
  .use(express.urlencoded({ extended: false }))
  .use((req: Request, _: Response, next) => {
    console.log(req.path, req.method);
    next();
  });

server.get("/", (_: Request, res: Response) => {
  res.send({ message: "hello world!" });
});

server.use((_: Request, res: Response) => {
  res.status(404).send({ message: "page not found" });
});

server.listen(port, () => {
  console.log(
    "[Server] Ready > The server is running on 0.0.0.0:" +
      port +
      ", url: http://localhost:" +
      port,
  );
});

export default server;
