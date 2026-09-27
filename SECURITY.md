# Security

## Reporting a problem

If you find a security issue (for example, a way to read another bride's
bookings), **do not open a public issue**. Contact the repository owner
directly through GitHub.

## Rules for this codebase

- `.env` is git-ignored and must never be committed. Only the Supabase URL and
  the public anon key may use the `EXPO_PUBLIC_` prefix, because anything with
  that prefix is readable inside the installed app.
- The Supabase **service role** key, the **Razorpay secret** and any **webhook
  secret** live only in Supabase Edge Function secrets, never in this repo.
- Every database table has row-level security enabled; the app decides what to
  show, the database decides what exists.
- Payment amounts are always read from the database, never sent by the app.

If a secret is ever committed, rotate it immediately: removing it from the
latest commit does not remove it from git history.
