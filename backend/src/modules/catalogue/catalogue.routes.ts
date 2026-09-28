import { Hono } from "hono";
import type { AppEnv } from "../../app-env.ts";
import { pageQuery } from "../../lib/pagination.ts";
import { validate } from "../../lib/validate.ts";
import { noStore, publicCache } from "../../middleware/cache.ts";
import { getCalendar, getSlots } from "../bookings/availability.ts";
import {
  artistsQuery,
  calendarQuery,
  idParam,
  looksQuery,
  searchQuery,
  servicesQuery,
  slotsQuery,
} from "./catalogue.schemas.ts";
import {
  getArtist,
  getService,
  listArtists,
  listCategories,
  listLooks,
  listReviews,
  listServices,
  search,
} from "./catalogue.service.ts";

// Public: brides browse before they sign up. The cache middleware is added per
// route, never with .use(), because this router is mounted at the shared /v1 prefix.
export const catalogueRoutes = new Hono<AppEnv>()
  .get("/categories", publicCache(300), async (c) => c.json({ items: await listCategories() }))
  .get("/services", publicCache(60), validate("query", servicesQuery), async (c) =>
    c.json({ items: await listServices(c.req.valid("query")) }),
  )
  .get("/services/:slug", publicCache(60), async (c) => c.json(await getService(c.req.param("slug"))))
  .get("/artists", publicCache(60), validate("query", artistsQuery), async (c) =>
    c.json(await listArtists(c.req.valid("query"))),
  )
  .get("/artists/:idOrSlug", publicCache(60), async (c) => c.json(await getArtist(c.req.param("idOrSlug"))))
  .get("/artists/:id/reviews", publicCache(60), validate("param", idParam), validate("query", pageQuery), async (c) =>
    c.json(await listReviews(c.req.valid("param").id, c.req.valid("query"))),
  )
  .get("/artists/:id/slots", noStore, validate("param", idParam), validate("query", slotsQuery), async (c) => {
    const { date, services } = c.req.valid("query");
    return c.json(await getSlots(c.req.valid("param").id, date, services));
  })
  .get("/artists/:id/calendar", noStore, validate("param", idParam), validate("query", calendarQuery), async (c) => {
    const { from, days, services } = c.req.valid("query");
    return c.json(await getCalendar(c.req.valid("param").id, from, days, services));
  })
  .get("/looks", publicCache(120), validate("query", looksQuery), async (c) =>
    c.json({ items: await listLooks(c.req.valid("query")) }),
  )
  .get("/search", publicCache(60), validate("query", searchQuery), async (c) =>
    c.json(await search(c.req.valid("query").q)),
  );
