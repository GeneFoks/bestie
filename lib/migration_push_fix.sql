-- Push subscriptions fix: add `subscription` JSONB column
-- The original migration stored p256dh/auth as separate TEXT columns,
-- but the API stores and reads the full subscription object as JSONB.

-- Add the subscription JSONB column (safe if already exists)
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS subscription JSONB;

-- Make p256dh / auth optional (they may not exist in new rows)
ALTER TABLE push_subscriptions
  ALTER COLUMN p256dh DROP NOT NULL,
  ALTER COLUMN auth   DROP NOT NULL;

-- Back-fill subscription JSON from existing rows if they have the data
UPDATE push_subscriptions
SET subscription = jsonb_build_object(
  'endpoint', endpoint,
  'keys', jsonb_build_object('p256dh', p256dh, 'auth', auth)
)
WHERE subscription IS NULL
  AND p256dh IS NOT NULL
  AND auth   IS NOT NULL;
