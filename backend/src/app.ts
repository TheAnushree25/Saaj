import { fileURLToPath } from "node:url";
import { serveStatic } from "@hono/node-server/serve-static";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { AppEnv } from "./app-env.ts";
import { env } from "./config/env.ts";
import { db } from "./db/client.ts";
import { AppError } from "./lib/errors.ts";
import { handleError } from "./middleware/error-handler.ts";
import { requestLogger } from "./middleware/request-logger.ts";
import { adminRoutes } from "./modules/admin/admin.routes.ts";
import { artistPanelRoutes } from "./modules/artist-panel/artist.routes.ts";
import { authRoutes } from "./modules/auth/auth.routes.ts";
import { bookingRoutes } from "./modules/bookings/bookings.routes.ts";
import { catalogueRoutes } from "./modules/catalogue/catalogue.routes.ts";
import { meRoutes } from "./modules/me/me.routes.ts";
import { paymentRoutes, webhookRoutes } from "./modules/payments/payments.routes.ts";
import { uploadRoutes } from "./modules/uploads/uploads.routes.ts";

/** backend/public, found from this file so it works from src/ (dev) and dist/ (production) alike. */
const publicDir = fileURLToPath(new URL("../public", import.meta.url));

export const app = new Hono<AppEnv>()
  .use(requestId())
  .use(requestLogger)
  // The demo photos the seed points at. Served before secureHeaders, whose
  // same-origin resource policy would stop apps on other origins showing them.
  .use(
    "/demo/*",
    serveStatic({
      root: publicDir,
      onFound: (_path, c) => {
        c.header("Cache-Control", "public, max-age=604800");
        c.header("Cross-Origin-Resource-Policy", "cross-origin");
        c.header("X-Content-Type-Options", "nosniff");
      },
    }),
  )
  .use(secureHeaders())
  .use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization", "X-Client"],
      exposeHeaders: ["X-Request-Id"],
      maxAge: 600,
    }),
  )
  .use(
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: () => {
        throw new AppError(413, "PAYLOAD_TOO_LARGE", "That request is too large.");
      },
    }),
  )
  .get("/health", (c) => c.json({ ok: true }))
  .get("/health/ready", async (c) => {
    await db.execute(sql`select 1`);
    return c.json({ ok: true, database: "up" });
  })
  .route("/v1/auth", authRoutes)
  .route("/v1", catalogueRoutes)
  .route("/v1/me", meRoutes)
  .route("/v1/bookings", bookingRoutes)
  .route("/v1/payments", paymentRoutes)
  .route("/v1/webhooks", webhookRoutes)
  .route("/v1/uploads", uploadRoutes)
  .route("/v1/artist", artistPanelRoutes)
  .route("/v1/admin", adminRoutes)
  .notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "There is no such endpoint." } }, 404))
  .onError(handleError);
