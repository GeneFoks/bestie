// @ts-nocheck
export const revalidate = 0
import Link from 'next/link'
import { MapPin, Lock, Search, Calendar, Clock } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import ProfileNav from '@/components/ProfileNav'
import SocialPassportCTA from '@/components/SocialPassportCTA'
import SharePassportButton from '@/components/SharePassportButton'
import InviteToSessionButton from '@/components/InviteToSessionButton'
import EditActivitiesLink from '@/components/EditActivitiesLink'
import BlockReportButton from '@/components/BlockReportButton'
import KnockButton from '@/components/KnockButton'
import PassportScoreCard from '@/components/PassportScoreCard'
import MutualFriends from '@/components/MutualFriends'
import { getAvatarFrame } from '@/lib/avatarFrame'
import CompatibilityScore from './CompatibilityScore'
import StickyBookCTA from './StickyBookCTA'
import { ActivityIcon } from '@/lib/activityIcons'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SPARK_TYPES = [
  { id: 'kind', emoji: '💛', label: 'Kind' },
  { id: 'fun', emoji: '🎉', label: 'Fun' },
  { id: 'reliable', emoji: '🔒', label: 'Reliable' },
  { id: 'genuine', emoji: '💎', label: 'Genuine' },
  { id: 'safe', emoji: '🛡️', label: 'Safe' },
  { id: 'energetic', emoji: '⚡', label: 'Energetic' },
  { id: 'good_listener', emoji: '👂', label: 'Good listener' },
  { id: 'social', emoji: '🌟', label: 'Social' },
  { id: 'punctual', emoji: '⏰', label: 'Punctual' },
  { id: 'open', emoji: '🌊', label: 'Open' },
  { id: 'focused', emoji: '🎯', label: 'Focused' },
  { id: 'insightful', emoji: '🧠', label: 'Insightful' },
  { id: 'motivating', emoji: '💪', label: 'Motivating' },
  { id: 'supportive', emoji: '🌱', label: 'Supportive' },
  { id: 'creative', emoji: '🎨', label: 'Creative' },
  { id: 'inspiring', emoji: '🔥', label: 'Inspiring' },
  { id: 'professional', emoji: '🤝', label: 'Professional' },
  { id: 'articulate', emoji: '💬', label: 'Articulate' },
  { id: 'calming', emoji: '🧘', label: 'Calming' },
  { id: 'high_energy', emoji: '⚡', label: 'High energy' },
  { id: 'worldly', emoji: '🌍', label: 'Worldly' },
  { id: 'knowledgeable', emoji: '🎓', label: 'Knowledgeable' },
]

const ACTIVITY_DURATION = {
  meet_irl: '1–2h', dance_crew: '2h', trail_crew: '3–5h', travel_buddy: 'Multi-day',
  game_night: '3h', watch_together: '2h', vibe_call: '30–60m', deep_chat: '1h',
  real_talk: '1h', festival_crew: 'Full day', epic_journey: 'Multi-day', fishing_crew: '4–6h',
}

function getTier(score: number, sessions: number) {
  if (score >= 800 || sessions >= 25) return { label: 'PLATINUM', color: '#C9B8FF', bg: 'rgba(155,143,255,0.15)', border: 'rgba(155,143,255,0.45)', glow: '155,143,255' }
  if (score >= 600 || sessions >= 10) return { label: 'GOLD', color: '#D4AF37', bg: 'rgba(212,175,55,0.15)', border: 'rgba(212,175,55,0.45)', glow: '212,175,55' }
  if (score >= 400 || sessions >= 5) return { label: 'SILVER', color: '#C0C8D8', bg: 'rgba(192,200,216,0.12)', border: 'rgba(192,200,216,0.35)', glow: '192,200,216' }
  return { label: 'BRONZE', color: '#CD8F4A', bg: 'rgba(205,143,74,0.12)', border: 'rgba(205,143,74,0.35)', glow: '205,143,74' }
}

