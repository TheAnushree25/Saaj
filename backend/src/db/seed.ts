import { eq, sql } from "drizzle-orm";
import { isLiveProduction } from "../config/env.ts";
import { readableCode } from "../lib/crypto.ts";
import { logger } from "../lib/logger.ts";
import { addDays, addMinutes } from "../lib/time.ts";
import { hashPassword } from "../modules/auth/passwords.ts";
import { db, pool } from "./client.ts";
import { one } from "./helpers.ts";
import {
  artistServices,
  artistWeeklyHours,
  artists,
  bookingItems,
  bookings,
  payments,
  portfolioItems,
  reviews,
  serviceCategories,
  services,
  users,
} from "./schema/index.ts";
import * as demo from "./seed-data.ts";

if (isLiveProduction) {
  logger.error("Refusing to seed a production database.");
  process.exit(1);
}

const PASSWORD = process.env.SEED_PASSWORD ?? "SaajDev!2026";
const passwordHash = await hashPassword(PASSWORD);

// Start from empty, so running the seed twice gives the same result.
await db.execute(
  sql`truncate table users, service_categories, webhook_events, otp_codes restart identity cascade`,
);

const addUser = async (fullName: string, phone: string, role: "customer" | "artist" | "admin") =>
  one(await db.insert(users).values({ fullName, phone, role, passwordHash }).returning({ id: users.id }));

await addUser("Saaj Admin", "+919000000001", "admin");
await addUser("Ayesha Khan", "+919000000002", "customer");
const reviewerIds = await Promise.all(
  demo.reviewers.map((reviewer, i) => addUser(reviewer.name, `+91900000001${i}`, "customer")),
);

const categoryIds = new Map<string, string>();
for (const category of demo.categories) {
  const row = one(await db.insert(serviceCategories).values(category).returning({ id: serviceCategories.id }));
  categoryIds.set(category.slug, row.id);
}

const serviceRows: ((typeof demo.services)[number] & { id: string })[] = [];
for (const [i, service] of demo.services.entries()) {
  const row = one(
    await db
      .insert(services)
      .values({
        categoryId: categoryIds.get(service.category) ?? "",
        slug: service.slug,
        name: service.name,
        description: service.description,
        inclusions: service.inclusions,
        imageUrl: demo.photoUrl(service.photo),
        defaultDurationMinutes: service.minutes,
        sortOrder: i,
      })
      .returning({ id: services.id }),
  );
  serviceRows.push({ ...service, id: row.id });
}

const DAY_MS = 24 * 60 * 60_000;

