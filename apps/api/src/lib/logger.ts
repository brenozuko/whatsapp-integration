import pino from "pino";
import { env } from "../config/env";

const isDevelopment = env.NODE_ENV === "development";

// Create a base logger
const logger = pino({
  level: env.LOG_LEVEL || "info",
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Create a child logger for HTTP requests
export const httpLogger = logger.child({
  name: "http",
});

// Create a child logger for application logs
export const appLogger = logger.child({
  name: "app",
});

// Create a child logger for database operations
export const dbLogger = logger.child({
  name: "db",
});

// Create a child logger for errors
export const errorLogger = logger.child({
  name: "error",
});

export default logger;
