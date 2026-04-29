export type Role = "seeker" | "provider" | "both";

export type User = {
  id: string;
  email: string;
  full_name: string;
  username: string;
  photo: string | null;
  bio: string | null;
  city: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  languages: string[];
  interests: string[];
  primary_role: Role;
  is_provider_active: boolean;
  average_rating: number;
  completed_session_count: number;
  response_rate: number;
  bestie_score: number;
  verification_status: string;
  email_verified: boolean;
  phone_verified: boolean;
  photo_verified: boolean;
  id_verified: boolean;
  phone_number: string | null;
  personality_16: string | null;
  human_design: string | null;
  zodiac: string | null;
  created_at: string;
};

export type ActivityPackage = {
  id: string;
  provider_id: string;
  name: string;
  activity_type: ActivityType;
  description: string;
  price: number;
  pricing_unit: string;
  is_active: boolean;
  created_at: string;
};

export type ActivityType =
  | "Meet IRL"
  | "Dance Crew"
  | "Trail Crew"
  | "Travel Buddy"
  | "Game Night"
  | "Watch Together"
  | "Vibe Call"
  | "Deep Chat"
  | "Real Talk"
  | "Festival Crew"
  | "Epic Journey"
  | "Fishing Crew";

export const ACTIVITY_TYPES: ActivityType[] = [
  "Meet IRL",
  "Dance Crew",
  "Trail Crew",
  "Travel Buddy",
  "Game Night",
  "Watch Together",
  "Vibe Call",
  "Deep Chat",
  "Real Talk",
  "Festival Crew",
  "Epic Journey",
  "Fishing Crew",
];

export type BookingStatus = "pending" | "accepted" | "declined" | "completed" | "cancelled";

export type Booking = {
  id: string;
  seeker_id: string;
  provider_id: string;
  package_id: string;
  proposed_datetime: string;
  notes: string | null;
  status: BookingStatus;
  created_at: string;
  seeker?: User;
  provider?: User;
  package?: ActivityPackage;
};

export type MatchRequest = {
  id: string;
  seeker_id: string;
  activity_type: ActivityType;
  city: string;
  preferred_datetime: string;
  preferences_notes: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  sender?: User;
};

export type LightType =
  | "open"
  | "kind"
  | "fun"
  | "social"
  | "good_listener"
  | "energetic"
  | "reliable"
  | "punctual"
  | "safe"
  | "genuine"
  | "boring"
  | "unreliable"
  | "ignores";

export type Light = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  booking_id: string;
  light_type: LightType;
  created_at: string;
};

export const POSITIVE_LIGHTS: { key: LightType; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "kind", label: "Kind" },
  { key: "fun", label: "Fun" },
  { key: "social", label: "Social" },
  { key: "good_listener", label: "Good listener" },
  { key: "energetic", label: "Energetic" },
  { key: "reliable", label: "Reliable" },
  { key: "punctual", label: "Punctual" },
  { key: "safe", label: "Safe" },
  { key: "genuine", label: "Genuine" },
];

export const NEGATIVE_LIGHTS: { key: LightType; label: string }[] = [
  { key: "boring", label: "Boring" },
  { key: "unreliable", label: "Unreliable" },
  { key: "ignores", label: "Ignores" },
];

export type Review = {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  star_rating: number;
  written_review: string;
  created_at: string;
  reviewer?: User;
  package?: ActivityPackage;
};

export type ProviderAvailability = {
  id: string;
  provider_id: string;
  day_of_week: string;
};

export type GoingTo = {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  location: string;
  datetime: string;
  note: string | null;
  expires_at: string;
  created_at: string;
  user?: User;
};

export type SubscriptionTier = "free" | "basic" | "pro" | "organizer";
