import { eq, inArray } from "drizzle-orm";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { env } from "../../config/env.ts";
import { db } from "../../db/client.ts";
import { notifications, pushTokens } from "../../db/schema/index.ts";

const expo = new Expo({ accessToken: env.EXPO_ACCESS_TOKEN });

/** Runs in the background: sends one saved notification to every phone of its owner. */
export async function deliverPush(notificationId: string) {
  const [note] = await db.select().from(notifications).where(eq(notifications.id, notificationId));
  if (!note) return;

  const devices = await db
    .select({ token: pushTokens.token })
    .from(pushTokens)
    .where(eq(pushTokens.userId, note.userId));

  const messages: ExpoPushMessage[] = devices
    .filter((device) => Expo.isExpoPushToken(device.token))
    .map((device) => ({
      to: device.token,
      title: note.title,
      body: note.body,
      data: note.data ?? {},
      sound: "default",
    }));

  // Expo accepts up to 100 messages per request; chunkPushNotifications splits them.
  for (const chunk of expo.chunkPushNotifications(messages)) {
    const tickets = await expo.sendPushNotificationsAsync(chunk);
    // A phone that uninstalled the app answers DeviceNotRegistered: forget that token.
    const gone = tickets.flatMap((ticket, i) =>
      ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered"
        ? [String(chunk[i]?.to)]
        : [],
    );
    if (gone.length > 0) await db.delete(pushTokens).where(inArray(pushTokens.token, gone));
  }
}
