"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, MapPin, Star, Shield, Users, Zap } from "lucide-react";
import { ACTIVITY_TYPES } from "@/types";
import MatchModal from "@/components/modals/MatchModal";
import ProviderCard from "@/components/cards/ProviderCard";

const DEMO_PROVIDERS = [
  {
    id: "1",
    full_name: "Maya Chen",
    username: "mayachen",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80",
    city: "Brooklyn, NY",
    average_rating: 4.9,
    completed_session_count: 128,
    bestie_score: 892,
    is_provider_active: true,
    bio: "Cozy coffee chats, hikes, and museum visits. Let's make a normal day a little brighter.",
    id_verified: true,
    verification_status: "verified",
    package: { name: "Saturday Coffee & Walk", activity_type: "Meet IRL", price: 45, pricing_unit: "per hour" },
  },
  {
    id: "2",
    full_name: "Caspian Valle",
    username: "caspianv",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
    city: "Austin, TX",
    average_rating: 4.8,
    completed_session_count: 94,
    bestie_score: 847,
    is_provider_active: true,
    bio: "Trail runs, board games, deep conversations. I show up as I am and expect the same.",
    id_verified: true,
    verification_status: "verified",
    package: { name: "Coastal Hike Experience", activity_type: "Trail Crew", price: 80, pricing_unit: "per session" },
  },
  {
    id: "3",
    full_name: "Isolde Park",
    username: "isoldepark",
    photo: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80",
    city: "Seoul",
    average_rating: 5.0,
    completed_session_count: 61,
    bestie_score: 921,
    is_provider_active: true,
    bio: "Watch parties, late-night chats, festival companion. I love film, indie music, and good stories.",
    id_verified: true,
    verification_status: "verified",
    package: { name: "Cozy Watch Party Night", activity_type: "Watch Together", price: 20, pricing_unit: "per session" },
  },
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <main className="min-h-screen bg-bg">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 bg-bg/85 backdrop-blur-md border-b border-gold/10">
        <Link href="/" className="font-serif text-2xl text-gold tracking-wider">
          BESTIE
        </Link>
        <ul className="hidden md:flex items-center gap-8 list-none">
          {["Browse Besties", "How It Works", "Dashboard"].map((item) => (
            <li key={item}>
              <Link
                href={`/${item.toLowerCase().replace(/ /g, "-")}`}
                className="text-muted text-sm font-medium hover:text-bestie transition-colors"
              >
                {item}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex gap-3">
          <Link href="/auth/login" className="btn-outline text-sm px-4 py-2">
            Log in
          </Link>
          <Link href="/auth/signup" className="btn-gold text-sm px-4 py-2">
            Sign up
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen grid md:grid-cols-2 items-center px-6 md:px-12 pt-16 gap-12 relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)" }}
        />

        <div className="animate-slide-up">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-6">
            <span className="neon-dot" />
            <span className="text-xs font-bold tracking-widest uppercase text-neon">
              Verified humans · Real connections · 2026
            </span>
          </div>

          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-6">
            Find a Bestie
            <br />
            for the{" "}
            <em className="text-gold not-italic">moments</em>
            <br />
            that matter.
          </h1>

          <p className="text-muted text-lg leading-relaxed max-w-md mb-10">
            Browse identity-verified companions for coffee chats, hikes,
            festivals, voice calls, and travel adventures.
          </p>

          {/* HERO SEARCH */}
          <div className="relative mb-8 max-w-md">
            <div
              className={`flex items-center gap-3 bg-card border rounded-2xl px-5 py-4 transition-all ${
                searchFocused ? "border-gold/50" : "border-gold/20"
              }`}
            >
              <Search size={18} className="text-muted flex-shrink-0" />
              <input
                type="text"
                placeholder="Search any name — see their Bestie Score"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="flex-1 bg-transparent text-bestie text-sm placeholder:text-muted/50 outline-none"
              />
            </div>
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-gold/20 rounded-xl overflow-hidden z-10">
                <div className="px-4 py-3 text-sm text-muted text-center">
                  Searching for "{searchQuery}"...
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 flex-wrap mb-10">
            <button
              onClick={() => setShowMatchModal(true)}
              className="btn-gold"
            >
              ✦ Find My Bestie
            </button>
            <Link href="/how-it-works" className="btn-gold-outline">
              How It Works
            </Link>
          </div>

          {/* TRUST */}
          <div className="flex gap-6 flex-wrap">
            {[
              { icon: Shield, label: "ID-verified" },
              { icon: Star, label: "Rated by real people" },
              { icon: Users, label: "Judgment-free" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-muted text-sm">
                <Icon size={16} className="text-gold" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* HERO IMAGE */}
        <div className="relative hidden md:flex justify-center">
          <div className="relative w-full max-w-lg rounded-3xl overflow-hidden border border-gold/15 aspect-[4/3]">
            <Image
              src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80"
              alt="Friends together"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute bottom-5 left-5 bg-bg/90 border border-gold/20 rounded-xl p-4 backdrop-blur-sm">
              <span className="block text-2xl font-bold text-gold">4.9★</span>
              <span className="block text-xs text-muted mt-0.5">Average Bestie Score</span>
            </div>
          </div>
        </div>
      </section>

      {/* BROWSE SECTION */}
      <section id="browse" className="px-6 md:px-12 py-20 border-t border-gold/10">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="section-label">Browse verified Besties</p>
            <h2 className="font-serif text-4xl mb-2">Find your match</h2>
            <p className="text-muted">Search by name or interest, then narrow it down.</p>
          </div>
          <button
            onClick={() => setShowMatchModal(true)}
            className="btn-gold"
          >
            <Zap size={15} />
            Smart Match Request
          </button>
        </div>

        {/* FILTERS */}
        <div className="flex gap-2 flex-wrap mb-10">
          {["All activities", "All cities", "Any price", "Any language", "Any day"].map(
            (filter) => (
              <select
                key={filter}
                className="bg-card border border-gold/15 rounded-full px-4 py-2 text-muted text-sm outline-none focus:border-gold/35 cursor-pointer appearance-none pr-8"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239B93C0' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                }}
              >
                <option>{filter}</option>
                {filter === "All activities" &&
                  ACTIVITY_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            )
          )}
        </div>

        {/* PROVIDER CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DEMO_PROVIDERS.map((provider) => (
            <ProviderCard key={provider.id} provider={provider as any} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="px-6 md:px-12 py-20 bg-card border-y border-gold/10">
        <div className="text-center max-w-lg mx-auto mb-16">
          <p className="section-label">How it works</p>
          <h2 className="font-serif text-4xl mb-3">Simple. Safe. Human.</h2>
          <p className="text-muted">Three steps from landing here to having real company.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-gold/10 rounded-2xl overflow-hidden">
          {[
            {
              n: "01",
              title: "Tell us what you need",
              desc: "Pick an activity, your city, and when you're free. Our Smart Match finds Besties who fit.",
            },
            {
              n: "02",
              title: "Browse & book",
              desc: "View verified profiles, read real reviews, and send a booking request — no pressure.",
            },
            {
              n: "03",
              title: "Meet your Bestie",
              desc: "Show up, connect, and leave a review. Every session is rated so quality stays high.",
            },
          ].map(({ n, title, desc }) => (
            <div key={n} className="bg-card p-10">
              <span className="font-serif text-6xl text-gold/15 leading-none block mb-5">
                {n}
              </span>
              <h3 className="text-lg font-semibold text-bestie mb-2">{title}</h3>
              <p className="text-muted text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BESTIE SCORE BANNER */}
      <section className="px-6 md:px-12 py-20 text-center">
        <p className="section-label">The social passport</p>
        <h2 className="font-serif text-4xl md:text-5xl mb-4">
          Your <em className="text-gold not-italic">Bestie Score</em> says it all.
        </h2>
        <p className="text-muted text-lg max-w-xl mx-auto mb-10">
          Like a credit score — but for who you are as a person. Share your
          profile in your Instagram bio, on dates, or at work.
          <br />
          <em className="text-bestie/70 not-italic">"Check them on Bestie."</em>
        </p>
        <Link href="/auth/signup" className="btn-gold text-base px-8 py-3">
          Build your Bestie Score →
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="px-6 md:px-12 py-10 border-t border-gold/10 flex items-center justify-between flex-wrap gap-4">
        <span className="font-serif text-xl text-gold">BESTIE</span>
        <ul className="flex gap-6 list-none">
          {["Browse Besties", "How It Works", "Become a Bestie", "Privacy"].map(
            (item) => (
              <li key={item}>
                <Link
                  href="#"
                  className="text-muted text-sm hover:text-bestie transition-colors"
                >
                  {item}
                </Link>
              </li>
            )
          )}
        </ul>
        <span className="text-muted/40 text-xs">
          © 2026 bestiehere.com · @join.bestie
        </span>
      </footer>

      {/* MATCH MODAL */}
      {showMatchModal && (
        <MatchModal onClose={() => setShowMatchModal(false)} />
      )}
    </main>
  );
}
