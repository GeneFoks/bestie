 // @ts-nocheck
export const revalidate = 0
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import ProfileNav from '@/components/ProfileNav'

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

const ACTIVITY_EMOJI = {
  meet_irl: '🤝', dance_crew: '💃', trail_crew: '🥾', travel_buddy: '✈️',
  game_night: '🎮', watch_together: '🎬', vibe_call: '📱', deep_chat: '🫂',
  real_talk: '💬', festival_crew: '🎪', epic_journey: '🌍', fishing_crew: '🎣',
}

function getMemberBadge(createdAt) {
  if (!createdAt) return null
  const months = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
  if (months >= 24) return { emoji: '👑', label: 'OG Bestie', color: '#D4AF37', desc: '2+ years' }
  if (months >= 12) return { emoji: '💎', label: 'Legend', color: '#39FF14', desc: '1+ year' }
  if (months >= 6) return { emoji: '🔥', label: 'Veteran', color: '#FF6B35', desc: '6+ months' }
  if (months >= 3) return { emoji: '⭐', label: 'Regular', color: '#9B93C0', desc: '3+ months' }
  if (months >= 1) return { emoji: '🌱', label: 'New Bestie', color: '#9B93C0', desc: '1+ month' }
  return { emoji: '✨', label: 'Just joined', color: '#9B93C0', desc: 'New here' }
}

