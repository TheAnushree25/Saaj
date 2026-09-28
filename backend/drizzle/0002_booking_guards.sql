-- Custom SQL migration file, put your code below! --
-- One artist can never hold two live bookings whose times overlap.
-- The range runs from the start to blocked_until (the end plus her travel
-- buffer). '[)' means "includes the start, excludes the end", so a booking
-- ending at 11:00 and the next starting at 11:00 do not collide.
-- Cancelled and expired bookings are ignored, so they free their slot.
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (
    "artist_id" WITH =,
    tstzrange("starts_at", "blocked_until", '[)') WITH &&
  )
  WHERE ("status" IN ('pending_payment', 'confirmed', 'in_progress'));
