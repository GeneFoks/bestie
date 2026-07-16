# Production schema snapshot — 2026-07-15

Source of truth for what actually exists in the production Supabase database
(`public` schema, all 40 base tables with columns, types, defaults).

Taken via `information_schema` dump from the live DB. The old `lib/schema.sql`
is the ORIGINAL bootstrap and is badly stale — do NOT trust it. The real
schema = this snapshot + every `lib/migration_*.sql` applied after this date.

**Rule going forward:** every DB change is a `lib/migration_*.sql` file,
run in the Supabase SQL editor AND committed in the same PR as the code
that uses it. Refresh this snapshot occasionally with the query at the bottom.

```
TABLE activity_packages
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid
  title text NOT NULL
  activity_type text NOT NULL
  description text
  price_per_session numeric DEFAULT 0
  is_free boolean DEFAULT false
  created_at timestamp with time zone DEFAULT now()
  scheduled_at timestamp with time zone
TABLE analytics_events
  id bigint NOT NULL
  created_at timestamp with time zone NOT NULL DEFAULT now()
  session_id text NOT NULL
  user_id uuid
  event_type text NOT NULL
  path text
  element text
  href text
  device_type text
  browser text
  os text
  referrer text
  screen_w integer
  metadata jsonb
TABLE birthday_events
  id uuid NOT NULL DEFAULT uuid_generate_v4()
  host_id uuid NOT NULL
  celebrant text NOT NULL
  title text
  description text
  event_date timestamp with time zone NOT NULL
  location text
  location_url text
  cover_image text
  share_slug text NOT NULL DEFAULT substr(md5(((random())::text || (clock_timestamp())::text)), 1, 10)
  allow_photos boolean DEFAULT true
  allow_wishlist boolean DEFAULT true
  allow_chat boolean DEFAULT true
  created_at timestamp with time zone DEFAULT now()
  updated_at timestamp with time zone DEFAULT now()
TABLE birthday_guests
  event_id uuid NOT NULL
  user_id uuid NOT NULL
  status text NOT NULL DEFAULT 'going'::text
  created_at timestamp with time zone DEFAULT now()
TABLE birthday_messages
  id uuid NOT NULL DEFAULT uuid_generate_v4()
  event_id uuid NOT NULL
  user_id uuid NOT NULL
  body text NOT NULL
  created_at timestamp with time zone DEFAULT now()
TABLE birthday_photos
  id uuid NOT NULL DEFAULT uuid_generate_v4()
  event_id uuid NOT NULL
  user_id uuid NOT NULL
  photo_url text NOT NULL
  caption text
  created_at timestamp with time zone DEFAULT now()
TABLE birthday_wishlist
  id uuid NOT NULL DEFAULT uuid_generate_v4()
  event_id uuid NOT NULL
  added_by uuid
  title text NOT NULL
  url text
  image_url text
  price text
  claimed_by uuid
  created_at timestamp with time zone DEFAULT now()
TABLE blog_posts
  id uuid NOT NULL DEFAULT gen_random_uuid()
  slug text NOT NULL
  title text NOT NULL
  description text
  content text NOT NULL
  cover_image text
  author text DEFAULT 'Bestie Team'::text
  tags ARRAY DEFAULT '{}'::text[]
  published boolean DEFAULT false
  created_at timestamp with time zone DEFAULT now()
  updated_at timestamp with time zone DEFAULT now()
TABLE bookings
  id uuid NOT NULL DEFAULT gen_random_uuid()
  seeker_id uuid
  provider_id uuid
  package_id uuid
  status text DEFAULT 'pending'::text
  message text
  scheduled_at timestamp with time zone
  created_at timestamp with time zone DEFAULT now()
  confirmed_by_seeker boolean DEFAULT false
  confirmed_by_provider boolean DEFAULT false
  rating_seeker integer
  rating_provider integer
  archived_by_seeker boolean DEFAULT false
  archived_by_provider boolean DEFAULT false
TABLE calls
  id uuid NOT NULL DEFAULT gen_random_uuid()
  room_name text NOT NULL
  room_url text NOT NULL
  caller_id uuid NOT NULL
  callee_id uuid NOT NULL
  status text NOT NULL DEFAULT 'ringing'::text
  booking_id uuid
  started_at timestamp with time zone
  ended_at timestamp with time zone
  created_at timestamp with time zone NOT NULL DEFAULT now()
TABLE companion_messages
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid NOT NULL
  role text NOT NULL
  content text NOT NULL
  created_at timestamp with time zone NOT NULL DEFAULT now()
TABLE companions
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid NOT NULL
  type text NOT NULL DEFAULT 'spark'::text
  name text NOT NULL DEFAULT 'Bestie'::text
  level integer NOT NULL DEFAULT 1
  xp integer NOT NULL DEFAULT 0
  created_at timestamp with time zone NOT NULL DEFAULT now()
  updated_at timestamp with time zone NOT NULL DEFAULT now()
  provider text DEFAULT 'claude'::text
  api_key text
TABLE crew_ai_agents
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid NOT NULL
  crew_id uuid NOT NULL
  provider text NOT NULL DEFAULT 'claude'::text
  api_key text
  skills text NOT NULL
  is_active boolean NOT NULL DEFAULT true
  created_at timestamp with time zone DEFAULT now()
  updated_at timestamp with time zone DEFAULT now()
TABLE crew_event_attendees
  event_id uuid NOT NULL
  user_id uuid NOT NULL
  joined_at timestamp with time zone DEFAULT now()
  status text NOT NULL DEFAULT 'going'::text
TABLE crew_events
  id uuid NOT NULL DEFAULT uuid_generate_v4()
  crew_id uuid NOT NULL
  created_by uuid
  title text NOT NULL
  description text
  location text
  datetime timestamp with time zone NOT NULL
  max_attendees integer
  is_members_only boolean DEFAULT false
  created_at timestamp with time zone DEFAULT now()
  updated_at timestamp with time zone DEFAULT now()
TABLE crew_join_requests
  id uuid NOT NULL DEFAULT uuid_generate_v4()
  crew_id uuid NOT NULL
  user_id uuid NOT NULL
  status text DEFAULT 'pending'::text
  created_at timestamp with time zone DEFAULT now()
TABLE crew_members
  crew_id uuid NOT NULL
  user_id uuid NOT NULL
  joined_at timestamp with time zone DEFAULT now()
TABLE crew_message_reactions
  id uuid NOT NULL DEFAULT uuid_generate_v4()
  message_id uuid NOT NULL
  user_id uuid NOT NULL
  emoji text NOT NULL
  created_at timestamp with time zone DEFAULT now()
TABLE crew_messages
  id uuid NOT NULL DEFAULT uuid_generate_v4()
  crew_id uuid NOT NULL
  sender_id uuid NOT NULL
  content text
  created_at timestamp with time zone DEFAULT now()
  reply_to_id uuid
  pinned_at timestamp with time zone
  pinned_by uuid
  media_url text
  media_type text
  media_duration integer
TABLE crew_ratings
  id uuid NOT NULL DEFAULT uuid_generate_v4()
  crew_id uuid NOT NULL
  user_id uuid NOT NULL
  rating integer NOT NULL
  created_at timestamp with time zone DEFAULT now()
TABLE crews
  id uuid NOT NULL DEFAULT uuid_generate_v4()
  name text NOT NULL
  slug text NOT NULL
  description text
  avatar_url text
  captain_id uuid
  is_public boolean DEFAULT true
  max_members integer DEFAULT 108
  created_at timestamp with time zone DEFAULT now()
  updated_at timestamp with time zone DEFAULT now()
  invite_code text
  telegram_url text
  plan text DEFAULT 'free'::text
  plan_expires_at timestamp with time zone
  stripe_customer_id text
  stripe_subscription_id text
  telegram_chat_id bigint
TABLE direct_messages
  id uuid NOT NULL DEFAULT uuid_generate_v4()
  sender_id uuid NOT NULL
  receiver_id uuid NOT NULL
  content text NOT NULL
  read boolean DEFAULT false
  created_at timestamp with time zone DEFAULT now()
TABLE event_checkins
  id uuid NOT NULL DEFAULT uuid_generate_v4()
  event_id uuid NOT NULL
  user_id uuid NOT NULL
  photo_url text
  lat double precision
  lng double precision
  checked_in_at timestamp with time zone DEFAULT now()
TABLE event_photos
  id uuid NOT NULL DEFAULT uuid_generate_v4()
  event_id uuid NOT NULL
  user_id uuid
  photo_url text NOT NULL
  caption text
  created_at timestamp with time zone DEFAULT now()
TABLE event_reminders_sent
  event_id uuid NOT NULL
  user_id uuid NOT NULL
  kind text NOT NULL
  sent_at timestamp with time zone DEFAULT now()
TABLE going_to
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid
  activity_type text NOT NULL
  description text
  location text
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval)
  created_at timestamp with time zone DEFAULT now()
  scheduled_at timestamp with time zone
TABLE group_session_participants
  id uuid NOT NULL DEFAULT gen_random_uuid()
  session_id uuid NOT NULL
  user_id uuid NOT NULL
  joined_at timestamp with time zone DEFAULT now()
TABLE group_sessions
  id uuid NOT NULL DEFAULT gen_random_uuid()
  host_id uuid NOT NULL
  title text NOT NULL
  activity_type text
  description text
  scheduled_at timestamp with time zone NOT NULL
  location text
  max_participants integer NOT NULL DEFAULT 6
  status text NOT NULL DEFAULT 'open'::text
  created_at timestamp with time zone DEFAULT now()
  cover_image_url text
TABLE knocks
  id uuid NOT NULL DEFAULT gen_random_uuid()
  sender_id uuid NOT NULL
  receiver_id uuid NOT NULL
  is_mutual boolean DEFAULT false
  seen boolean DEFAULT false
  created_at timestamp with time zone DEFAULT now()
TABLE messages
  id uuid NOT NULL DEFAULT gen_random_uuid()
  sender_id uuid
  receiver_id uuid
  content text NOT NULL
  read boolean DEFAULT false
  created_at timestamp with time zone DEFAULT now()
TABLE notifications
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid NOT NULL
  type text NOT NULL
  title text NOT NULL
  body text
  link text
  read boolean NOT NULL DEFAULT false
  created_at timestamp with time zone NOT NULL DEFAULT now()
TABLE push_subscriptions
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid NOT NULL
  endpoint text NOT NULL
  subscription jsonb NOT NULL
  created_at timestamp with time zone NOT NULL DEFAULT now()
TABLE quests
  id uuid NOT NULL DEFAULT gen_random_uuid()
  slug text NOT NULL
  title text NOT NULL
  description text NOT NULL
  icon text NOT NULL DEFAULT '⚡'::text
  xp_reward integer NOT NULL DEFAULT 50
  bs_reward integer NOT NULL DEFAULT 0
  sparks_reward integer NOT NULL DEFAULT 0
  quest_type text NOT NULL DEFAULT 'onboarding'::text
  sort_order integer NOT NULL DEFAULT 0
TABLE session_memories
  id uuid NOT NULL DEFAULT gen_random_uuid()
  booking_id uuid NOT NULL
  user_id uuid NOT NULL
  mood_emoji text
  activity_note text
  photo_url text
  created_at timestamp with time zone DEFAULT now()
TABLE sparks
  id uuid NOT NULL DEFAULT gen_random_uuid()
  giver_id uuid
  receiver_id uuid
  spark_type text NOT NULL
  created_at timestamp with time zone DEFAULT now()
TABLE swarm_auto_matches
  id uuid NOT NULL DEFAULT gen_random_uuid()
  crew_id uuid NOT NULL
  user_a uuid NOT NULL
  user_b uuid NOT NULL
  reason text
  score integer
  created_at timestamp with time zone DEFAULT now()
TABLE swarm_board
  id uuid NOT NULL DEFAULT gen_random_uuid()
  crew_id uuid NOT NULL
  author_id uuid NOT NULL
  kind text NOT NULL
  body text NOT NULL
  status text NOT NULL DEFAULT 'open'::text
  created_at timestamp with time zone DEFAULT now()
TABLE swarm_requests
  id uuid NOT NULL DEFAULT gen_random_uuid()
  crew_id uuid NOT NULL
  requester_id uuid NOT NULL
  query text NOT NULL
  result jsonb
  created_at timestamp with time zone DEFAULT now()
TABLE telegram_updates
  update_id bigint NOT NULL
  created_at timestamp with time zone DEFAULT now()
TABLE user_blocks
  id uuid NOT NULL DEFAULT gen_random_uuid()
  blocker_id uuid NOT NULL
  blocked_id uuid NOT NULL
  created_at timestamp with time zone DEFAULT now()
TABLE user_contacts
  id uuid NOT NULL DEFAULT gen_random_uuid()
  owner_id uuid NOT NULL
  hashed_email text
  hashed_phone text
  matched_user_id uuid
  created_at timestamp with time zone NOT NULL DEFAULT now()
TABLE user_quests
  id uuid NOT NULL DEFAULT gen_random_uuid()
  user_id uuid NOT NULL
  quest_id uuid NOT NULL
  status text NOT NULL DEFAULT 'active'::text
  completed_at timestamp with time zone
TABLE user_reports
  id uuid NOT NULL DEFAULT gen_random_uuid()
  reporter_id uuid NOT NULL
  reported_id uuid NOT NULL
  reason text NOT NULL
  created_at timestamp with time zone DEFAULT now()
  status text NOT NULL DEFAULT 'pending'::text
TABLE users
  id uuid NOT NULL
  username text NOT NULL
  full_name text
  avatar_url text
  bio text
  city text
  country text
  is_verified boolean DEFAULT false
  bestie_score integer DEFAULT 150
  avg_rating numeric DEFAULT 0
  total_sessions integer DEFAULT 0
  role text DEFAULT 'seeker'::text
  created_at timestamp with time zone DEFAULT now()
  sparks_balance integer DEFAULT 30
  sparks_received integer DEFAULT 0
  last_seen_at timestamp with time zone DEFAULT now()
  energy_type text
  mind_type text
  vibe_type text
  bestie_type_completed boolean DEFAULT false
  birth_date date
  languages ARRAY DEFAULT '{}'::text[]
  sparks_given integer DEFAULT 0
  onboarding_completed boolean DEFAULT false
  crew_id uuid
  referral_code text
  referred_by uuid
  streak_weeks integer DEFAULT 0
  availability jsonb
  lat double precision
  lng double precision
  free_today_at timestamp with time zone
  hashed_email text
  hashed_phone text
  rating_count integer NOT NULL DEFAULT 0
  sparks_platinum_rewarded boolean NOT NULL DEFAULT false
  hide_from_graph boolean NOT NULL DEFAULT false
  subscription_tier text DEFAULT 'free'::text
  plus_expires_at timestamp with time zone
  stripe_customer_id text
  stripe_subscription_id text
  show_on_graph boolean DEFAULT false
  is_admin boolean NOT NULL DEFAULT false
  eterotype text
  eterotype_name text
  eterotype_family text
  eterotype_collective text
  is_banned boolean NOT NULL DEFAULT false
```

## Notable facts the code must respect

- `users` has NO `email`, `updated_at`, `completed_session_count`, or
  `average_rating` columns (past prod bugs came from assuming these exist).
- Legacy personality columns (`energy_type`, `mind_type`, `vibe_type`) are
  kept but no longer shown — `eterotype*` is the current system.
- Legacy `messages` table coexists with `direct_messages` (the live one).
- `reviews` / `lights` tables do NOT exist (older migrations reference them —
  all such statements are guarded with `to_regclass`).

## Refresh query

```sql
SELECT string_agg(line, E'\n') AS schema_snapshot
FROM (
  SELECT format(
    E'TABLE %s\n%s',
    t.table_name,
    (SELECT string_agg(format('  %s %s%s%s',
        c.column_name, c.data_type,
        CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
        CASE WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default ELSE '' END
      ), E'\n' ORDER BY c.ordinal_position)
     FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = t.table_name)
  ) AS line
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name
) s;
```
