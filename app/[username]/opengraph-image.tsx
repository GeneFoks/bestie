import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const alt = 'Bestie profile'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Branded 1200×630 share card for a public profile. This is the link people
// share most (referral / match / "check my profile"), so it gets a rich card
// instead of a bare avatar thumbnail.
export default async function OGImage({ params }: { params: { username: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, username, avatar_url, bestie_score, bio, city, country, total_sessions, activities')
    .eq('username', params.username)
    .single()

  const score = profile?.bestie_score || 0
  const scoreColor = score >= 800 ? '#34D399' : score >= 600 ? '#D4AF37' : '#A99ECC'
  const sessions = profile?.total_sessions || 0
  const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'
  const tier = score >= 800 ? 'Platinum' : score >= 600 ? 'Gold' : 'Member'
  const topActivities: string[] = Array.isArray(profile?.activities) ? profile.activities.slice(0, 3) : []

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          background: '#09090F',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Background gradient orbs */}
        <div style={{ position: 'absolute', top: '-120px', left: '50%', width: '700px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 65%)', transform: 'translateX(-50%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-100px', right: '-80px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,147,192,0.08) 0%, transparent 70%)', display: 'flex' }} />

        {/* Left side — user photo */}
        <div style={{ width: '420px', height: '630px', flexShrink: 0, position: 'relative', display: 'flex' }}>
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" style={{ width: '420px', height: '630px', objectFit: 'cover', objectPosition: 'center top' }} />
          ) : (
            <div style={{ width: '420px', height: '630px', background: 'linear-gradient(135deg, #1A1A2E 0%, #111120 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '120px', fontWeight: 700, color: '#D4AF37', display: 'flex' }}>{initials}</div>
            </div>
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, #09090F 100%)', display: 'flex' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,8,16,0.5) 0%, transparent 40%)', display: 'flex' }} />
        </div>

        {/* Right side — info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px 48px 32px' }}>

          {/* BESTIE logo */}
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#D4AF37', letterSpacing: '3px', marginBottom: '28px', display: 'flex' }}>
            BESTIE
          </div>

          <div style={{ fontSize: '16px', color: '#A99ECC', marginBottom: '12px', display: 'flex', letterSpacing: '0.5px' }}>
            LET'S CONNECT ON BESTIE
          </div>

          {/* Name */}
          <div style={{ fontSize: '52px', fontWeight: 700, color: '#F0EAFF', lineHeight: 1.1, marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
            {profile?.full_name || params.username}
          </div>

          {/* City */}
          {profile?.city && (
            <div style={{ fontSize: '16px', color: '#A99ECC', marginBottom: '22px', display: 'flex' }}>
              📍 {profile.city}{profile.country ? `, ${profile.country}` : ''}
            </div>
          )}

          {/* Activities */}
          {topActivities.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
              {topActivities.map((a) => (
                <div key={a} style={{ padding: '8px 16px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '999px', fontSize: '16px', fontWeight: 600, color: '#D4AF37', display: 'flex' }}>
                  {a.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.4)', border: `1px solid ${scoreColor}30`, borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: '#A99ECC', marginBottom: '4px', letterSpacing: '1px', display: 'flex' }}>BS SCORE</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: scoreColor, display: 'flex' }}>{score}</div>
            </div>
            <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.4)', border: `1px solid ${scoreColor}30`, borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: '#A99ECC', marginBottom: '4px', letterSpacing: '1px', display: 'flex' }}>TIER</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: scoreColor, display: 'flex' }}>{tier}</div>
            </div>
            {sessions > 0 && (
              <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#A99ECC', marginBottom: '4px', letterSpacing: '1px', display: 'flex' }}>SESSIONS</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#F0EAFF', display: 'flex' }}>{sessions}</div>
              </div>
            )}
          </div>

          {/* CTA pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '14px 28px', borderRadius: '14px', background: 'linear-gradient(135deg, #D4AF37 0%, #B8960C 100%)', fontSize: '17px', fontWeight: 700, color: '#09090F', display: 'flex' }}>
              @{profile?.username || params.username} on bestiehere.com →
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