export async function generateMetadata({ params }) {
  const { data: profile } = await supabase
    .from('users').select('*').eq('username', params.username).single()
  if (!profile) return { title: 'Bestie' }
  return {
    title: `${profile.full_name} — BS ${profile.bestie_score || 0} · Bestie`,
    description: `${profile.bio || 'Check my Social Passport on Bestie.'} · Bestie Score: ${profile.bestie_score || 0}`,
    openGraph: {
      title: `${profile.full_name} — Bestie Score ${profile.bestie_score || 0}`,
      description: profile.bio || 'Check my Social Passport on Bestie.',
      images: profile.avatar_url ? [{ url: profile.avatar_url, width: 400, height: 400 }] : [],
      url: `https://bestiehere.com/${profile.username}`,
    },
    twitter: {
      card: 'summary',
      title: `${profile.full_name} — BS ${profile.bestie_score || 0}`,
      description: profile.bio || 'Check my Social Passport on Bestie.',
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  }
}

export default async function ProfilePage({ params }) {
  const { data: profile } = await supabase
    .from('users').select('*, activity_packages(*)')
    .eq('username', params.username).single()

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#E8E0FF', marginBottom: '8px' }}>Profile not found</h1>
          <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '24px' }}>@{params.username} doesn't exist yet</p>
          <Link href="/browse" style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Browse Besties</Link>
        </div>
      </div>
    )
  }

  const { data: sparks } = await supabase.from('sparks').select('spark_type').eq('receiver_id', profile.id)
  const sparkCounts = {}
  sparks?.forEach(s => { sparkCounts[s.spark_type] = (sparkCounts[s.spark_type] || 0) + 1 })
  const totalSparks = sparks?.length || 0
  const topSparks = SPARK_TYPES
    .map(s => ({ ...s, count: sparkCounts[s.id] || 0 }))
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count)

  const score = profile.bestie_score || 0
  const scoreColor = score >= 800 ? '#39FF14' : score >= 600 ? '#D4AF37' : '#9B93C0'
  const scoreLabel = score >= 800 ? 'Excellent' : score >= 600 ? 'Good' : score >= 400 ? 'Fair' : 'New'
  const initials = profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const memberBadge = getMemberBadge(profile.created_at)
  const memberSince = profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <ProfileNav />
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

        {/* SOCIAL PASSPORT CARD */}
        <div style={{ background: 'linear-gradient(135deg, #0F0F1E 0%, #141428 100%)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '28px', padding: '32px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '14px', fontWeight: 700, color: '#D4AF37' }}>BESTIE</span>
              <span style={{ fontSize: '11px', color: '#9B93C0', letterSpacing: '1px' }}>SOCIAL PASSPORT</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {profile.is_verified && (
                <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '999px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', fontWeight: 600 }}>✓ Verified</span>
              )}
              {memberBadge && (
                <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '999px', background: `rgba(${memberBadge.color === '#D4AF37' ? '212,175,55' : memberBadge.color === '#39FF14' ? '57,255,20' : '155,147,192'},0.12)`, border: `1px solid ${memberBadge.color}30`, color: memberBadge.color, fontWeight: 600 }}>
                  {memberBadge.emoji} {memberBadge.label}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div style={{ width: '88px', height: '88px', borderRadius: '20px', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(212,175,55,0.3)', background: '#1a1a35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '32px', fontWeight: 700, color: '#D4AF37', fontFamily: 'DM Serif Display, serif' }}>{initials}</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '26px', fontWeight: 700, color: '#E8E0FF', marginBottom: '4px' }}>{profile.full_name}</h1>
              <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '6px' }}>
                {profile.city && `📍 ${profile.city}${profile.country ? `, ${profile.country}` : ''} · `}@{profile.username}
              </p>
              {memberSince && (
                <p style={{ fontSize: '12px', color: '#9B93C0', marginBottom: '8px' }}>
                  🗓 Member since {memberSince} · {memberBadge?.desc}
                </p>
              )}
              {profile.bio && <p style={{ fontSize: '13px', color: '#9B93C0', lineHeight: 1.6 }}>{profile.bio}</p>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ gridColumn: 'span 2', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '16px', border: `1px solid ${scoreColor}20` }}>
              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0', marginBottom: '8px' }}>BESTIE SCORE</p>
              <div style={{ fontSize: '48px', fontWeight: 700, color: scoreColor, fontFamily: 'DM Serif Display, serif', lineHeight: 1, marginBottom: '8px' }}>{score}</div>
              <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: '6px' }}>
                <div style={{ height: '100%', width: `${score / 10}%`, borderRadius: '999px', background: `linear-gradient(90deg, ${scoreColor} 0%, #D4AF37 100%)` }} />
              </div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: scoreColor }}>{scoreLabel}</p>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', color: '#9B93C0', marginBottom: '8px' }}>SESSIONS</p>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#E8E0FF', fontFamily: 'DM Serif Display, serif' }}>{profile.total_sessions || 0}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', color: '#9B93C0', marginBottom: '8px' }}>SPARKS</p>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#D4AF37', fontFamily: 'DM Serif Display, serif' }}>✨ {totalSparks}</div>
            </div>
          </div>

          {/* Bestie Type */}
          {(profile.energy_type || profile.mind_type || profile.vibe_type) && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0', marginBottom: '10px' }}>BESTIE TYPE</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {profile.energy_type && (
                  <div style={{ padding: '6px 14px', borderRadius: '999px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', fontSize: '13px', color: '#D4AF37', fontWeight: 500 }}>
                    ⚡ {profile.energy_type}
                  </div>
                )}
                {profile.mind_type && (
                  <div style={{ padding: '6px 14px', borderRadius: '999px', background: 'rgba(155,143,255,0.1)', border: '1px solid rgba(155,143,255,0.25)', fontSize: '13px', color: '#9B8FFF', fontWeight: 500 }}>
                    💡 {profile.mind_type}
                  </div>
                )}
                {profile.vibe_type && (
                  <div style={{ padding: '6px 14px', borderRadius: '999px', background: 'rgba(57,255,20,0.08)', border: '1px solid rgba(57,255,20,0.2)', fontSize: '13px', color: '#39FF14', fontWeight: 500 }}>
                    🌊 {profile.vibe_type}
                  </div>
                )}
              </div>
            </div>
          )}

         {/* Languages */}
{profile.languages?.length > 0 && (
  <div style={{ marginBottom: '16px' }}>
    <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0', marginBottom: '10px' }}>LANGUAGES</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {profile.languages.map(lang => (
        <div key={lang} style={{ padding: '5px 12px', borderRadius: '999px', background: 'rgba(155,143,192,0.1)', border: '1px solid rgba(155,143,192,0.2)', fontSize: '12px', color: '#9B93C0', fontWeight: 500 }}>
          {lang}
        </div>
      ))}
    </div>
  </div>
)}
         
          {/* Top Sparks */}
          {topSparks.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#9B93C0', marginBottom: '10px' }}>TOP SPARKS</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {topSparks.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}>
                    <span style={{ fontSize: '14px' }}>{s.emoji}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#E8E0FF' }}>{s.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#D4AF37' }}>×{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile.avg_rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
              <span>⭐</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#E8E0FF' }}>{Number(profile.avg_rating).toFixed(1)}</span>
              <span style={{ fontSize: '13px', color: '#9B93C0' }}>average from {profile.total_sessions} sessions</span>
            </div>
          )}

          <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '11px', color: '#9B93C0' }}>bestiehere.com/{profile.username}</p>
            <p style={{ fontSize: '11px', color: '#9B93C0' }}>Social Passport · 2026</p>
          </div>
        </div>

        {/* GIVE SPARKS */}
        <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '18px', color: '#E8E0FF', marginBottom: '4px' }}>Give a Spark ✨</h3>
          <p style={{ fontSize: '13px', color: '#9B93C0', marginBottom: '16px' }}>Rare tokens of respect. Max 3 per person, 1 per type.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {SPARK_TYPES.map(s => (
              <Link key={s.id} href={`/sparks/give?to=${profile.username}&type=${s.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 6px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}>
                <span style={{ fontSize: '20px' }}>{s.emoji}</span>
                <span style={{ fontSize: '10px', fontWeight: 500, color: '#9B93C0', textAlign: 'center', lineHeight: 1.3 }}>{s.label}</span>
              </Link>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: '#9B93C0', textAlign: 'center' }}>
            <Link href="/login" style={{ color: '#D4AF37', textDecoration: 'none' }}>Log in</Link> to give Sparks
          </p>
        </div>

        {/* ACTIVITIES */}
        {profile.activity_packages?.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '1px', color: '#9B93C0', marginBottom: '12px' }}>ACTIVITIES</h3>
            {profile.activity_packages.map((pkg) => (
              <div key={pkg.id} style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '18px' }}>{ACTIVITY_EMOJI[pkg.activity_type] || '✨'}</span>
                      <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#E8E0FF' }}>{pkg.title}</h4>
                    </div>
                    {pkg.description && <p style={{ fontSize: '13px', color: '#9B93C0', lineHeight: 1.6 }}>{pkg.description}</p>}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    {pkg.is_free
                      ? <span style={{ fontSize: '16px', fontWeight: 700, color: '#39FF14' }}>Free</span>
                      : pkg.price_per_session > 0 && (
                        <div>
                          <span style={{ fontSize: '20px', fontWeight: 700, color: '#E8E0FF' }}>${pkg.price_per_session}</span>
                          <div style={{ fontSize: '12px', color: '#9B93C0' }}>/session</div>
                        </div>
                      )
                    }
                  </div>
                </div>
                <Link href={`/book/${profile.username}`} style={{ display: 'block', marginTop: '16px', padding: '12px', borderRadius: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
                  Book a session →
                </Link>
                <Link href={`/messages?to=${profile.username}`} style={{ display: 'block', marginTop: '8px', padding: '12px', borderRadius: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8E0FF', textDecoration: 'none' }}>
                  💬 Message {profile.full_name?.split(' ')[0]}
                </Link>
              </div>
            ))}
          </div>
        )}

        {(!profile.activity_packages || profile.activity_packages.length === 0) && (
          <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#9B93C0' }}>No activities listed yet</p>
          </div>
        )}

        <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(57,255,20,0.04) 100%)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '4px' }}>Want your own Social Passport?</p>
          <p style={{ fontSize: '13px', color: '#9B93C0', marginBottom: '16px' }}>Build your Bestie Score, collect Sparks, get verified.</p>
          <Link href="/signup" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
            Create my Social Passport →
          </Link>
        </div>
      </div>
    </div>
  )
}
