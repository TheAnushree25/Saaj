import { pino } from "pino";
import { env, isProduction } from "../config/env.ts";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ["*.password", "*.newPassword", "*.refreshToken", "*.code"],
  ...(isProduction
    ? {}
    : { transport: { target: "pino-pretty", options: { translateTime: "SYS:HH:MM:ss" } } }),
});

export type Logger = typeof logger;
