import { json, urlencoded } from "body-parser";
import cors from "cors";
import express, { type Express } from "express";
import morgan from "morgan";
import { prisma } from "./lib/db";

export const createServer = (): Express => {
  const app = express();
  app
    .disable("x-powered-by")
    .use(morgan("dev"))
    .use(urlencoded({ extended: true }))
    .use(json())
    .use(cors())
    .get("/message/:name", (req, res) => {
      return res.json({ message: `hello ${req.params.name}` });
    })
    .get("/status", async (_, res) => {
      try {
        // Test database connection
        await prisma.$queryRaw`SELECT 1`;
        return res.json({
          ok: true,
          database: "connected",
        });
      } catch (error) {
        return res.status(500).json({
          ok: false,
          database: "disconnected",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

  return app;
};
