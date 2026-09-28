import { and, eq, inArray, sql } from "drizzle-orm";
import { env } from "../../config/env.ts";
import { db, type Executor } from "../../db/client.ts";
import { artistServices, artists, services, users } from "../../db/schema/index.ts";
import { notFound, unprocessable } from "../../lib/errors.ts";
import { IST, addDays, istDate } from "../../lib/time.ts";
import { isVisibleArtist } from "../catalogue/artist-card.ts";

export async function assertBookableArtist(executor: Executor, artistId: string) {
  const [artist] = await executor
    .select({ id: artists.id, userId: artists.userId, studioName: artists.studioName })
    .from(artists)
    .innerJoin(users, eq(users.id, artists.userId))
    .where(and(eq(artists.id, artistId), isVisibleArtist));
  if (!artist) throw notFound("Artist");
  return artist;
}

/** The services a bride picked from one artist, with their total time, buffer and price. */
export async function loadSelection(executor: Executor, artistId: string, artistServiceIds: string[]) {
  const chosen = [...new Set(artistServiceIds)];
  const rows = await executor
    .select({
      artistServiceId: artistServices.id,
      serviceId: services.id,
      name: services.name,
      pricePaise: artistServices.pricePaise,
      durationMinutes: artistServices.durationMinutes,
      bufferMinutes: artistServices.bufferMinutes,
    })
    .from(artistServices)
    .innerJoin(services, eq(services.id, artistServices.serviceId))
    .where(
      and(
        eq(artistServices.artistId, artistId),
        inArray(artistServices.id, chosen),
        eq(artistServices.isActive, true),
        eq(services.isActive, true),
      ),
    );
  // Keep the bride's order: the first service is the main one.
  const items = chosen.flatMap((id) => rows.filter((row) => row.artistServiceId === id));
  const [main] = items;
  if (!main || items.length !== chosen.length) {
    throw unprocessable("SERVICE_UNAVAILABLE", "One of the chosen services is no longer offered by this artist.");
  }

  return {
    items,
    title: items.length === 1 ? main.name : `${main.name} + ${items.length - 1} more`,
    durationMinutes: items.reduce((total, item) => total + item.durationMinutes, 0),
    bufferMinutes: Math.max(...items.map((item) => item.bufferMinutes)),
    subtotalPaise: items.reduce((total, item) => total + item.pricePaise, 0),
  };
}

type SlotRow = { starts_at: Date | string; available: boolean };

/**
 * Every start time the artist's weekly hours allow between two dates, each
 * marked free or not. Free means: far enough ahead, and neither a live booking
 * (plus buffer) nor her time off overlaps it. It uses the same overlap test
 * (&&) as the database constraint, so what we show and what we accept agree.
 */
export async function findSlots(
  artistId: string,
  fromDate: string,
  toDate: string,
  durationMinutes: number,
  bufferMinutes: number,
) {
  const result = await db.execute<SlotRow>(sql`
    with days as (
      select g.day::date as day
      from generate_series(${fromDate}::date, ${toDate}::date, interval '1 day') as g(day)
    ),
    windows as (
      select (d.day + h.start_time) at time zone ${IST} as opens,
             (d.day + h.end_time) at time zone ${IST} as closes
      from days d
      join artist_weekly_hours h on h.weekday = extract(dow from d.day)
      where h.artist_id = ${artistId}
    ),
    slots as (
      select s as starts_at
      from windows w,
           generate_series(
             w.opens,
             w.closes - make_interval(mins => ${durationMinutes}),
             make_interval(mins => ${env.SLOT_STEP_MINUTES})
           ) as s
    )
    select
      s.starts_at,
      (
        s.starts_at >= now() + make_interval(hours => ${env.MIN_NOTICE_HOURS})
        and not exists (
          select 1 from bookings b
          where b.artist_id = ${artistId}
            and b.status in ('pending_payment', 'confirmed', 'in_progress')
            and not (b.status = 'pending_payment' and b.hold_expires_at < now())
            and tstzrange(b.starts_at, b.blocked_until, '[)')
                && tstzrange(s.starts_at, s.starts_at + make_interval(mins => ${durationMinutes + bufferMinutes}), '[)')
        )
        and not exists (
          select 1 from artist_time_off t
          where t.artist_id = ${artistId}
            and tstzrange(t.starts_at, t.ends_at, '[)')
                && tstzrange(s.starts_at, s.starts_at + make_interval(mins => ${durationMinutes}), '[)')
        )
      ) as available
    from slots s
    order by s.starts_at
  `);
  return result.rows.map((row) => ({ startsAt: new Date(row.starts_at), available: row.available }));
}

/** "09:00 AM", in Indian time, matching the chips the app already draws. */
const timeLabel = new Intl.DateTimeFormat("en-US", {
  timeZone: IST,
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/** Dates as "YYYY-MM-DD" from `from`, `count` days long (noon IST, so no edge cases). */
const datesFrom = (from: string, count: number) =>
  Array.from({ length: count }, (_, i) => istDate(addDays(new Date(`${from}T12:00:00+05:30`), i)));

function assertWithinHorizon(lastDate: string) {
  const latest = istDate(addDays(new Date(), env.BOOKING_HORIZON_DAYS));
  if (lastDate > latest) {
    throw unprocessable("TOO_FAR_AHEAD", `Bookings open ${env.BOOKING_HORIZON_DAYS} days ahead.`);
  }
}

export async function getSlots(artistId: string, date: string, artistServiceIds: string[]) {
  assertWithinHorizon(date);
  await assertBookableArtist(db, artistId);
  const selection = await loadSelection(db, artistId, artistServiceIds);
  const slots = await findSlots(artistId, date, date, selection.durationMinutes, selection.bufferMinutes);
  return {
    date,
    durationMinutes: selection.durationMinutes,
    slots: slots.map((slot) => ({ ...slot, label: timeLabel.format(slot.startsAt) })),
  };
}

/** Which of the next days have at least one free slot, to grey out full days in the picker. */
export async function getCalendar(artistId: string, from: string, days: number, artistServiceIds: string[]) {
  const dates = datesFrom(from, days);
  assertWithinHorizon(dates.at(-1) ?? from);
  await assertBookableArtist(db, artistId);
  const selection = await loadSelection(db, artistId, artistServiceIds);
  const slots = await findSlots(artistId, from, dates.at(-1) ?? from, selection.durationMinutes, selection.bufferMinutes);

  const free = new Set(slots.filter((slot) => slot.available).map((slot) => istDate(slot.startsAt)));
  return { days: dates.map((date) => ({ date, available: free.has(date) })) };
}
