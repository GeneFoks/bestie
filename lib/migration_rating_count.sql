-- Add rating_count to users so browse cards can show "★ 4.5 (3)"
ALTER TABLE users ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

-- Back-fill from existing bookings data
-- Counts all bookings where the user was rated (as provider: rating_seeker, as seeker: rating_provider)
UPDATE users u
SET rating_count = (
  SELECT COUNT(*) FROM (
    SELECT id FROM bookings WHERE provider_id = u.id AND rating_seeker IS NOT NULL
    UNION ALL
    SELECT id FROM bookings WHERE seeker_id   = u.id AND rating_provider IS NOT NULL
  ) sub
);
