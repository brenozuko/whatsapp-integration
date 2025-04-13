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
    .use(
      cors({
        origin: "http://localhost:3001",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
      })
    )
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
        });
      }
    });

  return app;
};
