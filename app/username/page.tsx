import { Shield, Star, MapPin, Award } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { POSITIVE_LIGHTS } from "@/types";

// Demo data — replace with Supabase fetch
const DEMO_USER = {
  full_name: "Caspian Valle",
  username: "caspianv",
  photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
  city: "Austin, TX",
  age: 34,
  bio: "Trail runner, board game enthusiast, deep conversation lover. I show up as I am and expect the same. Ex-wilderness guide, now building software. Let's explore something together.",
  average_rating: 4.8,
  completed_session_count: 94,
  bestie_score: 847,
  response_rate: 96,
  email_verified: true,
  phone_verified: true,
  photo_verified: true,
  id_verified: true,
  interests: ["Hiking", "Board games", "Jazz", "Philosophy", "Travel"],
  lights: { open: 47, kind: 38, fun: 52, social: 41, reliable: 36, energetic: 29 },
  reviews: [
    { name: "Sarah M.", rating: 5, text: "Caspian's coastal hike was breathtaking. A five-star experience.", package: "Trail Crew" },
    { name: "Jordan L.", rating: 5, text: "Amazing conversation, genuine presence. Will book again!", package: "Deep Chat" },
  ],
};

export default function PublicProfilePage({ params }: { params: { username: string } }) {
  const user = DEMO_USER;

  const verifications = [
    { label: "Email", verified: user.email_verified },
    { label: "Phone", verified: user.phone_verified },
    { label: "Photo", verified: user.photo_verified },
    { label: "ID", verified: user.id_verified },
  ];

  const topLights = Object.entries(user.lights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <main className="min-h-screen bg-bg">
      {/* NAV */}
      <nav className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-gold/10">
        <Link href="/" className="font-serif text-2xl text-gold tracking-wider">BESTIE</Link>
        <div className="flex gap-3">
          <Link href="/auth/login" className="btn-outline text-sm px-4 py-2">Log in</Link>
          <Link href="/auth/signup" className="btn-gold text-sm px-4 py-2">Sign up</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* PROFILE HEADER */}
        <div className="flex items-start gap-6 mb-8">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-gold/20 flex-shrink-0">
            {user.photo && (
              <Image src={user.photo} alt={user.full_name} fill className="object-cover" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="font-serif text-3xl text-bestie">{user.full_name}</h1>
              <span className="verified-badge">✓ Verified</span>
            </div>
            <div className="flex items-center gap-3 text-muted text-sm mb-3">
              <span className="flex items-center gap-1"><MapPin size={13} /> {user.city}</span>
              <span>·</span>
              <span>{user.age} years old</span>
            </div>
            {/* VERIFICATIONS */}
            <div className="flex gap-2 flex-wrap">
              {verifications.map(({ label, verified }) => (
                <span
                  key={label}
                  className={`text-xs font-medium px-3 py-1 rounded-full border ${
                    verified
                      ? "text-neon bg-neon/8 border-neon/20"
                      : "text-muted/40 border-white/5"
                  }`}
                >
                  {verified ? "✓" : "○"} {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* BESTIE SCORE CARD */}
        <div className="card-base p-6 mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-muted uppercase tracking-widest mb-1">Bestie Score</p>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-5xl text-gold">{user.bestie_score}</span>
              <span className="text-muted text-sm">/ 1000</span>
            </div>
            <p className="text-xs text-muted mt-1">Top 8% of all Besties</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Rating", value: `${user.average_rating}★` },
              { label: "Sessions", value: user.completed_session_count },
              { label: "Response", value: `${user.response_rate}%` },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-xl font-bold text-bestie">{value}</div>
                <div className="text-xs text-muted mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* BIO */}
        <div className="card-base p-6 mb-6">
          <h2 className="text-sm font-semibold text-gold uppercase tracking-wide mb-3">About</h2>
          <p className="text-muted leading-relaxed">{user.bio}</p>
        </div>

        {/* INTERESTS */}
        <div className="card-base p-6 mb-6">
          <h2 className="text-sm font-semibold text-gold uppercase tracking-wide mb-3">Interests</h2>
          <div className="flex flex-wrap gap-2">
            {user.interests.map((interest) => (
              <span key={interest} className="text-sm text-muted bg-white/[0.03] border border-white/8 px-3 py-1.5 rounded-full">
                {interest}
              </span>
            ))}
          </div>
        </div>

        {/* LIGHTS */}
        <div className="card-base p-6 mb-6">
          <h2 className="text-sm font-semibold text-gold uppercase tracking-wide mb-4">Lights from others</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {topLights.map(([key, count]) => {
              const light = POSITIVE_LIGHTS.find((l) => l.key === key);
              return (
                <div key={key} className="flex items-center justify-between bg-gold/5 border border-gold/10 rounded-xl px-4 py-3">
                  <span className="text-sm text-bestie">{light?.label || key}</span>
                  <span className="text-gold font-bold text-sm">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* REVIEWS */}
        <div className="card-base p-6 mb-8">
          <h2 className="text-sm font-semibold text-gold uppercase tracking-wide mb-4">Reviews</h2>
          <div className="space-y-4">
            {user.reviews.map((review, i) => (
              <div key={i} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-bestie">{review.name}</span>
                  <div className="flex items-center gap-1">
                    {"★".repeat(review.rating).split("").map((_, j) => (
                      <Star key={j} size={12} className="text-gold fill-gold" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted mb-1">After {review.package}</p>
                <p className="text-sm text-muted/80 leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-muted text-sm mb-4">Want to connect with {user.full_name}?</p>
          <Link href="/auth/signup" className="btn-gold text-base px-8 py-3">
            Sign up to book a session
          </Link>
        </div>
      </div>
    </main>
  );
}
