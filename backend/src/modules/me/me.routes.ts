import { Hono } from "hono";
import type { AuthEnv } from "../../app-env.ts";
import { pageQuery } from "../../lib/pagination.ts";
import { validate } from "../../lib/validate.ts";
import { requireAuth, requireRole } from "../../middleware/auth.ts";
import { bookingTabQuery } from "../bookings/bookings.schemas.ts";
import { listCustomerBookings } from "../bookings/bookings.service.ts";
import { idParam } from "../catalogue/catalogue.schemas.ts";
import { markReadSchema, pushTokenSchema, updateMeSchema } from "./me.schemas.ts";
import {
  deleteAccount,
  getMe,
  listNotifications,
  listSavedArtists,
  markNotificationsRead,
  registerPushToken,
  removePushToken,
  saveArtist,
  unsaveArtist,
  updateMe,
} from "./me.service.ts";

/** Everything about the signed-in person. Mounted at /v1/me, so .use(requireAuth) guards only these. */
export const meRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get("/", async (c) => c.json(await getMe(c.var.auth)))
  .patch("/", validate("json", updateMeSchema), async (c) =>
    c.json({ user: await updateMe(c.var.auth, c.req.valid("json")) }),
  )
  .delete("/", requireRole("customer"), async (c) => {
    await deleteAccount(c.var.auth);
    return c.body(null, 204);
  })
  .get("/bookings", requireRole("customer"), validate("query", bookingTabQuery), async (c) =>
    c.json({ items: await listCustomerBookings(c.var.auth.userId, c.req.valid("query").tab) }),
  )
  .get("/saved-artists", requireRole("customer"), async (c) =>
    c.json({ items: await listSavedArtists(c.var.auth.userId) }),
  )
  .put("/saved-artists/:id", requireRole("customer"), validate("param", idParam), async (c) => {
    await saveArtist(c.var.auth.userId, c.req.valid("param").id);
    return c.body(null, 204);
  })
  .delete("/saved-artists/:id", requireRole("customer"), validate("param", idParam), async (c) => {
    await unsaveArtist(c.var.auth.userId, c.req.valid("param").id);
    return c.body(null, 204);
  })
  .post("/push-tokens", validate("json", pushTokenSchema), async (c) => {
    const { token, platform } = c.req.valid("json");
    await registerPushToken(c.var.auth.userId, token, platform);
    return c.body(null, 204);
  })
  .delete("/push-tokens", validate("json", pushTokenSchema), async (c) => {
    await removePushToken(c.var.auth.userId, c.req.valid("json").token);
    return c.body(null, 204);
  })
  .get("/notifications", validate("query", pageQuery), async (c) =>
    c.json(await listNotifications(c.var.auth.userId, c.req.valid("query"))),
  )
  .post("/notifications/read", validate("json", markReadSchema), async (c) => {
    await markNotificationsRead(c.var.auth.userId, c.req.valid("json").ids);
    return c.body(null, 204);
  });