for (const [i, profile] of demo.artists.entries()) {
  const user = await addUser(profile.name, `+9191000000${String(i + 1).padStart(2, "0")}`, "artist");
  const slug = `${profile.studio.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${readableCode(4).toLowerCase()}`;
  const artist = one(
    await db
      .insert(artists)
      .values({
        userId: user.id,
        slug,
        studioName: profile.studio,
        specialty: profile.specialty,
        city: profile.city,
        experienceYears: profile.years,
        tagline: profile.tagline,
        bio: profile.bio,
        profileImageUrl: demo.photoUrl(profile.photo),
        coverImageUrl: demo.photoUrl(profile.photo),
        status: "approved",
        approvedAt: new Date(),
        isFeatured: i < 3,
      })
      .returning({ id: artists.id }),
  );

  // Everyone offers the three essentials, plus three more that rotate per artist.
  const essentials = ["bridal-makeup", "hair-styling", "saree-draping"];
  const extras = serviceRows.filter((s) => !essentials.includes(s.slug));
  const offered = [
    ...serviceRows.filter((s) => essentials.includes(s.slug)),
    ...[0, 1, 2].map((k) => extras[(i + k * 2) % extras.length]).filter((s) => s !== undefined),
  ];
  const offerings = await db
    .insert(artistServices)
    .values(
      offered.map((service) => ({
        artistId: artist.id,
        serviceId: service.id,
        // Rounded to the nearest ₹500, stored in paise.
        pricePaise: Math.round((service.rupees * profile.priceFactor) / 500) * 500 * 100,
        durationMinutes: service.minutes,
        bufferMinutes: service.minutes <= 30 ? 15 : 30,
      })),
    )
    .returning({ id: artistServices.id, serviceId: artistServices.serviceId, pricePaise: artistServices.pricePaise });

  // Monday to Saturday 07:00-20:00 (brides start early), Sunday 08:00-14:00.
  await db.insert(artistWeeklyHours).values([
    ...[1, 2, 3, 4, 5, 6].map((weekday) => ({ artistId: artist.id, weekday, startTime: "07:00", endTime: "20:00" })),
    { artistId: artist.id, weekday: 0, startTime: "08:00", endTime: "14:00" },
  ]);

  // Demo photos, starting with her own. Real ones arrive when the artist uploads her work.
  const firstPhoto = demo.photos.indexOf(profile.photo);
  await db.insert(portfolioItems).values(
    demo.occasions.map((occasion, k) => ({
      artistId: artist.id,
      imageUrl: demo.photoUrl(demo.photos[(firstPhoto + k) % demo.photos.length] ?? profile.photo),
      width: 1024,
      height: 1280,
      occasion,
      sortOrder: k,
      isFeatured: i < 3 && k === 0,
    })),
  );

  // Three finished weddings with reviews, so ratings and review lists are real.
  const bridal = offerings.find((o) => o.serviceId === serviceRows[0]?.id);
  if (!bridal) continue;
  for (const [k, reviewer] of demo.reviewers.entries()) {
    const startsAt = new Date(Math.floor((Date.now() - (k + 1) * 45 * DAY_MS) / 3_600_000) * 3_600_000);
    const endsAt = addMinutes(startsAt, 90);
    const booking = one(
      await db
        .insert(bookings)
        .values({
          ref: `SJ${readableCode(6)}`,
          customerId: reviewerIds[k]?.id ?? "",
          artistId: artist.id,
          status: "completed",
          title: "Bridal Makeup",
          startsAt,
          endsAt,
          blockedUntil: addMinutes(endsAt, 30),
          eventType: "Wedding",
          venue: `${profile.city}`,
          contactName: reviewer.name,
          contactPhone: `+91900000001${k}`,
          subtotalPaise: bridal.pricePaise,
          totalPaise: bridal.pricePaise,
          advancePaise: Math.round(bridal.pricePaise * 0.2),
          paidPaise: bridal.pricePaise,
          commissionPercent: 15,
          confirmedAt: addDays(startsAt, -30),
          startedAt: startsAt,
          completedAt: endsAt,
        })
        .returning({ id: bookings.id }),
    );
    await db.insert(bookingItems).values({
      bookingId: booking.id,
      artistServiceId: bridal.id,
      serviceId: bridal.serviceId,
      name: "Bridal Makeup",
      pricePaise: bridal.pricePaise,
      durationMinutes: 90,
    });
    const advance = Math.round(bridal.pricePaise * 0.2);
    await db.insert(payments).values([
      { bookingId: booking.id, kind: "advance", amountPaise: advance, status: "paid", razorpayOrderId: `order_seed_${readableCode(10)}`, paidAt: addDays(startsAt, -30) },
      { bookingId: booking.id, kind: "balance", amountPaise: bridal.pricePaise - advance, status: "paid", razorpayOrderId: `order_seed_${readableCode(10)}`, paidAt: startsAt },
    ]);
    const rating = k === 2 ? 4 : 5;
    await db.insert(reviews).values({
      bookingId: booking.id,
      customerId: reviewerIds[k]?.id ?? "",
      artistId: artist.id,
      rating,
      comment: reviewer.comment,
    });
    await db
      .update(artists)
      .set({ ratingSum: sql`${artists.ratingSum} + ${rating}`, ratingCount: sql`${artists.ratingCount} + 1` })
      .where(eq(artists.id, artist.id));
  }
}

logger.info(
  `Seeded ${demo.services.length} services and ${demo.artists.length} artists. ` +
    `Sign in with password ${PASSWORD}: admin 9000000001, bride 9000000002, artists 9100000001-9100000008.`,
);
await pool.end();
