import { Hono } from "hono";
import type { AuthEnv } from "../../app-env.ts";
import { validate } from "../../lib/validate.ts";
import { requireAuth, requireRole } from "../../middleware/auth.ts";
import { idParam } from "../catalogue/catalogue.schemas.ts";
import {
  artistBookingsQuery,
  earningsQuery,
  hoursSchema,
  offeringSchema,
  portfolioSchema,
  timeOffSchema,
  updateOfferingSchema,
  updatePortfolioSchema,
  updateProfileSchema,
} from "./artist.schemas.ts";
import {
  addOffering,
  addPortfolioItem,
  addTimeOff,
  earnings,
  getHours,
  getProfile,
  listArtistBookings,
  listOfferings,
  listPortfolio,
  listTimeOff,
  removePortfolioItem,
  removeTimeOff,
  replaceHours,
  submitForReview,
  updateOffering,
  updatePortfolioItem,
  updateProfile,
} from "./artist.service.ts";

/** The artist web panel. Mounted at /v1/artist; only signed-in artists get past the first line. */
export const artistPanelRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole("artist"))
  .get("/me", async (c) => c.json(await getProfile(c.var.auth.userId)))
  .patch("/me", validate("json", updateProfileSchema), async (c) =>
    c.json(await updateProfile(c.var.auth.userId, c.req.valid("json"))),
  )
  .post("/me/submit", async (c) => c.json(await submitForReview(c.var.auth.userId)))

  .get("/services", async (c) => c.json({ items: await listOfferings(c.var.auth.userId) }))
  .post("/services", validate("json", offeringSchema), async (c) =>
    c.json(await addOffering(c.var.auth.userId, c.req.valid("json")), 201),
  )
  .patch("/services/:id", validate("param", idParam), validate("json", updateOfferingSchema), async (c) =>
    c.json(await updateOffering(c.var.auth.userId, c.req.valid("param").id, c.req.valid("json"))),
  )

  .get("/hours", async (c) => c.json({ hours: await getHours(c.var.auth.userId) }))
  .put("/hours", validate("json", hoursSchema), async (c) =>
    c.json({ hours: await replaceHours(c.var.auth.userId, c.req.valid("json")) }),
  )

  .get("/time-off", async (c) => c.json({ items: await listTimeOff(c.var.auth.userId) }))
  .post("/time-off", validate("json", timeOffSchema), async (c) =>
    c.json(await addTimeOff(c.var.auth.userId, c.req.valid("json")), 201),
  )
  .delete("/time-off/:id", validate("param", idParam), async (c) => {
    await removeTimeOff(c.var.auth.userId, c.req.valid("param").id);
    return c.body(null, 204);
  })

  .get("/portfolio", async (c) => c.json({ items: await listPortfolio(c.var.auth.userId) }))
  .post("/portfolio", validate("json", portfolioSchema), async (c) =>
    c.json(await addPortfolioItem(c.var.auth.userId, c.req.valid("json")), 201),
  )
  .patch("/portfolio/:id", validate("param", idParam), validate("json", updatePortfolioSchema), async (c) =>
    c.json(await updatePortfolioItem(c.var.auth.userId, c.req.valid("param").id, c.req.valid("json"))),
  )
  .delete("/portfolio/:id", validate("param", idParam), async (c) => {
    await removePortfolioItem(c.var.auth.userId, c.req.valid("param").id);
    return c.body(null, 204);
  })

  .get("/bookings", validate("query", artistBookingsQuery), async (c) =>
    c.json({ items: await listArtistBookings(c.var.auth.userId, c.req.valid("query").tab) }),
  )
  .get("/earnings", validate("query", earningsQuery), async (c) => {
    const { from, to } = c.req.valid("query");
    return c.json(await earnings(c.var.auth.userId, from, to));
  });
