import { timestamp, uuid } from "drizzle-orm/pg-core";

/** A timestamp that remembers its time zone. Always use this, never a bare timestamp. */
export const timestamptz = () => timestamp({ withTimezone: true });

export const id = () => uuid().primaryKey().defaultRandom();

export const createdAt = () => timestamptz().notNull().defaultNow();

export const timestamps = () => ({
  createdAt: createdAt(),
  updatedAt: timestamptz()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
