import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../src/db/client.ts";
import { artists, portfolioItems, users } from "../src/db/schema/index.ts";
import { hashPassword } from "../src/modules/auth/passwords.ts";
import { createService } from "./fixtures.ts";
import { api, nextPhone, resetDatabase, signUp } from "./helpers.ts";

beforeEach(resetDatabase);

async function adminToken() {
  const phone = nextPhone();
  await db.insert(users).values({
    role: "admin",
    fullName: "Admin",
    phone: `+91${phone}`,
    passwordHash: await hashPassword("admin-password-1"),
  });
  const { body } = await api("POST", "/v1/auth/login", { body: { phone, password: "admin-password-1" } });
  return body.tokens.accessToken as string;
}

async function newArtist() {
  const phone = nextPhone();
  const { body } = await api("POST", "/v1/auth/register/artist", {
    body: {
      fullName: "Meher Basu",
      phone,
      password: "artist-pass-1",
      email: `meher${phone}@example.com`,
      studioName: "Meher Atelier",
      specialty: "Bengali Bridal",
      city: "Kolkata",
      experienceYears: 8,
    },
  });
  return { token: body.tokens.accessToken as string, userId: body.user.id as string };
}

describe("artist onboarding and admin approval", () => {
  it("takes an artist from sign-up to bookable", async () => {
    const service = await createService();
    const artist = await newArtist();
    const admin = await adminToken();

    // 1. Submitting too early lists exactly what is missing.
    const early = await api("POST", "/v1/artist/me/submit", { token: artist.token });
    expect(early.status).toBe(422);
    expect(early.body.error.details).toContain("Your working hours");

    // 2. She completes her profile. (Photos need Cloudinary, so the test sets them directly.)
    await api("PATCH", "/v1/artist/me", {
      token: artist.token,
      body: { bio: "Heritage bridal looks with rich, balanced colour and artful draping for every ritual." },
    });
    const [profile] = await db.update(artists).set({ profileImageUrl: "https://example.com/me.jpg" }).where(eq(artists.userId, artist.userId)).returning();
    await db.insert(portfolioItems).values(
      [1, 2, 3].map((n) => ({ artistId: profile?.id ?? "", imageUrl: `https://example.com/${n}.jpg` })),
    );
    const offered = await api("POST", "/v1/artist/services", {
      token: artist.token,
      body: { serviceId: service.id, pricePaise: 2_000_000, durationMinutes: 90 },
    });
    const hours = await api("PUT", "/v1/artist/hours", {
      token: artist.token,
      body: { hours: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startTime: "08:00", endTime: "19:00" })) },
    });
    expect(offered.status).toBe(201);
    expect(hours.status).toBe(200);

    // 3. Submit, and brides still cannot see her until the admin approves.
    const submitted = await api("POST", "/v1/artist/me/submit", { token: artist.token });
    const hidden = await api("GET", "/v1/artists");
    expect(submitted.body.status).toBe("pending_review");
    expect(hidden.body.total).toBe(0);

    // 4. The admin sees her first in the queue and approves.
    const queue = await api("GET", "/v1/admin/artists", { token: admin });
    expect(queue.body.items[0].status).toBe("pending_review");
    const approved = await api("POST", `/v1/admin/artists/${profile?.id}/approve`, { token: admin });
    expect(approved.body.status).toBe("approved");

    // 5. Now she is listed, and the admin action is in the audit log.
    const listed = await api("GET", "/v1/artists");
    const log = await api("GET", "/v1/admin/audit-logs", { token: admin });
    expect(listed.body.items[0].studioName).toBe("Meher Atelier");
    expect(log.body.items.map((entry: { action: string }) => entry.action)).toContain("artist.approved");
  });

  it("rejects overlapping working hours", async () => {
    const artist = await newArtist();
    const { status, body } = await api("PUT", "/v1/artist/hours", {
      token: artist.token,
      body: {
        hours: [
          { weekday: 1, startTime: "09:00", endTime: "13:00" },
          { weekday: 1, startTime: "12:00", endTime: "18:00" },
        ],
      },
    });
    expect(status).toBe(422);
    expect(body.error.message).toBe("Overlaps another window that day");
  });
});

describe("role walls", () => {
  it("keeps each role to its own panel", async () => {
    const bride = await signUp();
    const artist = await newArtist();

    expect((await api("GET", "/v1/me")).status).toBe(401);
    expect((await api("GET", "/v1/artist/me", { token: bride.tokens.accessToken })).status).toBe(403);
    expect((await api("GET", "/v1/admin/dashboard", { token: artist.token })).status).toBe(403);
    expect((await api("GET", "/v1/admin/dashboard", { token: await adminToken() })).status).toBe(200);
  });

  it("signs a suspended customer out everywhere", async () => {
    const bride = await signUp();
    const admin = await adminToken();
    const suspend = await api("POST", `/v1/admin/users/${bride.user.id}/suspend`, {
      token: admin,
      body: { reason: "Payment fraud reported" },
    });
    const refresh = await api("POST", "/v1/auth/refresh", { body: { refreshToken: bride.tokens.refreshToken } });

    expect(suspend.status).toBe(204);
    expect(refresh.status).toBe(401);
  });
});
