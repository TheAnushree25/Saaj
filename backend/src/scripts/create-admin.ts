import { z } from "zod";
import { db, pool } from "../db/client.ts";
import { users } from "../db/schema/index.ts";
import { phoneSchema } from "../lib/phone.ts";
import { hashPassword } from "../modules/auth/passwords.ts";

/*
 * Admins are never created through the API: no screen anywhere can make one.
 * Someone with access to the server runs this instead:
 *
 *   npm run admin:create "Anushree" 98xxxxxxxx "a long passphrase"
 *
 * If the number already has an account, it is promoted to admin.
 */
const [name, phone, password] = process.argv.slice(2);

const input = z
  .object({
    name: z.string().trim().min(2, "Give a name, e.g. \"Anushree\""),
    phone: phoneSchema,
    password: z.string().min(12, "Admins need a password of at least 12 characters"),
  })
  .parse({ name, phone, password });

const passwordHash = await hashPassword(input.password);
await db
  .insert(users)
  .values({ role: "admin", fullName: input.name, phone: input.phone, passwordHash })
  .onConflictDoUpdate({
    target: users.phone,
    set: { role: "admin", status: "active", passwordHash, failedLoginCount: 0, lockedUntil: null },
  });

console.log(`Admin ready: ${input.phone}`);
await pool.end();
