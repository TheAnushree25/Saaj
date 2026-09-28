import { createMiddleware } from "hono/factory";

/**
 * Lets phones and CDNs reuse a public answer for `seconds`, and keep showing it
 * for a while longer while a fresh copy loads in the background. Only for data
 * that is the same for everyone: never for anything personal.
 */
export const publicCache = (seconds: number) =>
  createMiddleware(async (c, next) => {
    await next();
    if (c.res.ok) {
      c.header("Cache-Control", `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`);
    }
  });

/** For answers that change minute to minute, like free slots. */
export const noStore = createMiddleware(async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});
