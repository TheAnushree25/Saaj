import { Hono } from "hono";
import type { AuthEnv } from "../../app-env.ts";
import { validate } from "../../lib/validate.ts";
import { requireAuth, requireRole } from "../../middleware/auth.ts";
import { idParam } from "../catalogue/catalogue.schemas.ts";
import { startPayment } from "../payments/payments.service.ts";
import { getBookingDetail } from "./booking-detail.ts";
import { cancelSchema, createBookingSchema, paymentSchema, reviewSchema } from "./bookings.schemas.ts";
import {
  cancelBooking,
  completeBooking,
  createBooking,
  createReview,
  startBooking,
} from "./bookings.service.ts";

/** One booking resource for everyone; each action checks who may do it. */
export const bookingRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .post("/", requireRole("customer"), validate("json", createBookingSchema), async (c) => {
    const bookingId = await createBooking(c.var.auth.userId, c.req.valid("json"));
    return c.json(await getBookingDetail(c.var.auth, bookingId), 201);
  })
  .get("/:id", validate("param", idParam), async (c) =>
    c.json(await getBookingDetail(c.var.auth, c.req.valid("param").id)),
  )
  .post("/:id/payments", requireRole("customer"), validate("param", idParam), validate("json", paymentSchema), async (c) =>
    c.json(await startPayment(c.var.auth.userId, c.req.valid("param").id, c.req.valid("json").kind)),
  )
  .post("/:id/cancel", validate("param", idParam), validate("json", cancelSchema), async (c) => {
    const { id } = c.req.valid("param");
    const result = await cancelBooking(c.var.auth, id, c.req.valid("json").reason);
    return c.json({ ...result, booking: await getBookingDetail(c.var.auth, id) });
  })
  .post("/:id/start", requireRole("artist", "admin"), validate("param", idParam), async (c) => {
    await startBooking(c.var.auth, c.req.valid("param").id);
    return c.json(await getBookingDetail(c.var.auth, c.req.valid("param").id));
  })
  .post("/:id/complete", requireRole("artist", "admin"), validate("param", idParam), async (c) => {
    await completeBooking(c.var.auth, c.req.valid("param").id);
    return c.json(await getBookingDetail(c.var.auth, c.req.valid("param").id));
  })
  .post("/:id/review", requireRole("customer"), validate("param", idParam), validate("json", reviewSchema), async (c) =>
    c.json(await createReview(c.var.auth.userId, c.req.valid("param").id, c.req.valid("json")), 201),
  );
