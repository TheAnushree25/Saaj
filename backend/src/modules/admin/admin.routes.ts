import { Hono } from "hono";
import type { AuthEnv } from "../../app-env.ts";
import { pageQuery } from "../../lib/pagination.ts";
import { validate } from "../../lib/validate.ts";
import { requireAuth, requireRole } from "../../middleware/auth.ts";
import { getBookingDetail } from "../bookings/booking-detail.ts";
import { idParam } from "../catalogue/catalogue.schemas.ts";
import {
  artistFlagsSchema,
  artistsAdminQuery,
  bookingsAdminQuery,
  categorySchema,
  categoryUpdateSchema,
  customersQuery,
  featureSchema,
  paymentsAdminQuery,
  reasonSchema,
  reviewModerationSchema,
  serviceSchema,
  serviceUpdateSchema,
} from "./admin.schemas.ts";
import {
  approveArtist,
  dashboard,
  getArtistForAdmin,
  getCustomer,
  listAllCategories,
  listAllServices,
  listArtistsForAdmin,
  listAuditLogs,
  listBookingsForAdmin,
  listCustomers,
  listPaymentsForAdmin,
  listReviewsForAdmin,
  moderateReview,
  reinstateArtist,
  rejectArtist,
  saveCategory,
  saveService,
  setArtistFeatured,
  setPortfolioFeatured,
  setUserStatus,
  suspendArtist,
} from "./admin.service.ts";

/** The admin web panel. Mounted at /v1/admin; admins only. Cancelling uses /v1/bookings/:id/cancel. */
export const adminRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole("admin"))
  .get("/dashboard", async (c) => c.json(await dashboard()))

  .get("/customers", validate("query", customersQuery), async (c) => c.json(await listCustomers(c.req.valid("query"))))
  .get("/customers/:id", validate("param", idParam), async (c) => c.json(await getCustomer(c.req.valid("param").id)))
  .post("/users/:id/suspend", validate("param", idParam), validate("json", reasonSchema), async (c) => {
    await setUserStatus(c.var.auth, c.req.valid("param").id, "suspended", c.req.valid("json").reason);
    return c.body(null, 204);
  })
  .post("/users/:id/reactivate", validate("param", idParam), validate("json", reasonSchema), async (c) => {
    await setUserStatus(c.var.auth, c.req.valid("param").id, "active", c.req.valid("json").reason);
    return c.body(null, 204);
  })

  .get("/artists", validate("query", artistsAdminQuery), async (c) => c.json(await listArtistsForAdmin(c.req.valid("query"))))
  .get("/artists/:id", validate("param", idParam), async (c) => c.json(await getArtistForAdmin(c.req.valid("param").id)))
  .post("/artists/:id/approve", validate("param", idParam), async (c) =>
    c.json(await approveArtist(c.var.auth, c.req.valid("param").id)),
  )
  .post("/artists/:id/reject", validate("param", idParam), validate("json", reasonSchema), async (c) =>
    c.json(await rejectArtist(c.var.auth, c.req.valid("param").id, c.req.valid("json").reason)),
  )
  .post("/artists/:id/suspend", validate("param", idParam), validate("json", reasonSchema), async (c) =>
    c.json(await suspendArtist(c.var.auth, c.req.valid("param").id, c.req.valid("json").reason)),
  )
  .post("/artists/:id/reinstate", validate("param", idParam), async (c) =>
    c.json(await reinstateArtist(c.var.auth, c.req.valid("param").id)),
  )
  .patch("/artists/:id", validate("param", idParam), validate("json", artistFlagsSchema), async (c) => {
    await setArtistFeatured(c.var.auth, c.req.valid("param").id, c.req.valid("json").isFeatured);
    return c.body(null, 204);
  })

  .get("/categories", async (c) => c.json({ items: await listAllCategories() }))
  .post("/categories", validate("json", categorySchema), async (c) =>
    c.json(await saveCategory(c.var.auth, c.req.valid("json")), 201),
  )
  .patch("/categories/:id", validate("param", idParam), validate("json", categoryUpdateSchema), async (c) =>
    c.json(await saveCategory(c.var.auth, c.req.valid("json"), c.req.valid("param").id)),
  )
  .get("/services", async (c) => c.json({ items: await listAllServices() }))
  .post("/services", validate("json", serviceSchema), async (c) =>
    c.json(await saveService(c.var.auth, c.req.valid("json")), 201),
  )
  .patch("/services/:id", validate("param", idParam), validate("json", serviceUpdateSchema), async (c) =>
    c.json(await saveService(c.var.auth, c.req.valid("json"), c.req.valid("param").id)),
  )
  .patch("/portfolio/:id", validate("param", idParam), validate("json", featureSchema), async (c) => {
    await setPortfolioFeatured(c.var.auth, c.req.valid("param").id, c.req.valid("json").isFeatured);
    return c.body(null, 204);
  })

  .get("/bookings", validate("query", bookingsAdminQuery), async (c) => c.json(await listBookingsForAdmin(c.req.valid("query"))))
  .get("/bookings/:id", validate("param", idParam), async (c) =>
    c.json(await getBookingDetail(c.var.auth, c.req.valid("param").id)),
  )
  .get("/payments", validate("query", paymentsAdminQuery), async (c) => c.json(await listPaymentsForAdmin(c.req.valid("query"))))
  .get("/reviews", validate("query", pageQuery), async (c) => c.json(await listReviewsForAdmin(c.req.valid("query"))))
  .patch("/reviews/:id", validate("param", idParam), validate("json", reviewModerationSchema), async (c) => {
    await moderateReview(c.var.auth, c.req.valid("param").id, c.req.valid("json").isPublished);
    return c.body(null, 204);
  })
  .get("/audit-logs", validate("query", pageQuery), async (c) => c.json(await listAuditLogs(c.req.valid("query"))));
