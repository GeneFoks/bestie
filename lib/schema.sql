-- BESTIE — Supabase Schema
-- Run this in Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  photo TEXT,
  bio TEXT,
  city TEXT,
  age INTEGER,
  height INTEGER,
  weight INTEGER,
  languages TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  primary_role TEXT DEFAULT 'seeker' CHECK (primary_role IN ('seeker', 'provider', 'both')),
  is_provider_active BOOLEAN DEFAULT FALSE,
  average_rating NUMERIC(3,2) DEFAULT 0,
  completed_session_count INTEGER DEFAULT 0,
  response_rate INTEGER DEFAULT 100,
  bestie_score INTEGER DEFAULT 500,
  verification_status TEXT DEFAULT 'unverified',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  photo_verified BOOLEAN DEFAULT FALSE,
  id_verified BOOLEAN DEFAULT FALSE,
  phone_number TEXT,
  personality_16 TEXT,
  human_design TEXT,
  zodiac TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'pro', 'organizer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACTIVITY PACKAGES
CREATE TABLE public.activity_packages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  pricing_unit TEXT DEFAULT 'per hour',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOOKINGS
CREATE TABLE public.bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seeker_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  package_id UUID REFERENCES public.activity_packages(id),
  proposed_datetime TIMESTAMPTZ,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MATCH REQUESTS
CREATE TABLE public.match_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seeker_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  city TEXT,
  preferred_datetime TIMESTAMPTZ,
  preferences_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGES
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  reviewee_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  star_rating INTEGER CHECK (star_rating BETWEEN 1 AND 5) NOT NULL,
  written_review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LIGHTS (social endorsements)
CREATE TABLE public.lights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  light_type TEXT NOT NULL CHECK (light_type IN (
    'open', 'kind', 'fun', 'social', 'good_listener',
    'energetic', 'reliable', 'punctual', 'safe', 'genuine',
    'boring', 'unreliable', 'ignores'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id, booking_id, light_type)
);

-- PROVIDER AVAILABILITY
CREATE TABLE public.provider_availability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN (
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  )),
  UNIQUE(provider_id, day_of_week)
);

-- GOING TO (Stories)
CREATE TABLE public.going_to (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL,
  location TEXT NOT NULL,
  datetime TIMESTAMPTZ NOT NULL,
  note TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REPORTS
CREATE TABLE public.reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  reported_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || FLOOR(RANDOM() * 9999)::TEXT,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update bestie_score after review
CREATE OR REPLACE FUNCTION public.update_bestie_score()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating NUMERIC;
  session_count INTEGER;
  score INTEGER;
BEGIN
  SELECT AVG(star_rating), COUNT(*) INTO avg_rating, session_count
  FROM public.reviews WHERE reviewee_id = NEW.reviewee_id;

  score := 500
    + FLOOR((avg_rating - 3) * 80)
    + LEAST(session_count * 5, 150);

  UPDATE public.users
  SET
    average_rating = avg_rating,
    completed_session_count = session_count,
    bestie_score = GREATEST(0, LEAST(1000, score)),
    updated_at = NOW()
  WHERE id = NEW.reviewee_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_bestie_score();

-- Penalize score for ignoring after acceptance
CREATE OR REPLACE FUNCTION public.penalize_ignore()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.light_type = 'ignores' THEN
    UPDATE public.users
    SET bestie_score = GREATEST(0, bestie_score - 30),
        updated_at = NOW()
    WHERE id = NEW.to_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_light_ignore
  AFTER INSERT ON public.lights
  FOR EACH ROW EXECUTE FUNCTION public.penalize_ignore();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.going_to ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_requests ENABLE ROW LEVEL SECURITY;

-- USERS: public read (limited fields), self write
CREATE POLICY "Public profiles visible to all"
  ON public.users FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE USING (auth.uid() = id);

-- PACKAGES: public read, provider write own
CREATE POLICY "Packages visible to all"
  ON public.activity_packages FOR SELECT USING (TRUE);

CREATE POLICY "Providers manage own packages"
  ON public.activity_packages FOR ALL USING (auth.uid() = provider_id);

-- BOOKINGS: seeker and provider can see own
CREATE POLICY "Booking parties can view"
  ON public.bookings FOR SELECT
  USING (auth.uid() = seeker_id OR auth.uid() = provider_id);

CREATE POLICY "Seekers can create bookings"
  ON public.bookings FOR INSERT WITH CHECK (auth.uid() = seeker_id);

CREATE POLICY "Booking parties can update"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = seeker_id OR auth.uid() = provider_id);

-- MESSAGES: booking parties only
CREATE POLICY "Booking parties can read messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
      AND (b.seeker_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Booking parties can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
      AND (b.seeker_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- REVIEWS: public read, authenticated write
CREATE POLICY "Reviews visible to all"
  ON public.reviews FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can leave reviews"
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- LIGHTS: public read, authenticated write
CREATE POLICY "Lights visible to all"
  ON public.lights FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can give lights"
  ON public.lights FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- GOING TO: public read, own write
CREATE POLICY "Going to visible to all"
  ON public.going_to FOR SELECT USING (expires_at > NOW());

CREATE POLICY "Users manage own going_to"
  ON public.going_to FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_city ON public.users(city);
CREATE INDEX idx_users_is_provider ON public.users(is_provider_active);
CREATE INDEX idx_users_bestie_score ON public.users(bestie_score DESC);
CREATE INDEX idx_packages_provider ON public.activity_packages(provider_id);
CREATE INDEX idx_packages_activity_type ON public.activity_packages(activity_type);
CREATE INDEX idx_bookings_seeker ON public.bookings(seeker_id);
CREATE INDEX idx_bookings_provider ON public.bookings(provider_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_messages_booking ON public.messages(booking_id);
CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id);
CREATE INDEX idx_lights_to_user ON public.lights(to_user_id);
CREATE INDEX idx_going_to_expires ON public.going_to(expires_at);