function getMemberBadge(createdAt: string | null) {
  if (!createdAt) return null
  const months = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
  if (months >= 24) return { emoji: '👑', label: 'OG Bestie', color: '#D4AF37', desc: '2+ years' }
  if (months >= 12) return { emoji: '💎', label: 'Legend', color: '#34D399', desc: '1+ year' }
  if (months >= 6) return { emoji: '🔥', label: 'Veteran', color: '#FF6B35', desc: '6+ months' }
  if (months >= 3) return { emoji: '⭐', label: 'Regular', color: '#A99ECC', desc: '3+ months' }
  if (months >= 1) return { emoji: '🌱', label: 'New Bestie', color: '#A99ECC', desc: '1+ month' }
  return { emoji: '✨', label: 'Just joined', color: '#A99ECC', desc: 'New here' }
}

function StarRating({ rating, count }: { rating: number; count?: number }) {
  const r = parseFloat(String(rating)) || 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} style={{ fontSize: '14px', lineHeight: 1, color: i <= Math.floor(r + 0.5) ? '#D4AF37' : 'rgba(212,175,55,0.25)' }}>★</span>
        ))}
      </div>
      <span style={{ fontSize: '10px', color: '#A99ECC' }}>
        {r.toFixed(1)}{count != null && count > 0 ? ` · ${count} ${count === 1 ? 'review' : 'reviews'}` : ''}
      </span>
    </div>
  )
}

export async function generateMetadata({ params }) {
  const { data: profile } = await supabase
    .from('users').select('full_name, username, bio, bestie_score, avatar_url').eq('username', params.username).single()
  if (!profile) return { title: 'Bestie' }
  return {
    title: `${profile.full_name} — BS ${profile.bestie_score || 0} · Bestie`,
    description: `${profile.bio || 'Check my Social Passport on Bestie.'} · Bestie Score: ${profile.bestie_score || 0}`,
    // NOTE: we intentionally do NOT set `images` here. The file-based
    // `opengraph-image.tsx` in this folder generates a branded 1200×630 card
    // that Next.js wires into both OpenGraph and Twitter automatically.
    openGraph: {
      title: `${profile.full_name} — Bestie Score ${profile.bestie_score || 0}`,
      description: profile.bio || 'Check my Social Passport on Bestie.',
      url: `https://bestiehere.com/${profile.username}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.full_name} — BS ${profile.bestie_score || 0}`,
      description: profile.bio || 'Check my Social Passport on Bestie.',
    },
  }
}

