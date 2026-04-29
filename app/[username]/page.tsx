// @ts-nocheck
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function ProfilePage({ params }) {
  const { data: profile } = await supabase
    .from('users')
    .select('*, activity_packages(*)')
    .eq('username', params.username)
    .single()

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

  const score = profile.bestie_score || 0
  const scoreColor = score >= 800 ? '#39FF14' : score >= 600 ? '#D4AF37' : '#9B93C0'
  const initials = profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  const ACTIVITY_EMOJI = {
    meet_irl: '🤝', dance_crew: '💃', trail_crew: '🥾', travel_buddy: '✈️',
    game_night: '🎮', watch_together: '🎬', vibe_call: '📱', deep_chat: '🫂',
    real_talk: '💬', festival_crew: '🎪', epic_journey: '🌍', fishing_crew: '🎣',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080810', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'rgba(8,8,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: 'DM Serif Display, serif', fontSize: '20px', fontWeight: 700, color: '#D4AF37', textDecoration: 'none' }}>BESTIE</Link>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/browse" style={{ fontSize: '14px', color: '#9B93C0', textDecoration: 'none' }}>Browse</Link>
          <Link href="/signup" style={{ fontSize: '14px', fontWeight: 600, padding: '8px 20px', borderRadius: '12px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>Join Free</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Profile header */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ width: '120px', height: '120px', borderRadius: '24px', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(212,175,55,0.3)', background: '#1a1a35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '40px', fontWeight: 700, color: '#D4AF37', fontFamily: 'DM Serif Display, serif' }}>{initials}</span>
            }
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', fontWeight: 700, color: '#E8E0FF' }}>{profile.full_name}</h1>
              {profile.is_verified && (
                <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', fontWeight: 600 }}>✓ Verified</span>
              )}
            </div>

            <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '12px' }}>
              {profile.city && `📍 ${profile.city}${profile.country ? `, ${profile.country}` : ''} · `}@{profile.username}
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {score > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '10px', background: `rgba(${scoreColor === '#39FF14' ? '57,255,20' : scoreColor === '#D4AF37' ? '212,175,55' : '155,147,192'},0.1)`, border: `1px solid ${scoreColor}30` }}>
                  <span style={{ fontSize: '11px', color: '#9B93C0' }}>BS</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: scoreColor }}>{score}</span>
                </div>
              )}
              {profile.avg_rating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: '#9B93C0' }}>
                  ⭐ {Number(profile.avg_rating).toFixed(1)} · {profile.total_sessions} sessions
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '15px', color: '#E8E0FF', lineHeight: 1.7 }}>{profile.bio}</p>
          </div>
        )}

        {/* Activities */}
        {profile.activity_packages?.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
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
                <Link href={`/messages?to=${profile.username}`} style={{ display: 'block', marginTop: '16px', padding: '12px', borderRadius: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
                  Message {profile.full_name?.split(' ')[0]} →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* No activities */}
        {(!profile.activity_packages || profile.activity_packages.length === 0) && (
          <div style={{ background: '#0F0F1E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', marginBottom: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#9B93C0' }}>No activities listed yet</p>
          </div>
        )}

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(57,255,20,0.04) 100%)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#9B93C0', marginBottom: '12px' }}>Want your own Bestie Score? It's free.</p>
          <Link href="/signup" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', color: '#080810', textDecoration: 'none' }}>
            Build your Social Passport →
          </Link>
        </div>
      </div>
    </div>
  )
}
