import type { Logger } from "./lib/logger.ts";
import type { AccessClaims } from "./modules/auth/tokens.ts";

/** What every request carries in c.var, set by the middleware in app.ts. */
export type AppEnv = {
  Variables: {
    requestId: string;
    log: Logger;
  };
};

/** Routes behind requireAuth also know who is calling. */
export type AuthEnv = {
  Variables: AppEnv["Variables"] & { auth: AccessClaims };
};
