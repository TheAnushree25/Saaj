import { sql } from "drizzle-orm";
import { fromDrizzle } from "pg-boss";
import type { Executor } from "../../db/client.ts";
import { notifications } from "../../db/schema/index.ts";
import { Queue, boss } from "../../jobs/boss.ts";

export type Message = { title: string; body: string; data?: Record<string, string> };

/**
 * Saves an in-app notification for each person and queues its push, using the
 * caller's transaction: if the booking change rolls back, so does the message.
 * (This is the "outbox" pattern. No committed change without its message.)
 */
export async function notify(executor: Executor, userIds: string[], message: Message) {
  if (userIds.length === 0) return;

  const rows = await executor
    .insert(notifications)
    .values(userIds.map((userId) => ({ userId, ...message })))
    .returning({ id: notifications.id });

  await boss.insert(
    Queue.push,
    rows.map((row) => ({ data: { notificationId: row.id } })),
    { db: fromDrizzle(executor, sql) },
  );
}