export default async function ProfilePage({ params }) {
  const { data: profile } = await supabase
    .from('users').select('*, activity_packages(*)')
    .eq('username', params.username).single()

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><Search size={48} color="#A99ECC" strokeWidth={1.8} /></div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#F0EAFF', marginBottom: '8px' }}>Profile not found</h1>
          <p style={{ fontSize: '14px', color: '#A99ECC', marginBottom: '24px' }}>@{params.username} doesn't exist yet</p>
          <Link href="/browse" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>Browse Besties</Link>
        </div>
      </div>
    )
  }

  const { data: crew } = profile.crew_id
    ? await supabase.from('crews').select('id, name, slug, is_public').eq('id', profile.crew_id).single()
    : { data: null }

  const [
    { data: sparks },
    { count: confirmedSessions },
    { count: usersAbove },
    { count: totalUsers },
    { data: ratedBookings },
    { count: mutualKnocks },
  ] = await Promise.all([
    supabase.from('sparks').select('spark_type').eq('receiver_id', profile.id),
    supabase.from('bookings')
      .select('id', { count: 'exact', head: true })
      .or(`seeker_id.eq.${profile.id},provider_id.eq.${profile.id}`)
      .eq('confirmed_by_seeker', true)
      .eq('confirmed_by_provider', true),
    supabase.from('users')
      .select('id', { count: 'exact', head: true })
      .gt('bestie_score', profile.bestie_score || 0),
    supabase.from('users')
      .select('id', { count: 'exact', head: true }),
    supabase.from('bookings')
      .select('rating_seeker, rating_provider')
      .or(`and(provider_id.eq.${profile.id},rating_seeker.not.is.null),and(seeker_id.eq.${profile.id},rating_provider.not.is.null)`),
    supabase.from('knocks')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', profile.id)
      .eq('is_mutual', true),
  ])

  const sparkCounts: Record<string, number> = {}
  sparks?.forEach(s => { sparkCounts[s.spark_type] = (sparkCounts[s.spark_type] || 0) + 1 })
  const totalSparks = sparks?.length || 0
  const topSparks = SPARK_TYPES
    .map(s => ({ ...s, count: sparkCounts[s.id] || 0 }))
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count)

  const score = profile.bestie_score || 0
  const scoreColor = score >= 800 ? '#34D399' : score >= 600 ? '#D4AF37' : '#A99ECC'
  const scoreLabel = score >= 800 ? 'Excellent' : score >= 600 ? 'Good' : score >= 400 ? 'Fair' : 'New'
  const initials = profile.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const memberBadge = getMemberBadge(profile.created_at)
  const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null
  const sessionCount = confirmedSessions || 0
  const rankPct = totalUsers ? (usersAbove || 0) / totalUsers : 1
  const ratingValues = ratedBookings?.map(b => b.rating_seeker ?? b.rating_provider).filter(Boolean) || []
  const avgRating = ratingValues.length > 0 ? ratingValues.reduce((a: number, b: number) => a + b, 0) / ratingValues.length : 0
  const ageMs = profile.created_at ? Date.now() - new Date(profile.created_at).getTime() : Infinity
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  const streakWeeks = profile.streak_weeks || 0
  const tier = getTier(score, sessionCount)
  const firstName = profile.full_name?.split(' ')[0] || 'them'

  const BADGES = [
    rankPct <= 0.01 && { id: 'top1', emoji: '🏆', label: 'Top 1%', desc: 'Bestie Score in the top 1%', color: '#34D399' },
    rankPct <= 0.10 && rankPct > 0.01 && { id: 'top10', emoji: '🥇', label: 'Top 10%', desc: 'Bestie Score in the top 10%', color: '#D4AF37' },
    profile.is_verified && { id: 'verified', emoji: '✅', label: 'Verified', desc: 'Verified by 3+ real meetups', color: '#34D399' },
    sessionCount >= 25 && { id: 'session_king', emoji: '👑', label: 'Session King', desc: '25+ confirmed sessions', color: '#D4AF37' },
    sessionCount >= 10 && sessionCount < 25 && { id: 'pro', emoji: '💎', label: 'Pro', desc: '10+ confirmed sessions', color: '#9B7FFF' },
    sessionCount >= 5 && sessionCount < 10 && { id: 'on_fire', emoji: '🔥', label: 'On Fire', desc: '5+ confirmed sessions', color: '#FF6B35' },
    sessionCount >= 1 && sessionCount < 5 && { id: 'first_session', emoji: '🎯', label: 'First Steps', desc: 'Completed first session', color: '#A99ECC' },
    totalSparks >= 50 && { id: 'spark_icon', emoji: '💫', label: 'Spark Icon', desc: '50+ sparks received', color: '#D4AF37' },
    totalSparks >= 10 && totalSparks < 50 && { id: 'spark_magnet', emoji: '✨', label: 'Spark Magnet', desc: '10+ sparks received', color: '#A99ECC' },
    ratingValues.length >= 3 && avgRating >= 4.8 && { id: 'five_star', emoji: '⭐', label: '5-Star', desc: 'Near-perfect average rating', color: '#D4AF37' },
    ageDays < 30 && score > 200 && { id: 'rising_star', emoji: '🌱', label: 'Rising Star', desc: 'New member with high score', color: '#34D399' },
    streakWeeks >= 12 && { id: 'streak_12', emoji: '🌊', label: `${streakWeeks}w Streak`, desc: '12+ week streak', color: '#34D399' },
    streakWeeks >= 8 && streakWeeks < 12 && { id: 'streak_8', emoji: '⚡', label: `${streakWeeks}w Streak`, desc: '8+ week streak', color: '#D4AF37' },
    streakWeeks >= 4 && streakWeeks < 8 && { id: 'streak_4', emoji: '💥', label: `${streakWeeks}w Streak`, desc: '4+ week streak', color: '#FF6B35' },
    streakWeeks >= 2 && streakWeeks < 4 && { id: 'streak_2', emoji: '🔥', label: `${streakWeeks}w Streak`, desc: '2+ week streak', color: '#A99ECC' },
  ].filter(Boolean)

  return (
    <div style={{ minHeight: '100vh', background: '#09090F', fontFamily: 'Plus Jakarta Sans, sans-serif', paddingBottom: '88px' }}>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      {/* COVER HERO — overflow:hidden только для градиентов, аватар снаружи */}
      <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
        {/* Cover gradient */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 30% 50%, rgba(${tier.glow},0.35) 0%, rgba(8,8,16,0.0) 70%)` }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(8,8,16,0) 0%, rgba(8,8,16,0.85) 100%)' }} />
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', top: '-30px', right: '15%', width: '220px', height: '220px', borderRadius: '50%', background: `radial-gradient(circle, rgba(${tier.glow},0.12) 0%, transparent 70%)` }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '40%', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,143,255,0.08) 0%, transparent 70%)' }} />

        {/* Tier badge — top right */}
        <div style={{ position: 'absolute', top: '16px', right: '20px', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '999px', background: tier.bg, border: `1px solid ${tier.border}`, backdropFilter: 'blur(8px)' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.5px', color: tier.color }}>{tier.label} TIER</span>
        </div>

        {/* Share button — top left */}
        <div style={{ position: 'absolute', top: '16px', left: '20px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <SharePassportButton username={profile.username} />
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 20px' }}>

        {/* AVATAR — вынесен из cover чтобы не обрезался overflow:hidden */}
        <div style={{ marginTop: '-44px', marginBottom: '0', position: 'relative', zIndex: 10 }}>
          <div style={{ width: '88px', height: '88px', borderRadius: '50%', overflow: 'hidden', border: `3px solid ${tier.color}`, background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px rgba(${tier.glow},0.4)`, ...getAvatarFrame(sessionCount) }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '30px', fontWeight: 700, color: tier.color, fontFamily: 'DM Serif Display, serif' }}>{initials}</span>
            }
          </div>
        </div>

        {/* IDENTITY */}
        <div style={{ paddingTop: '12px', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', fontWeight: 700, color: '#F0EAFF', margin: 0 }}>{profile.full_name}</h1>
                {profile.is_verified && (
                  <span title="Verified" style={{ fontSize: '16px' }}>✅</span>
                )}
                {memberBadge && (
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.1)', color: memberBadge.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {memberBadge.emoji} {memberBadge.label}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                {profile.city && (
                  <>
                    <MapPin size={13} strokeWidth={2} />
                    <span>{profile.city}{profile.country ? `, ${profile.country}` : ''} · </span>
                  </>
                )}
                <span>@{profile.username}{memberSince && ` · joined ${memberSince}`}</span>
              </p>
              {crew && (
                <Link href={`/crews/${crew.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '8px', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: '#D4AF37', textDecoration: 'none' }}>
                  {!crew.is_public && <Lock size={11} strokeWidth={2.2} />}{crew.name}
                </Link>
              )}
              {profile.bio && <p style={{ fontSize: '14px', color: '#A99ECC', lineHeight: 1.65, maxWidth: '520px' }}>{profile.bio}</p>}

              {/* Knock connections count */}
              {(mutualKnocks || 0) > 0 && (
                <p style={{ fontSize: '12px', color: '#A99ECC', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '14px' }}>👊</span>
                  <span><strong style={{ color: '#F0EAFF' }}>{mutualKnocks}</strong> {mutualKnocks === 1 ? 'mutual connection' : 'mutual connections'}</span>
                </p>
              )}
            </div>
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
              <KnockButton profileId={profile.id} profileUsername={profile.username} />
              <BlockReportButton profileUserId={profile.id} />
            </div>
          </div>

          {/* Eterotype pills */}
          {profile.eterotype && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
              <span style={{ padding: '5px 12px', borderRadius: '999px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', fontSize: '12px', color: '#D4AF37', fontWeight: 600 }}>🧭 {profile.eterotype_name || profile.eterotype}</span>
              {profile.eterotype_family && <span style={{ padding: '5px 12px', borderRadius: '999px', background: 'rgba(155,143,255,0.1)', border: '1px solid rgba(155,143,255,0.25)', fontSize: '12px', color: '#9B7FFF', fontWeight: 500, textTransform: 'capitalize' }}>{profile.eterotype_family}</span>}
              {profile.eterotype_collective && <span style={{ padding: '5px 12px', borderRadius: '999px', background: 'rgba(57,255,20,0.08)', border: '1px solid rgba(57,255,20,0.2)', fontSize: '12px', color: '#34D399', fontWeight: 500, textTransform: 'capitalize' }}>{profile.eterotype_collective}</span>}
            </div>
          )}
        </div>

        {/* COMPATIBILITY — closest signal of "is this person for me", show first */}
        <CompatibilityScore profile={{
          id: profile.id,
          city: profile.city,
          eterotype: profile.eterotype,
          activity_packages: profile.activity_packages,
        }} />

        {/* SESSIONS YOU CAN BOOK — primary meeting action above the fold */}
        {profile.activity_packages?.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', color: '#F0EAFF', margin: 0 }}>Sessions you can book</h2>
              <EditActivitiesLink profileUserId={profile.id} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {profile.activity_packages.map((pkg) => (
                <div key={pkg.id} style={{ background: 'linear-gradient(135deg, #111120 0%, #131324 100%)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: '18px', padding: '18px 20px', transition: 'border-color 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Emoji circle */}
                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ActivityIcon type={pkg.activity_type} size={26} color="#D4AF37" strokeWidth={1.6} />
                    </div>
                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#F0EAFF', marginBottom: '3px', display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{pkg.title}</span>
                        {pkg.crew_id && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 7px', borderRadius: '999px', background: 'rgba(155,127,255,0.12)', border: '1px solid rgba(155,127,255,0.35)', color: '#9B7FFF', fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px' }}>
                            <Lock size={9} strokeWidth={2.2} /> CREW
                          </span>
                        )}
                      </div>
                      {pkg.description && <p style={{ fontSize: '12px', color: '#A99ECC', lineHeight: 1.5, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pkg.description}</p>}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {ACTIVITY_DURATION[pkg.activity_type] && (
                          <span style={{ fontSize: '11px', color: '#A99ECC', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={11} strokeWidth={2} /> {ACTIVITY_DURATION[pkg.activity_type]}</span>
                        )}
                        {pkg.scheduled_at && (
                          <span style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={11} strokeWidth={2} /> {new Date(pkg.scheduled_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Price */}
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      {pkg.is_free
                        ? <div style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(57,255,20,0.1)', border: '1px solid rgba(57,255,20,0.25)' }}><span style={{ fontSize: '13px', fontWeight: 700, color: '#34D399' }}>Free</span></div>
                        : pkg.price_per_session > 0 && (
                          <div>
                            <p style={{ fontSize: '20px', fontWeight: 700, color: '#F0EAFF', fontFamily: 'DM Serif Display, serif', margin: 0 }}>${pkg.price_per_session}</p>
                            <p style={{ fontSize: '10px', color: '#A99ECC', textAlign: 'right' }}>/session</p>
                          </div>
                        )
                      }
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Link href={`/book/${profile.username}`} style={{ display: 'block', padding: '12px', borderRadius: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 700, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#09090F', textDecoration: 'none' }}>
                      Book →
                    </Link>
                    <InviteToSessionButton username={profile.username} activityType={pkg.activity_type} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!profile.activity_packages || profile.activity_packages.length === 0) && (
          <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(155,127,255,0.05) 100%)', border: '1px solid rgba(212,175,55,0.20)', borderRadius: '18px', padding: '22px', marginBottom: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: '#F0EAFF', marginBottom: '6px', fontFamily: 'DM Serif Display, serif' }}>Want to meet {firstName}?</p>
            <p style={{ fontSize: '13px', color: '#A99ECC', marginBottom: '14px', lineHeight: 1.55 }}>
              No activities listed yet — but you can still <strong style={{ color: '#D4AF37' }}>knock</strong> to signal interest, or <strong style={{ color: '#D4AF37' }}>send a message</strong> to suggest a coffee or meetup.
            </p>
            <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <KnockButton profileId={profile.id} profileUsername={profile.username} />
              <Link href={`/messages?to=${profile.username}`} style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#F0EAFF', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Send a message →
              </Link>
            </div>
            <div style={{ marginTop: '12px' }}>
              <EditActivitiesLink profileUserId={profile.id} />
            </div>
          </div>
        )}

        {/* PASSPORT SCORE CARD — credibility, below the meeting CTAs */}
        <div style={{ marginBottom: '20px' }}>
          <PassportScoreCard
            score={score}
            rating={avgRating || null}
            sessions={sessionCount}
            sparks={totalSparks}
            fullName={profile.full_name}
            username={profile.username}
            city={profile.city}
            avatarUrl={profile.avatar_url}
          />
        </div>

        {/* MUTUAL FRIENDS — social proof */}
        <MutualFriends profileId={profile.id} />

        {/* TOP SPARKS */}
        {topSparks.length > 0 && (
          <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '18px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '14px' }}>TOP SPARKS FROM THE COMMUNITY</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {topSparks.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <span style={{ fontSize: '14px' }}>{s.emoji}</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#F0EAFF' }}>{s.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#D4AF37' }}>×{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GIVE SPARKS */}
        <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '18px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '17px', color: '#F0EAFF', marginBottom: '4px' }}>Give a Spark ✨</h3>
          <p style={{ fontSize: '12px', color: '#A99ECC', marginBottom: '14px' }}>Rare tokens of respect. Max 3 per person, 1 per type.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '8px', marginBottom: '12px' }}>
            {SPARK_TYPES.slice(0, 10).map(s => (
              <Link key={s.id} href={`/sparks/give?to=${profile.username}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 4px', borderRadius: '12px', background: '#111120', border: '1px solid rgba(255,255,255,0.10)', textDecoration: 'none' }}>
                <span style={{ fontSize: '20px' }}>{s.emoji}</span>
                <span style={{ fontSize: '9px', fontWeight: 500, color: '#A99ECC', textAlign: 'center', lineHeight: 1.3 }}>{s.label}</span>
              </Link>
            ))}
          </div>
          <Link href={`/sparks/give?to=${profile.username}`} style={{ display: 'block', textAlign: 'center', fontSize: '13px', color: '#D4AF37', textDecoration: 'none' }}>
            See all 22 Spark types →
          </Link>
        </div>

        {/* BADGES */}
        {BADGES.length > 0 && (
          <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '18px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '14px' }}>ACHIEVEMENTS</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {BADGES.map((b: any) => (
                <div key={b.id} title={b.desc} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '999px', background: `rgba(${b.color === '#34D399' ? '57,255,20' : b.color === '#D4AF37' ? '212,175,55' : b.color === '#FF6B35' ? '255,107,53' : b.color === '#9B7FFF' ? '155,143,255' : '155,147,192'},0.1)`, border: `1px solid ${b.color}35` }}>
                  <span style={{ fontSize: '14px' }}>{b.emoji}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: b.color }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LANGUAGES */}
        {profile.languages?.length > 0 && (
          <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '18px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '12px' }}>LANGUAGES</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {profile.languages.map(lang => (
                <span key={lang} style={{ padding: '5px 12px', borderRadius: '999px', background: 'rgba(155,143,192,0.1)', border: '1px solid rgba(155,143,192,0.2)', fontSize: '12px', color: '#A99ECC', fontWeight: 500 }}>{lang}</span>
              ))}
            </div>
          </div>
        )}

        {/* AVAILABILITY */}
        {profile.availability && Object.values(profile.availability).some((s: any) => s.on) && (
          <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '18px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '12px' }}>AVAILABILITY</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['mon','tue','wed','thu','fri','sat','sun'].map(d => {
                const slot = (profile.availability as any)[d]
                if (!slot?.on) return null
                const fmt = (t: string) => {
                  const [h, m] = t.split(':')
                  const hr = parseInt(h)
                  return `${hr > 12 ? hr - 12 : hr || 12}${m !== '00' ? `:${m}` : ''}${hr >= 12 ? 'pm' : 'am'}`
                }
                return (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#D4AF37', textTransform: 'capitalize' }}>{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                    <span style={{ fontSize: '11px', color: '#A99ECC' }}>{fmt(slot.from)}–{fmt(slot.to)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* SOCIAL PASSPORT FOOTER CARD */}
        <div style={{ background: 'linear-gradient(135deg, #111120 0%, #141428 100%)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '18px', padding: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '2px', color: '#A99ECC', marginBottom: '4px' }}>BESTIE SOCIAL PASSPORT</p>
            <p style={{ fontSize: '13px', color: '#F0EAFF' }}>bestiehere.com/{profile.username}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', fontWeight: 700, color: '#D4AF37' }}>BESTIE</p>
            <p style={{ fontSize: '10px', color: '#A99ECC' }}>Social Passport · 2026</p>
          </div>
        </div>

        <SocialPassportCTA />
      </div>

      {/* STICKY BOOK CTA (client component — hides on own profile) */}
      <StickyBookCTA profileId={profile.id} username={profile.username} firstName={firstName} hasActivities={(profile.activity_packages?.length || 0) > 0} />
    </div>
  )
}
