import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../app-env.ts";
import { logger } from "../lib/logger.ts";

/** Gives each request its own logger (tagged with the request id) and logs one line per request. */
export const requestLogger = createMiddleware<AppEnv>(async (c, next) => {
  const started = performance.now();
  const log = logger.child({ requestId: c.var.requestId });
  c.set("log", log);

  await next();

  log.info(
    {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms: Math.round(performance.now() - started),
    },
    "request",
  );
});
