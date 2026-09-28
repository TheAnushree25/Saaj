import { hash, verify } from "@node-rs/argon2";

// Argon2id with the library defaults (19 MiB of memory, 2 passes), which match
// OWASP's recommendation. Slow on purpose: ~50 ms for us, years for an attacker
// trying billions of guesses against a stolen database.
export const hashPassword = (password: string) => hash(password);

export const verifyPassword = (passwordHash: string, password: string) => verify(passwordHash, password);

let dummy: Promise<string> | undefined;

/**
 * When someone signs in with a number that has no account, we still verify the
 * password against this throwaway hash. Both answers then take the same ~50 ms,
 * so response time cannot reveal which numbers are registered.
 */
export const dummyHash = () => (dummy ??= hash("placeholder-password-never-matches"));
