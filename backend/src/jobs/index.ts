import { env } from "../config/env.ts";
import { db } from "../db/client.ts";
import { logger } from "../lib/logger.ts";
import { IST } from "../lib/time.ts";
import { expireHolds, sendReminders } from "../modules/bookings/bookings.service.ts";
import { deliverPush } from "../modules/notifications/push.ts";
import { processRefund } from "../modules/payments/refunds.ts";
import { Queue, boss } from "./boss.ts";

/**
 * Starts the queue, makes sure every queue exists, then (unless JOBS_ENABLED
 * is false, as in tests) schedules the timed jobs and starts the workers.
 */
export async function startJobs() {
  await boss.start();

  await boss.createQueue(Queue.push, { retryLimit: 5, retryDelay: 30, retryBackoff: true });
  await boss.createQueue(Queue.refund, { retryLimit: 10, retryDelay: 60, retryBackoff: true });
  await boss.createQueue(Queue.expireHolds, { retryLimit: 0 });
  await boss.createQueue(Queue.reminders, { retryLimit: 2 });

  if (!env.JOBS_ENABLED) return;

  // Cron: minute hour day-of-month month day-of-week. "* * * * *" = every minute.
  await boss.schedule(Queue.expireHolds, "* * * * *", null, { tz: IST });
  await boss.schedule(Queue.reminders, "0 * * * *", null, { tz: IST });

  await boss.work(Queue.expireHolds, async () => {
    const count = await expireHolds(db);
    if (count > 0) logger.info({ count }, "Released expired holds");
  });
  await boss.work(Queue.reminders, async () => {
    await sendReminders();
  });
  await boss.work<{ notificationId: string }>(Queue.push, async ([job]) => {
    if (job) await deliverPush(job.data.notificationId);
  });
  await boss.work<{ refundId: string }>(Queue.refund, async ([job]) => {
    if (job) await processRefund(job.data.refundId);
  });

  logger.info("Background jobs running");
}

/** Lets running jobs finish (up to 10 seconds), then disconnects. */
export const stopJobs = () => boss.stop({ graceful: true, timeout: 10_000 });
